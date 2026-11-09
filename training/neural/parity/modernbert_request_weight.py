#!/usr/bin/env python3
"""Freeze and verify the whole-request weighting experiment; dispatch actual fit.

No corpus regeneration, model loading, training or downloads occur in this module.
Only freeze writes, to a new task-owned directory or an identical existing freeze.
"""
import argparse
from collections import Counter
import importlib.metadata
import hashlib
import math
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
CACHE = Path.home() / ".cache/diagram-vss-modernbert"
T = CACHE / "request-weighting-2026-11-09"
STATIC = HERE / "modernbert_request_weight_protocol.json"
sys.path.insert(0, str(HERE.parent))
from modernbert_request_class_loss import (FORMULA, RequestClassWeights, artifact_bytes, build_manifest,
    canonical, row_weight_artifact, validate_manifest)

VERSION = "modernbert-request-weight-frozen-v1"
DEPENDENCIES = ("torch", "transformers", "tokenizers", "numpy", "onnx", "onnxruntime", "psutil")


def digest(path):
    with open(path, "rb") as stream: return hashlib.file_digest(stream, "sha256").hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text())


def ref_path(ref):
    return Path(ref["path"]) if Path(ref["path"]).is_absolute() else (REPO if ref.get("base") == "repo" else CACHE) / ref["path"]


def check_hashes(identities):
    for path, expected in sorted(identities.items()):
        if not Path(path).is_file() or digest(path) != expected:
            raise ValueError(f"Input/source identity changed or missing: {path}")


def refs(value):
    if isinstance(value, dict):
        if "path" in value and "sha256" in value: yield value
        else:
            for item in value.values(): yield from refs(item)
    elif isinstance(value, list):
        for item in value: yield from refs(item)


def inventory(protocol):
    """Hash all consumed historical files, preserving their original paths and subjects."""
    pinned = {str(ref_path(r)): r["sha256"] for r in refs(protocol["inputs"])}
    for name in ("plan", "plan_review"):
        r = protocol[name]; pinned[str(ref_path(r))] = r["sha256"]
    source_review = safe_path(ref_path(protocol["source_review"]))
    pinned[str(source_review)] = digest(source_review)
    for review in read_json(source_review)["reviews"]:
        path = safe_path(review["path"])
        pinned[str(path)] = review["sha256"]
    check_hashes(pinned)
    forms = read_json(ref_path(protocol["inputs"]["forms_protocol"]))
    # The inherited static protocol pins groups, folds, memberships, overlays and tools.
    for r in refs(forms["protocol"]):
        pinned[str(ref_path(r))] = r["sha256"]
    for rel, sha in forms["source_files"].items():
        pinned[str(REPO / "training/sketch" / rel)] = sha
    check_hashes(pinned)
    roots = [ref_path(r) for r in protocol["inventory_roots"]]
    paths = set(pinned)
    for root in roots:
        if not root.is_dir(): raise ValueError(f"Missing immutable input directory: {root}")
        paths.update(str(p) for p in root.rglob("*") if p.is_file())
    # Freeze every F data file, including files not needed by the request objective.
    paths.update(str(p) for p in ref_path(protocol["data"]).iterdir() if p.is_file())
    return {p: digest(p) for p in sorted(paths)}


def data_inputs(data):
    data = Path(data)
    def rows(name): return [json.loads(line) for line in (data / name).read_text().splitlines() if line.strip()]
    requests, cuts = rows("train.jsonl"), rows("cut_train.jsonl")
    if not requests or not cuts or rows("heldout.jsonl") or rows("cut_heldout.jsonl"):
        raise ValueError("Expected nonempty training and empty heldout files")
    identity = dict(messages=len(cuts), requests=len(requests), files={p.name: digest(p) for p in sorted(data.glob("*.json*"))})
    expected = read_json(data.with_name(data.name + ".manifest.json"))
    for key in ("messages", "requests", "files"):
        if identity[key] != expected[key]: raise ValueError(f"F data manifest changed: {key}")
    if "extra_dirs" in expected: identity["extra_dirs"] = expected["extra_dirs"]
    # Use the real target implementation; never reimplement it in the freeze.
    from finetune_roles import Layout
    return requests, Layout(read_json(data / "reader.json")), identity


