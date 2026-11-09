#!/usr/bin/env python3
"""Freeze and verify the fixed rare-head experiment; fit dispatches to the model runner.

No corpus regeneration, model loading, training or downloads occur in this module.
Only freeze writes, to a new task-owned directory or an identical existing freeze.
"""
import argparse
from collections import Counter
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
CACHE = Path.home() / ".cache/diagram-vss-modernbert"
T = CACHE / "rare-heads-2026-11-09"
STATIC = HERE / "modernbert_rare_heads_protocol.json"
sys.path.insert(0, str(HERE.parent))
from modernbert_class_loss import FORMULA, build_manifest, canonical, digest, validate_manifest

VERSION = "modernbert-rare-heads-frozen-v1"
DEPENDENCIES = ("torch", "transformers", "tokenizers", "numpy", "onnx", "onnxruntime", "psutil")


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


def freeze(protocol_path, out):
    protocol_path, out = Path(protocol_path).resolve(), Path(out).resolve()
    protocol = read_json(protocol_path)
    if protocol_path != STATIC or canonical(protocol) != canonical(read_json(STATIC)): raise ValueError("Only the registered fixed protocol is accepted")
    if out != T / "frozen": raise ValueError("Freeze output must be the registered task-owned frozen directory")
    inputs = inventory(protocol)
    sources = {str(REPO / rel): digest(REPO / rel) for rel in protocol["source_paths"]}
    inputs[str(protocol_path)] = digest(protocol_path)
    rows, layout, identity = data_inputs(ref_path(protocol["data"]))
    if (len(rows), identity["messages"], len(layout.classes)) != (58552, 28330, 52): raise ValueError("F population/layout changed")
    objective = build_manifest(rows, layout, identity)
    selections_path = ref_path(protocol["inputs"]["training_selections"])
    training = read_json(selections_path)
    audit = read_json(ref_path(protocol["inputs"]["label_membership"]))
    populations = frozen_populations(training, audit, rows, layout)
    compatibility = {"historical_training_resume": False, "default_objective": "ordinary-ce-v1",
                     "historical_training_sources": read_json(ref_path(protocol["arms"]["F-s0"]["training"]) / "complete.json")["metadata"]["sources"],
                     "current_training_sources": {Path(p).name: h for p, h in sources.items() if Path(p).parent == HERE.parent},
                     "inference_applicability": "requires executed applicability receipts; source change alone grants no exemption",
                     "inherited_checks": read_json(ref_path(protocol["inputs"]["forms_protocol"]))["checks"],
                     "roundtrip": {key: str(ref_path(value)) if isinstance(value, dict) else value for key, value in protocol["roundtrip"].items()},
                     "historical_labels": audit["conflicting_selected_target_groups"]}
    files = {"class-loss-manifest.json": json_bytes(objective), "selections.json": selections_path.read_bytes(),
             "populations.json": json_bytes(populations), "compatibility.json": json_bytes(compatibility)}
    import hashlib
    def output_ref(name, **kw): return dict(path=str(out / name), sha256=hashlib.sha256(files[name]).hexdigest(), **kw)
    frozen = dict(version=VERSION, campaign=protocol["campaign"], protocol=protocol, task_root=str(T),
                  forms_protocol=dict(path=str(ref_path(protocol["inputs"]["forms_protocol"])), sha256=protocol["inputs"]["forms_protocol"]["sha256"]),
                  arms=registered_arms(protocol), inputs=inputs, sources=sources, versions=versions(),
                  loss_manifest=output_ref("class-loss-manifest.json", formula=FORMULA),
                  selections=output_ref("selections.json", populations=output_ref("populations.json")),
                  compatibility=output_ref("compatibility.json"))
    files["protocol.json"] = json_bytes(frozen)
    check_hashes(inputs); check_hashes(sources)
    if out.exists():
        if set(p.name for p in out.iterdir()) != set(files) or any((out / n).read_bytes() != b for n, b in files.items()):
            raise ValueError("Existing freeze differs or contains foreign files")
    else:
        # Directory creation is exclusive: a duplicate launch cannot overwrite a freeze.
        out.mkdir()
        for name, content in files.items():
            with open(out / name, "xb") as stream:
                stream.write(content); stream.flush(); os.fsync(stream.fileno())
    return frozen