def frozen_populations(training, audit, rows, layout):
    """Observation indexes, never IDs, preserve duplicate IDs and D request ordinals."""
    names = [key for key, _ in layout.classes]
    descriptions = {r["ordinal"]: r for r in audit["F_description_rows"]}
    populations = {k: [] for k in ("outline_create", "outline_coloured_create", "outline_set", "desc_r2", "desc_r2_canonical", "desc_old", "count_size", "absent_controls")}
    positives = 0
    for i, selection in enumerate(training["selections"]):
        if selection["arm"] != "F": continue
        ordinal = selection["ordinal"]
        if type(ordinal) is not int or not 0 <= ordinal < len(rows): raise ValueError("Selection ordinal outside F")
        row = rows[ordinal]
        request = training["requests"][selection["request"]]
        if (row["id"] != selection["id"] or row["text"] != request["text"] or request["arm"] != "F"
                or layout.class_targets(row) != selection["targets"] or row["act"] != selection["act"] or row["tags"] != selection["tags"]):
            raise ValueError(f"Frozen F selection differs at observation {i}, ordinal {ordinal}")
        head = names.index(selection["head"])
        target = selection["targets"][head]
        if selection["absent_control"]:
            if target != 0: raise ValueError("Absent control has populated target")
            populations["absent_controls"].append(i)
            continue
        if target == 0 or layout.classes[head][1][target] != selection["gold"]:
            raise ValueError("Positive selection differs from Layout target")
        positives += 1
        family = selection["family"]
        if family == "outline_create":
            populations["outline_create"].append(i)
            if selection["gold"] != "none": populations["outline_coloured_create"].append(i)
        elif family == "outline_set": populations["outline_set"].append(i)
        elif family == "count_size": populations["count_size"].append(i)
        elif family.startswith("description_size:"):
            record = descriptions[ordinal]
            if any(record[k] != selection[k] for k in ("id", "family", "gold", "request")) or record["text"] != row["text"]:
                raise ValueError("Label-membership audit differs from selected observation")
            key = "desc_r2" if record["subset"] == "r2_nonreserved" else "desc_old" if record["subset"] == "B/source" else None
            if key is None: raise ValueError("Unknown description membership")
            populations[key].append(i)
            if key == "desc_r2" and record["literal_canonical_size_word"]: populations["desc_r2_canonical"].append(i)
        else: raise ValueError(f"Unknown positive family: {family}")
    expected = dict(outline_create=89, outline_coloured_create=74, outline_set=97, desc_r2=35, desc_r2_canonical=21, desc_old=24, count_size=14, absent_controls=1440)
    if positives != 259 or {k: len(v) for k, v in populations.items()} != expected:
        raise ValueError("Frozen F diagnostic population counts changed")
    return populations


def registered_arms(protocol):
    return {name: {key: (str(ref_path(value)) if isinstance(value, dict) and "path" in value else value)
                   for key, value in spec.items()} for name, spec in protocol["arms"].items()}


def versions():
    result = {p: importlib.metadata.version(p) for p in DEPENDENCIES}
    result["node"] = subprocess.check_output(["node", "--version"], text=True).strip()
    for key, package in (("transformers_js", "@huggingface/transformers"), ("onnxruntime_node", "onnxruntime-node")):
        result[key] = read_json(REPO / "training/laptop/node_modules" / package / "package.json")["version"]
    return result


def json_bytes(value): return (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n").encode()


def safe_path(path):
    """Refuse symlinks before resolving, including dangling output components."""
    path = Path(os.path.abspath(path))
    for part in (*reversed(path.parents), path):
        if part.is_symlink(): raise ValueError(f"Symlink path refused: {part}")
    return path


def joint_populations(training, populations, rows, layout):
    color = [name for name, _ in layout.classes].index("color")
    groups = dict(fill_outline=[], outline_without_fill=[])
    selections = []
    for observation in populations["outline_create"]:
        s = training["selections"][observation]
        row = rows[s["ordinal"]]
        targets = layout.class_targets(row)
        if s["targets"] != targets or row["id"] != s["id"] or row["act"] != s["act"] or row["tags"] != s["tags"]:
            raise ValueError("Joint selection differs from original corpus")
        if training["requests"][s["request"]]["text"] != row["text"]:
            raise ValueError("Joint request text differs")
        group = "fill_outline" if targets[color] > 0 else "outline_without_fill"
        groups[group].append(observation)
        selections.append(dict(observation=observation, request=s["request"], ordinal=s["ordinal"],
                               id=row["id"], text=row["text"], text_sha256=hashlib.sha256(row["text"].encode()).hexdigest(),
                               targets=targets, act=row["act"], tags=row["tags"]))
    if len(selections) != 89 or len({s["observation"] for s in selections}) != 89:
        raise ValueError("Joint observations changed")
    if {k: len(v) for k, v in groups.items()} != dict(fill_outline=57, outline_without_fill=32):
        raise ValueError("Joint population counts changed")
    for group, count in (("fill_outline", 57), ("outline_without_fill", 28)):
        if len({s["request"] for s in selections if s["observation"] in groups[group]}) != count:
            raise ValueError("Joint distinct request count changed")
    return groups, selections


def objective_artifact(rows, layout, objective):
    weights = RequestClassWeights(tuple(h["positive_coefficient"] for h in objective["heads"]), objective["mean_raw"])
    return artifact_bytes(row_weight_artifact(rows, layout, weights))


def validate_source_review(protocol, sources):
    path = safe_path(ref_path(protocol["source_review"]))
    review = read_json(path)
    if review.get("schema") != "modernbert-request-weight-source-review-v1" or review.get("status") != "approved" or review.get("sources") != sources:
        raise ValueError("Source review must approve this exact source candidate")
    records = review.get("reviews")
    scopes = protocol["source_review_scopes"]
    if not isinstance(records, list) or len(records) != len(scopes) or {r.get("scope") for r in records} != set(scopes):
        raise ValueError("Independent objective-trainer and campaign-fit reviews required")
    for record in records:
        expected = {str(REPO / p): sources[str(REPO / p)] for p in scopes[record["scope"]]}
        if record.get("status") != "approved" or record.get("independent") is not True or record.get("covered_sources") != expected:
            raise ValueError("Independent source review scope/candidate differs")
        report = safe_path(record["path"])
        if not report.is_file() or digest(report) != record.get("sha256"):
            raise ValueError("Independent source review report missing/changed")
    return dict(path=str(path), sha256=digest(path))


def validate_references(protocol, objective, artifact, joint_rows):
    refs = protocol["objective"]["arithmetic_references"]
    values = dict(raw_sum=objective["raw_sum"], mean_raw=objective["mean_raw"])
    for key, source in (("mean_normalized", "mean"), ("min", "minimum"), ("max", "maximum"),
                        ("p50", "median"), ("p90", "p90"), ("p95", "p95"), ("p99", "p99"), ("all_absent_rows", "all_absent")):
        values[key] = objective["distribution"][source]
    for key, value in values.items():
        if not math.isfinite(value) or abs(value - refs[key]) > (1e-8 if key == "raw_sum" else 1e-12):
            raise ValueError(f"Registered objective arithmetic differs: {key}")
    weights = [json.loads(line) for line in artifact.splitlines()]
    color = [h["name"] for h in objective["heads"]].index("color")
    for row in joint_rows:
        if row["targets"][color] > 0 and abs(weights[row["ordinal"]]["normalized"] - refs["selected_fill_outline"]) > 1e-12:
            raise ValueError("Registered joint row weight differs")


def compatibility_record(protocol, sources, audit):
    """Preserve training provenance separately; inference sources have no exemption."""
    historical = {}
    for name in ("F-s0", "W-s0", "B-s0", "C100-s0"):
        arm = protocol["arms"][name]
        complete = ref_path(arm["training"]) / "complete.json"
        export = ref_path(arm["model"]) / "arm_receipt.json"
        config = ref_path(arm["model"]) / "config.json"
        c, e, cfg = read_json(complete), read_json(export), read_json(config)
        if not c["metadata"].get("sources"): raise ValueError("Missing original training sources")
        provenance = cfg["reader"]["training_provenance"]
        if any(c["metadata"][key] != provenance[key] for key in ("base", "revision", "settings", "tokenization", "sources")):
            raise ValueError("Original training/export provenance differs")
        if e.get("source_changes_since_training") != [] or e.get("weights", {}).get("source_changes_since_training") != []:
            raise ValueError("Historical training/export source discrepancy")
        weights = e.get("weights", {})
        if weights.get("source_file") != "checkpoint.pt" or weights.get("sha256") != digest(ref_path(arm["training"]) / "checkpoint.pt") or weights.get("update") != c["state"]["update"] or weights.get("total") != c["state"]["total"] or weights.get("full_schedule") is not True:
            raise ValueError("Historical export is not bound to the original completed checkpoint")
        historical[name] = dict(complete_sha256=digest(complete), export_receipt_sha256=digest(export),
                                config_sha256=digest(config), metadata=c["metadata"])
    return dict(historical_training_resume=False, historical_training=historical,
                current_sources=sources, inference_applicability="exact current inference dependencies required",
                inherited_checks=read_json(ref_path(protocol["inputs"]["forms_protocol"]))["checks"],
                roundtrip={k: str(ref_path(v)) if isinstance(v, dict) else v for k, v in protocol["roundtrip"].items()},
                historical_labels=audit["conflicting_selected_target_groups"])


def freeze(protocol_path, out):
    protocol_path, out = safe_path(protocol_path), safe_path(out)
    protocol = read_json(protocol_path)
    if protocol_path != STATIC or canonical(protocol) != canonical(read_json(STATIC)): raise ValueError("Only the registered fixed protocol is accepted")
    if out != T / "frozen": raise ValueError("Freeze output must be the registered task-owned frozen directory")
    if not safe_path(T / "task-owner.txt").is_file(): raise ValueError("Owned task root required before freeze")
    inputs = inventory(protocol)
    sources = {str(REPO / rel): digest(REPO / rel) for rel in protocol["source_paths"]}
    source_review = validate_source_review(protocol, sources)
    inputs[str(protocol_path)] = digest(protocol_path)
    rows, layout, identity = data_inputs(ref_path(protocol["data"]))
    if (len(rows), identity["messages"], len(layout.classes)) != (58552, 28330, 52): raise ValueError("F population/layout changed")
    objective = build_manifest(rows, layout, identity)
    selections_path = ref_path(protocol["inputs"]["training_selections"])
    training = read_json(selections_path)
    audit = read_json(ref_path(protocol["inputs"]["label_membership"]))
    populations = frozen_populations(training, audit, rows, layout)
    joint, joint_rows = joint_populations(training, populations, rows, layout)
    row_artifact = objective_artifact(rows, layout, objective)
    validate_references(protocol, objective, row_artifact, joint_rows)
    compatibility = compatibility_record(protocol, sources, audit)
    files = {"class-loss-manifest.json": json_bytes(objective), "selections.json": selections_path.read_bytes(),
             "populations.json": json_bytes(populations), "compatibility.json": json_bytes(compatibility),
             "joint-populations.json": json_bytes(joint), "joint-selections.json": json_bytes(joint_rows),
             "row-weights.jsonl": row_artifact}
    def output_ref(name, **kw): return dict(path=str(out / name), sha256=hashlib.sha256(files[name]).hexdigest(), **kw)
    frozen = dict(version=VERSION, campaign=protocol["campaign"], protocol=protocol, task_root=str(T),
                  forms_protocol=dict(path=str(ref_path(protocol["inputs"]["forms_protocol"])), sha256=protocol["inputs"]["forms_protocol"]["sha256"]),
                  arms=registered_arms(protocol), inputs=inputs, sources=sources, versions=versions(), source_review=source_review,
                  loss_manifest=output_ref("class-loss-manifest.json", formula=FORMULA),
                  selections=output_ref("selections.json", populations=output_ref("populations.json")),
                  joint_populations=output_ref("joint-populations.json"), joint_selections=output_ref("joint-selections.json"),
                  row_weights=output_ref("row-weights.jsonl"),
                  compatibility=output_ref("compatibility.json"))
    files["protocol.json"] = json_bytes(frozen)
    check_hashes(inputs); check_hashes(sources)
    if out.exists():
        if set(p.name for p in out.iterdir()) != set(files) or any(safe_path(out / n).read_bytes() != b for n, b in files.items()):
            raise ValueError("Existing freeze differs or contains foreign files")
    else:
        # Directory creation is exclusive: a duplicate launch cannot overwrite a freeze.
        out.mkdir()
        for name, content in files.items():
            with open(out / name, "xb") as stream:
                stream.write(content); stream.flush(); os.fsync(stream.fileno())
    return frozen


def verify_frozen(protocol_path):
    if safe_path(protocol_path) != T / "frozen/protocol.json": raise ValueError("Only the registered frozen protocol path is accepted")
    frozen = read_json(protocol_path)
    if frozen.get("version") != VERSION or frozen.get("task_root") != str(T): raise ValueError("Unknown frozen protocol/task")
    protocol = frozen["protocol"]
    if canonical(protocol) != canonical(read_json(STATIC)) or frozen["arms"] != registered_arms(protocol):
        raise ValueError("Registered protocol/arms changed")
    if frozen["forms_protocol"] != dict(path=str(ref_path(protocol["inputs"]["forms_protocol"])), sha256=protocol["inputs"]["forms_protocol"]["sha256"]):
        raise ValueError("Forms protocol reference differs")
    for ref, name in ((frozen["loss_manifest"], "class-loss-manifest.json"), (frozen["selections"], "selections.json"),
                      (frozen["selections"]["populations"], "populations.json"), (frozen["compatibility"], "compatibility.json"),
                      (frozen["joint_populations"], "joint-populations.json"), (frozen["joint_selections"], "joint-selections.json"),
                      (frozen["row_weights"], "row-weights.jsonl")):
        if ref["path"] != str(T / "frozen" / name): raise ValueError("Frozen output path differs")
        safe_path(ref["path"])
    expected_inputs = inventory(protocol)
    expected_inputs[str(STATIC)] = digest(STATIC)
    if frozen["inputs"] != expected_inputs: raise ValueError("Frozen input inventory differs")
    expected_sources = {str(REPO / p): digest(REPO / p) for p in protocol["source_paths"]}
    if frozen["sources"] != expected_sources or frozen["versions"] != versions(): raise ValueError("Source/dependency identity changed")
    if frozen.get("source_review") != validate_source_review(protocol, expected_sources): raise ValueError("Frozen source review differs")
    check_hashes({r["path"]: r["sha256"] for r in (frozen["loss_manifest"], frozen["selections"], frozen["selections"]["populations"], frozen["compatibility"], frozen["joint_populations"], frozen["joint_selections"], frozen["row_weights"])})
    rows, layout, identity = data_inputs(ref_path(protocol["data"]))
    validate_manifest(frozen["loss_manifest"]["path"], rows, layout, identity)
    if frozen["loss_manifest"]["formula"] != FORMULA: raise ValueError("Objective formula differs")
    training = read_json(frozen["selections"]["path"])
    if digest(frozen["selections"]["path"]) != protocol["inputs"]["training_selections"]["sha256"]: raise ValueError("D selections changed")
    populations = frozen_populations(training, read_json(ref_path(protocol["inputs"]["label_membership"])), rows, layout)
    if read_json(frozen["selections"]["populations"]["path"]) != populations: raise ValueError("Frozen populations changed")
    joint, selected = joint_populations(training, populations, rows, layout)
    if read_json(frozen["joint_populations"]["path"]) != joint or read_json(frozen["joint_selections"]["path"]) != selected:
        raise ValueError("Frozen joint selections changed")
    if Path(frozen["row_weights"]["path"]).read_bytes() != objective_artifact(rows, layout, read_json(frozen["loss_manifest"]["path"])):
        raise ValueError("Ordered row-weight inventory differs")
    validate_references(protocol, read_json(frozen["loss_manifest"]["path"]), Path(frozen["row_weights"]["path"]).read_bytes(), selected)
    if read_json(frozen["compatibility"]["path"]) != compatibility_record(protocol, expected_sources, read_json(ref_path(protocol["inputs"]["label_membership"]))):
        raise ValueError("Historical compatibility provenance differs")
    return frozen


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("freeze", "verify", "fit"):
        p = commands.add_parser(name); p.add_argument("--protocol", required=True, type=Path)
        if name != "verify": p.add_argument("--out", required=True, type=Path)
        if name == "fit":
            p.add_argument("--name", choices=("J-s0",), required=True)
            p.add_argument("--runtime", choices=("float", "ort"), required=True)
    a = parser.parse_args(argv)
    try:
        if a.command == "freeze": freeze(a.protocol, a.out)
        elif a.command == "verify": verify_frozen(a.protocol)
        else:
            from modernbert_request_weight_fit import run_fit
            run_fit(a.protocol, a.name, a.runtime, a.out)
            return 0
        print(json.dumps(dict(command=a.command, checks=52, status="verified")))
        return 0
    except (ValueError, OSError, KeyError, IndexError, TypeError, importlib.metadata.PackageNotFoundError) as exc:
        print(f"request-weight: {exc}", file=sys.stderr); return 1


if __name__ == "__main__": sys.exit(main())