def verify_frozen(protocol_path):
    if Path(protocol_path).resolve() != T / "frozen/protocol.json": raise ValueError("Only the registered frozen protocol path is accepted")
    frozen = read_json(protocol_path)
    if frozen.get("version") != VERSION or frozen.get("task_root") != str(T): raise ValueError("Unknown frozen protocol/task")
    protocol = frozen["protocol"]
    if canonical(protocol) != canonical(read_json(STATIC)) or frozen["arms"] != registered_arms(protocol):
        raise ValueError("Registered protocol/arms changed")
    if frozen["forms_protocol"] != dict(path=str(ref_path(protocol["inputs"]["forms_protocol"])), sha256=protocol["inputs"]["forms_protocol"]["sha256"]):
        raise ValueError("Forms protocol reference differs")
    for ref, name in ((frozen["loss_manifest"], "class-loss-manifest.json"), (frozen["selections"], "selections.json"),
                      (frozen["selections"]["populations"], "populations.json"), (frozen["compatibility"], "compatibility.json")):
        if ref["path"] != str(T / "frozen" / name): raise ValueError("Frozen output path differs")
    expected_inputs = inventory(protocol)
    expected_inputs[str(STATIC)] = digest(STATIC)
    if frozen["inputs"] != expected_inputs: raise ValueError("Frozen input inventory differs")
    expected_sources = {str(REPO / p): digest(REPO / p) for p in protocol["source_paths"]}
    if frozen["sources"] != expected_sources or frozen["versions"] != versions(): raise ValueError("Source/dependency identity changed")
    check_hashes({r["path"]: r["sha256"] for r in (frozen["loss_manifest"], frozen["selections"], frozen["selections"]["populations"], frozen["compatibility"])})
    rows, layout, identity = data_inputs(ref_path(protocol["data"]))
    validate_manifest(frozen["loss_manifest"]["path"], rows, layout, identity)
    if frozen["loss_manifest"]["formula"] != FORMULA: raise ValueError("Objective formula differs")
    training = read_json(frozen["selections"]["path"])
    if digest(frozen["selections"]["path"]) != protocol["inputs"]["training_selections"]["sha256"]: raise ValueError("D selections changed")
    populations = frozen_populations(training, read_json(ref_path(protocol["inputs"]["label_membership"])), rows, layout)
    if read_json(frozen["selections"]["populations"]["path"]) != populations: raise ValueError("Frozen populations changed")
    return frozen


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("freeze", "verify", "fit"):
        p = commands.add_parser(name); p.add_argument("--protocol", required=True, type=Path)
        if name != "verify": p.add_argument("--out", required=True, type=Path)
        if name == "fit":
            p.add_argument("--name", choices=("W-s0", "F-s1", "W-s1"), required=True)
            p.add_argument("--runtime", choices=("float", "ort"), required=True)
    a = parser.parse_args(argv)
    try:
        if a.command == "freeze": freeze(a.protocol, a.out)
        elif a.command == "verify": verify_frozen(a.protocol)
        else:
            from modernbert_rare_heads_fit import run_fit
            run_fit(a.protocol, a.name, a.runtime, a.out)
            return 0
        print(json.dumps(dict(command=a.command, checks=52, status="verified")))
        return 0
    except (ValueError, OSError, KeyError, IndexError, TypeError, importlib.metadata.PackageNotFoundError) as exc:
        print(f"rare-heads: {exc}", file=sys.stderr); return 1


if __name__ == "__main__": sys.exit(main())
