"""Campaign-bound actual training-fit execution; imports never load a model.

The float path is completed-checkpoint CPU inference decoded by makeReader.
The ort path runs Python ORT and production Node ORT on identical padded arrays.
Fixture tests exercise contracts only and cannot establish model accuracy.
"""
import argparse
from collections import Counter, defaultdict
from contextlib import contextmanager
import ctypes
import hashlib
import json
import math
import os
from pathlib import Path
import resource
import re
import signal
import stat
import subprocess
import sys
import threading
import time

HERE = Path(__file__).resolve().parent
NEURAL = HERE.parent
REPO = NEURAL.parent.parent
NAMES = ("J-s0",)
LAYOUT_KEYS = ("acts", "tags", "classes", "act_keys", "ref_keys", "desc_keys", "desc2_keys", "output_contract", "text_state_keys")
OUTPUTS = ("token_logits", "seq_logits", "cut_logits")
TASK = Path.home() / ".cache/diagram-vss-modernbert/request-weighting-2026-11-09"
JOINT_COUNTS = {"fill_outline": (57, 57), "outline_without_fill": (32, 28)}
POPULATIONS = {"outline_create": (89, 85), "outline_coloured_create": (74, 71),
               "outline_set": (97, 93), "desc_r2": (35, 34),
               "desc_r2_canonical": (21, 20), "desc_old": (24, None),
               "count_size": (14, 14), "absent_controls": (1440, 1440)}


def read_json(p):
    def reject(x): raise ValueError("nonfinite JSON: " + x)
    return json.loads(Path(p).read_text(), parse_constant=reject)


def digest(p):
    h = hashlib.sha256()
    with Path(p).open("rb") as f:
        for block in iter(lambda: f.read(4 * 1024 * 1024), b""): h.update(block)
    return h.hexdigest()


def check_hashes(identities):
    if not identities: raise ValueError("empty identity inventory")
    for p, want in identities.items():
        if not isinstance(want, str) or len(want) != 64 or digest(p) != want:
            raise ValueError("identity changed: " + p)


def save(p, obj):
    with Path(p).open("x") as f:
        json.dump(obj, f, ensure_ascii=False, allow_nan=False, separators=(",", ":")); f.write("\n")


def resources():
    available = next(int(s.split()[1]) * 1024 for s in Path("/proc/meminfo").read_text().splitlines() if s.startswith("MemAvailable:"))
    if resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024 > 12 * 1024 ** 3 or available < 4 * 1024 ** 3:
        raise RuntimeError("preregistered memory stop")


def validate_layout(actual, expected):
    for key in LAYOUT_KEYS:
        if actual.get(key) != expected.get(key): raise ValueError("layout differs: " + key)


def validate_tensors(output, arrays, layout):
    if set(output) != set(OUTPUTS): raise ValueError("wrong output names")
    if set(arrays) != {"input_ids", "attention_mask"}: raise ValueError("wrong input names")
    b = len(arrays["input_ids"])
    if not b or b > 8: raise ValueError("invalid batch size")
    n = len(arrays["input_ids"][0])
    if not 2 <= n <= 128: raise ValueError("wrong training cap")
    for key, rows in arrays.items():
        if len(rows) != b or any(len(row) != n for row in rows): raise ValueError("ragged input")
        if any(type(v) is not int or v < 0 or (key == "attention_mask" and v > 1) for row in rows for v in row): raise ValueError("invalid input values")
    widths = {"token_logits": [b, n, len(layout["tags"])], "seq_logits": [b, len(layout["acts"]) + sum(len(v) for _, v in layout["classes"])], "cut_logits": [b, n, 3]}
    for key, dims in widths.items():
        t = output[key]
        if set(t) != {"dims", "data"} or t["dims"] != dims or len(t["data"]) != math.prod(dims): raise ValueError("wrong tensor shape: " + key)
        if any(type(v) not in (int, float) or not math.isfinite(v) for v in t["data"]): raise ValueError("nonfinite tensor: " + key)


def validate_completion(complete, arm):
    if complete.get("complete") is not True or complete.get("full_schedule") is not True or complete.get("max_updates") != 0:
        raise ValueError("incomplete training")
    state, meta = complete["state"], complete["metadata"]
    if state.get("epoch") != 8 or state.get("update") != 14640 or state.get("total") != 14640: raise ValueError("wrong completed schedule")
    if meta.get("base") != "answerdotai/ModernBERT-base" or meta.get("revision") != "8949b909ec900327062f0ebf497f51aef5e6f0c8": raise ValueError("wrong model")
    settings = meta["settings"]
    expected = dict(seed=arm["seed"], epochs=8, lr=6e-5, head_lr=6e-5, batch=32, cut_batch=8, weight_decay=.01, warmup=.06, clip=1., request_cap=128, message_cap=512, attn="sdpa", autocast="bfloat16", weights="float32", gradient_checkpointing=False, max_updates=0)
    if {k: v for k, v in settings.items() if k != "request_class_loss"} != expected: raise ValueError("wrong training recipe")
    if arm.get("arm") != "J" or arm["seed"] != 0 or arm["objective"] != "request-max-positive-sqrt-v1" or settings.get("request_class_loss", {}).get("formula") != arm["objective"]:
        raise ValueError("wrong objective")


def validate_finalized_export(receipt, config):
    """Export completion is independent of float/q8 categorical agreement.

    arm_export writes this receipt only after its Python/Node runtime checks.
    Its exit 2 and passed=false describe float/q8 decode differences, which are
    retained as diagnostics rather than substituted for the new fit/parity gates.
    """
    if receipt.get("schema") != "arm-export-receipt-v1" or type(receipt.get("passed")) is not bool:
        raise ValueError("missing finalized export")
    policy = dict(graph_optimization="basic", arithmetic="float32", weight_storage="uint8")
    if receipt.get("export_mode") != "weight-only-u8-fp32" or config["reader"].get("export_mode") != receipt["export_mode"]:
        raise ValueError("wrong export mode")
    if receipt.get("execution_policy") != policy or config["reader"].get("execution_policy") != policy:
        raise ValueError("wrong export runtime policy")
    runtime = receipt.get("runtime", {})
    if runtime.get("backend") != "cpu" or any(not isinstance(runtime.get(k), str) or not runtime[k] for k in ("transformers_js", "onnxruntime", "node", "python", "python_onnxruntime")):
        raise ValueError("missing finalized runtime evidence")
    checks = receipt.get("python_ort_vs_node", {})
    if any(checks.get(k) is not True for k in ("ids", "outputs", "decoded", "cuts", "readMany")):
        raise ValueError("incomplete export Python/Node runtime checks")
    if any(type(checks.get(k)) is not int or checks[k] <= 0 for k in ("fixtures", "singles", "batches")) or checks["fixtures"] != checks["singles"] + checks["batches"]:
        raise ValueError("zero/invalid export runtime checks")
    maxima = checks.get("max_abs")
    if not isinstance(maxima, list) or len(maxima) != 3 or any(type(v) not in (int, float) or not math.isfinite(v) or v < 0 for v in maxima):
        raise ValueError("invalid export runtime numbers")
    if receipt.get("tolerance") != dict(atol=1e-3, rtol=1e-3): raise ValueError("wrong export runtime tolerance")
    categorical = receipt.get("torch_vs_node", {})
    if type(categorical.get("texts")) is not int or categorical["texts"] <= 0 or not isinstance(categorical.get("differences"), list) or receipt["passed"] != (not categorical["differences"]):
        raise ValueError("malformed float/q8 categorical diagnostic")
    if not isinstance(receipt.get("cases_where_q8_decodes_differently_from_float"), list): raise ValueError("missing float/q8 diagnostics")
    if receipt.get("source_changes_since_training") != [] or receipt.get("weights", {}).get("source_changes_since_training") != []:
        raise ValueError("export source changed since training")
    files, shards = receipt.get("files"), receipt.get("shards")
    required = {"config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "conversion.json", "export_parity.json", "references.json", "onnx/model_quantized.onnx"}
    if not isinstance(files, dict) or not required.issubset(files): raise ValueError("missing finalized export inventory")
    if not isinstance(shards, list) or not shards or any(not isinstance(s, str) or Path(s).name != s for s in shards) or len(shards) != len(set(shards)):
        raise ValueError("invalid finalized export shards")
    if any("onnx/" + shard not in files for shard in shards) or config.get("transformers.js_config", {}).get("use_external_data_format") != len(shards):
        raise ValueError("missing finalized export shard inventory")


def load_context(protocol_path, name, runtime):
    if name not in NAMES or runtime not in ("float", "ort"): raise ValueError("unregistered fit name/runtime")
    from modernbert_request_weight import verify_frozen
    frozen = verify_frozen(Path(protocol_path))
    arm = frozen["arms"][name]
    run, model, data = (Path(arm[k]) for k in ("training", "model", "train_data"))
    complete = read_json(run / "complete.json"); validate_completion(complete, arm)
    layout = read_json(data / "reader.json"); config = read_json(model / "config.json")
    validate_layout(config["reader"], layout)
    receipt = read_json(model / "arm_receipt.json")
    validate_finalized_export(receipt, config)
    weights = receipt["weights"]
    checkpoint = run / weights["source_file"]
    if weights.get("source_file") != "checkpoint.pt" or weights.get("sha256") != digest(checkpoint): raise ValueError("export/checkpoint binding differs")
    if any(weights.get(k) != v for k, v in {"epoch": 8, "update": 14640, "total": 14640, "full_schedule": True, "max_updates": 0}.items()): raise ValueError("export is incomplete")
    provenance = config["reader"]["training_provenance"]
    for key in ("base", "revision", "settings", "tokenization", "sources"):
        if provenance.get(key) != complete["metadata"].get(key): raise ValueError("export provenance mismatch: " + key)
    if config["reader"]["training_manifest"]["files"] != complete["metadata"]["data"]["files"]: raise ValueError("export data binding differs")
    identities = {str(Path(protocol_path).resolve()): digest(protocol_path), **frozen["inputs"], **frozen["sources"]}
    for name_, want in complete["metadata"]["sources"].items():
        p = NEURAL / name_
        if digest(p) != want: raise ValueError("training source changed: " + name_)
        identities[str(p)] = want
    for name_, want in complete["metadata"]["data"]["files"].items(): identities[str(data / name_)] = want
    for relative, info in receipt["files"].items():
        p = model / relative
        if p.is_symlink() or not p.resolve().is_relative_to(model.resolve()) or p.stat().st_size != info["bytes"]: raise ValueError("invalid/missing export file")
        identities[str(p)] = info["sha256"]
    # Inventory every model/runtime input, including tokenizer and graph sidecars.
    for folder in (model, run / "tokenizer", run / "encoder_config"):
        for p in sorted(folder.rglob("*")):
            if p.is_file():
                if p.is_symlink(): raise ValueError("symlink model input")
                identities.setdefault(str(p), digest(p))
    for p in (run / "complete.json", checkpoint, HERE / "modernbert_request_weight_fit.py", HERE / "modernbert_request_weight_fit.mjs", REPO / "training/laptop/package-lock.json"):
        identities[str(p)] = digest(p)
    objective = complete["metadata"]["settings"]["request_class_loss"]
    if (objective.get("sha256") != frozen["loss_manifest"]["sha256"]
            or objective.get("manifest") != read_json(frozen["loss_manifest"]["path"])):
        raise ValueError("objective manifest differs")
    selections_path = frozen["selections"]["path"]
    selections = read_json(selections_path)
    populations_ref = frozen["selections"]["populations"]
    populations = read_json(populations_ref["path"])
    identities[selections_path] = frozen["selections"]["sha256"]
    identities[populations_ref["path"]] = populations_ref["sha256"]
    joint_populations = read_json(frozen["joint_populations"]["path"])
    joint_selections = read_json(frozen["joint_selections"]["path"])
    for key in ("joint_populations", "joint_selections", "loss_manifest"):
        identities[frozen[key]["path"]] = frozen[key]["sha256"]
    check_hashes(identities)
    export_diagnostics = dict(receipt_sha256=digest(model / "arm_receipt.json"), float_vs_node_categorical_passed=receipt["passed"],
                              float_vs_node=receipt["torch_vs_node"], cases_where_q8_decodes_differently_from_float=receipt["cases_where_q8_decodes_differently_from_float"])
    context = dict(version="modernbert-request-weight-fit-context-v1", name=name, runtime=runtime, arm=arm, protocol=str(Path(protocol_path).resolve()), task_root=frozen["task_root"], identities=identities, layout=layout, selections=selections, populations=populations, joint_populations=joint_populations, joint_selections=joint_selections, checkpoint=str(checkpoint), repo=str(REPO), python=sys.executable, export_diagnostics=export_diagnostics)
    validate_joint_membership(context)
    return context


def validate_joint_membership(context):
    """Reconstruct J0 membership from original observation indexes, not IDs."""
    layout = context["layout"]["classes"]
    names = [name for name, _ in layout]
    if len(names) != 52 or len(set(names)) != 52 or "color" not in names or "outline" not in names:
        raise ValueError("joint fit requires the complete 52-head layout")
    ci, oi = names.index("color"), names.index("outline")
    source = context["selections"]
    indexes = context["populations"]["outline_create"]
    if len(indexes) != 89 or len(set(indexes)) != 89 or indexes != sorted(indexes):
        raise ValueError("invalid joint outline population")
    populations = {key: [] for key in JOINT_COUNTS}
    records = []
    for index in indexes:
        if type(index) is not int or not 0 <= index < len(source["selections"]):
            raise ValueError("unknown joint observation")
        s = source["selections"][index]
        if s["arm"] != "F" or s["family"] != "outline_create" or s["head"] != "outline" or s["absent_control"] is not False:
            raise ValueError("foreign joint selection")
        targets = s["targets"]
        if len(targets) != 52 or any(type(t) is not int or not 0 <= t < len(values) for t, (_, values) in zip(targets, layout)) or targets[oi] == 0:
            raise ValueError("invalid joint target vector")
        text = source["requests"][s["request"]]["text"]
        key = "fill_outline" if targets[ci] > 0 else "outline_without_fill"
        if key == "fill_outline" and layout[ci][1][targets[ci]] == layout[oi][1][targets[oi]]:
            raise ValueError("frozen distinct-color property changed")
        populations[key].append(index)
        records.append(dict(observation=index, request=s["request"], ordinal=s["ordinal"], id=s["id"], text=text,
                            text_sha256=hashlib.sha256(text.encode()).hexdigest(), targets=targets, act=s["act"], tags=s["tags"]))
    for key, (observations, requests) in JOINT_COUNTS.items():
        selected = [r for r in records if r["observation"] in populations[key]]
        if len(selected) != observations or len({r["request"] for r in selected}) != requests or len({r["ordinal"] for r in selected}) != requests:
            raise ValueError("joint population request/ordinal counts changed: " + key)
        if key == "fill_outline" and len({r["text"] for r in selected}) != 57:
            raise ValueError("joint specified-fill texts are not distinct")
    if populations != context["joint_populations"] or records != context["joint_selections"]:
        raise ValueError("joint population/selection binding differs")
    return populations


def summarize(context, decoded):
    """Recompute integer counts from exhaustive original observation indices."""
    joint_populations = validate_joint_membership(context)
    selections = context["selections"]
    expected_requests = [i for i, r in enumerate(selections["requests"]) if r["arm"] == "F"]
    if [r.get("request") for r in decoded] != expected_requests: raise ValueError("missing/duplicate/reordered decoded request")
    lookup = {r["request"]: r for r in decoded}
    runtime = context["runtime"]; chosen = "python" if runtime == "float" else "node"
    groups = defaultdict(Counter); observations = []
    all_heads = defaultdict(Counter)
    names = [k for k, _ in context["layout"]["classes"]]
    contradictions = defaultdict(set)
    for selection in selections["selections"]:
        if selection["arm"] == "F" and not selection["absent_control"]:
            contradictions[(selections["requests"][selection["request"]]["text"], selection["head"])].add(selection["gold"])
    for index, selection in enumerate(selections["selections"]):
        if selection["arm"] != "F": continue
        row = dict(selection, observation=index, text=selections["requests"][selection["request"]]["text"])
        row["populations"] = [k for k,v in context["populations"].items() if index in v]
        row["label_scope"] = "absence" if selection["absent_control"] else "old-contextual" if "desc_old" in row["populations"] else "explicit"
        row["conflicting_targets"] = sorted(contradictions[(row["text"], selection["head"])])
        row["conflict"] = len(row["conflicting_targets"]) > 1
        if selection["head"] not in names: raise ValueError("unknown selected head")
        hi = names.index(selection["head"]); target = selection["targets"][hi]
        for engine in (["python"] if runtime == "float" else ["python", "node"]):
            read = lookup[selection["request"]][engine]
            if read.get("truncated") is not False or read.get("unreadFrom") is not None: raise ValueError("truncated fit output")
            if list(read["classes"]) != names: raise ValueError("wrong decoded head layout/order")
            if read.get("act") not in context["layout"]["acts"] or any(t not in context["layout"]["tags"] for t in read["tags"]): raise ValueError("unknown decoded action/tag")
            if len(read["tags"]) != len(selection["tags"]) or read["words"] != lookup[selection["request"]]["words"]: raise ValueError("wrong decoded word count")
            pred = dict(read, head_index=read["classes"][selection["head"]], target_index=target)
            pred.update(correct=pred["head_index"] == target, action_right=pred["act"] == selection["act"], tags_exact=pred["tags"] == selection["tags"])
            pred["classes_exact"] = all(pred["classes"][key] == t for key, t in zip(names, selection["targets"]))
            pred["joint_correct"] = pred["classes_exact"] and pred["action_right"] and pred["tags_exact"]
            row[engine] = pred
        pred = row[chosen]
        for h, ((key, vals), t) in enumerate(zip(context["layout"]["classes"], selection["targets"])):
            p = pred["classes"][key]
            if type(p) is not int or not 0 <= p < len(vals): raise ValueError("invalid decoded class index")
            all_heads[key]["observations"] += 1; all_heads[key]["correct"] += p == t
            all_heads[key]["positive"] += t > 0; all_heads[key]["positive_correct"] += t > 0 and p == t
            all_heads[key]["absent"] += t == 0; all_heads[key]["absent_correct"] += t == 0 and p == 0
        key = (selection["family"], selection["absent_control"], selection["representation"])
        groups[key].update(rows=1, correct=int(pred["correct"]), action_right=int(pred["action_right"]), tags_exact=int(pred["tags_exact"]))
        observations.append(row)
    if len(observations) != 1699 or sum(not s["absent_control"] for s in observations) != 259: raise ValueError("wrong fit population")
    by_index = {r["observation"]: r for r in observations}; population_counts = {}
    for name, (count, minimum) in POPULATIONS.items():
        indices = context["populations"][name]
        if len(indices) != count or len(set(indices)) != count or any(i not in by_index for i in indices): raise ValueError("invalid frozen population: " + name)
        correct = sum(by_index[i][chosen]["correct"] for i in indices)
        population_counts[name] = dict(rows=count, correct=correct, minimum=minimum, passed=None if minimum is None else correct >= minimum)
    joint = {}
    for key, indexes in joint_populations.items():
        selected = [by_index[i][chosen] for i in indexes]
        joint[key] = dict(rows=len(indexes), minimum=len(indexes), correct=sum(p["joint_correct"] for p in selected),
                          classes_exact=sum(p["classes_exact"] for p in selected), action_right=sum(p["action_right"] for p in selected),
                          tags_exact=sum(p["tags_exact"] for p in selected), passed=all(p["joint_correct"] for p in selected))
    return observations, dict(runtime=runtime, observations=len(observations), positives=259, absents=1440, requests=len(decoded), populations=population_counts, joint=joint,
        metrics=[dict(family=k[0], absent_control=k[1], representation=k[2], runtime=runtime, **v) for k, v in groups.items()], all_heads=dict(all_heads),
        passed=all(v["passed"] is not False for v in population_counts.values()) and all(v["passed"] for v in joint.values()))


def validate_node_receipt(node, context, out):
    """Reject partial or relabeled receipts before any accuracy gate is reported."""
    runtime = context["runtime"]
    count = sum(r["arm"] == "F" for r in context["selections"]["requests"])
    if (node.get("version") != "modernbert-request-weight-fit-node-v1" or node.get("name") != context["name"] or node.get("runtime") != runtime
            or node.get("context_sha256") != digest(Path(out) / "context.json") or node.get("requests") != count or node.get("batches") != (count + 7) // 8):
        raise ValueError("malformed Node receipt identity/count")
    engine = node.get("engine", {})
    if engine.get("finished") is not True or engine.get("code") != 0 or engine.get("signal") is not None or engine.get("batches") != node["batches"] or not engine.get("argv") or not engine.get("versions"):
        raise ValueError("incomplete engine execution receipt")
    if not all(type(node.get(k)) in (int,float) and math.isfinite(node[k]) for k in ("started","ended")) or node["ended"] < node["started"]: raise ValueError("malformed execution times")
    outputs = node.get("outputs", {})
    if set(outputs) != {"batches.jsonl", "decoded.jsonl", "engine.stderr.log"}: raise ValueError("missing raw/decoded output binding")
    for filename, want in outputs.items():
        if digest(Path(out) / filename) != want: raise ValueError("changed Node output")
    parity = node.get("parity", {})
    if runtime == "ort":
        if parity.get("scope") != "actual-python-ort-versus-production-node-q8" or parity.get("atol") != 1e-3 or parity.get("rtol") != 1e-3 or parity.get("includes_padding") is not True:
            raise ValueError("wrong parity scope/tolerance")
        for key in ("batches","values","padding_values","action_compared","class_compared","tag_compared","numerical_failed","padding_failed","action_different","class_different","tag_different","word_different"):
            if type(parity.get(key)) is not int or parity[key] < 0: raise ValueError("malformed parity counts")
        if parity["batches"] != node["batches"] or any(parity[k] <= 0 for k in ("values","padding_values","action_compared","class_compared","tag_compared")): raise ValueError("zero parity/padding checks")
        passed = all(parity[k] == 0 for k in ("numerical_failed","padding_failed","action_different","class_different","tag_different","word_different"))
        if parity.get("passed") is not passed: raise ValueError("contradictory parity verdict")
    elif parity != {"scope":"float-checkpoint-fit", "passed":None}: raise ValueError("float result relabeled parity")


def public_fit_argv(protocol_path, name, runtime, out):
    """Only the registered public CLI may construct an executable fit context."""
    if Path.cwd() != REPO or Path(sys.executable) != Path.home() / ".cache/diagram-vss-modernbert/venv/bin/python":
        raise ValueError("registered fit working directory/interpreter required")
    argv = [x.decode() for x in Path("/proc/self/cmdline").read_bytes().split(b"\0") if x]
    args = argv[1:]
    if args and args[0] == "-B": args = args[1:]
    expected = {"--protocol": str(Path(protocol_path).resolve()), "--name": name, "--runtime": runtime, "--out": str(out)}
    if len(args) != 10 or Path(args[0]).resolve() != HERE / "modernbert_request_weight.py" or args[1] != "fit":
        raise ValueError("canonical public fit invocation required")
    options = dict(zip(args[2::2], args[3::2]))
    if len(options) != 4 or options != expected:
        raise ValueError("canonical public fit arguments differ")
    return argv


def require_fit_worker(context_path, context):
    """Check live inherited ownership before importing any model libraries."""
    root = Path(context.get("task_root", ""))
    runtime = context.get("runtime")
    expected = root / "J-s0" / ("fit-" + str(runtime)) / "context.json"
    if (root != TASK or context.get("name") != "J-s0" or runtime not in ("float", "ort")
            or context.get("version") != "modernbert-request-weight-fit-context-v1"
            or Path(context_path).absolute() != expected or any(p.is_symlink() for p in (expected, *expected.parents))):
        raise ValueError("unregistered internal fit context")
    guard = context.get("guard", {})
    if guard.get("scope") != "actual-model-training-fit" or guard.get("deadline") != guard.get("started", 0) + 1800 or not guard["started"] <= time.time() < guard["deadline"]:
        raise ValueError("finite inherited fit deadline required")
    fd_text = os.environ.get("REQUEST_WEIGHT_FIT_CPU_FD", "")
    if not fd_text.isdecimal(): raise ValueError("inherited fit CPU lock required")
    fd = int(fd_text); held, actual = os.fstat(fd), (root / "cpu.lock").lstat()
    if (not stat.S_ISREG(held.st_mode) or actual.st_nlink != 1 or (held.st_dev, held.st_ino) != (actual.st_dev, actual.st_ino)
            or os.readlink(f"/proc/self/fd/{fd}") != str(root / "cpu.lock")
            or not re.search(r"FLOCK\s+ADVISORY\s+WRITE", Path(f"/proc/self/fdinfo/{fd}").read_text())):
        raise ValueError("live exclusive fit CPU lock required")
    if os.environ.get("REQUEST_WEIGHT_FIT_CONTEXT_SHA256") != digest(expected):
        raise ValueError("inherited fit context hash differs")
    parent = [x.decode() for x in Path(f"/proc/{os.getppid()}/cmdline").read_bytes().split(b"\0") if x]
    if len(parent) != 6 or Path(parent[1]).resolve() != HERE / "modernbert_request_weight_fit.mjs" or parent[2:] != ["--context", str(expected), "--out", str(expected.parent)]:
        raise ValueError("live Node fit parent required")
    owner = guard.get("owner_pid")
    if type(owner) is not int or owner <= 0 or Path(f"/proc/{os.getppid()}/status").read_text().split("PPid:", 1)[1].split()[0] != str(owner):
        raise ValueError("live public fit supervisor required")
    owner_argv = [x.decode() for x in Path(f"/proc/{owner}/cmdline").read_bytes().split(b"\0") if x]
    if owner_argv != guard.get("public_argv"): raise ValueError("public fit supervisor identity changed")
    return guard


@contextmanager
def cpu_lock(root):
    import fcntl
    p = Path(root) / "cpu.lock"
    if any(x.is_symlink() for x in (p, *p.parents)): raise ValueError("symlink CPU lock")
    fd = os.open(p, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1: raise ValueError("nonexclusive CPU lock identity")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield fd
    finally: os.close(fd)


@contextmanager
def deadline(seconds):
    """Defer cancellation during Popen so a created child always has an owner."""
    class Interrupts:
        launching = False
        pending = None
        raised = False

        def check(self):
            if self.pending is not None and not self.raised:
                self.raised = True
                if self.pending == signal.SIGALRM: raise TimeoutError("finite fit deadline exceeded")
                raise InterruptedError("fit interrupted by " + signal.Signals(self.pending).name)

        def receive(self, signum, _frame):
            if self.pending is None: self.pending = signum
            if not self.launching: self.check()

    interrupts = Interrupts()
    previous = {sig: signal.signal(sig, interrupts.receive) for sig in (signal.SIGALRM, signal.SIGTERM, signal.SIGINT)}
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try: yield interrupts
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        for sig, handler in previous.items(): signal.signal(sig, handler)


@contextmanager
def reap_owned_children():
    """Adopt orphaned grandchildren; only the launched group is ever reaped."""
    libc = ctypes.CDLL(None, use_errno=True)
    previous = ctypes.c_int()
    if libc.prctl(37, ctypes.byref(previous), 0, 0, 0) != 0 or libc.prctl(36, 1, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "cannot enable fit child subreaper")
    try: yield
    finally:
        if libc.prctl(36, previous.value, 0, 0, 0) != 0:
            raise OSError(ctypes.get_errno(), "cannot restore fit child subreaper")


def cleanup_group(process):
    """Stop and reap the session we launched, even after its leader has exited."""
    group = process.pid
    if group <= 1 or group == os.getpgrp(): raise RuntimeError("invalid owned fit process group")
    reaped = []

    def remaining():
        process.poll()  # Preserve the direct child's return code before waitpid.
        while True:
            try: pid, status = os.waitpid(-group, os.WNOHANG)
            except ChildProcessError: break
            if not pid: break
            if pid == process.pid: process.returncode = os.waitstatus_to_exitcode(status)
            else: reaped.append(pid)
        try: os.killpg(group, 0)
        except ProcessLookupError: return False
        return True

    escalated = False
    for sig, grace in ((signal.SIGTERM, 2), (signal.SIGKILL, 3)):
        if not remaining(): break
        try: os.killpg(group, sig)
        except ProcessLookupError: break
        escalated |= sig == signal.SIGKILL
        until = time.monotonic() + grace
        while remaining() and time.monotonic() < until: time.sleep(.02)
    gone = not remaining()
    if not gone: raise RuntimeError("owned fit process group did not exit within cleanup deadline")
    process.wait(timeout=0)
    return dict(process_group=group, group_gone=True, escalated=escalated, reaped_descendants=reaped)


def run_fit(protocol_path, name, runtime, out):
    if name != "J-s0" or runtime not in ("float", "ort"): raise ValueError("unregistered fit name/runtime")
    root = Path(read_json(protocol_path)["task_root"]).absolute()
    if root != TASK or Path(protocol_path).absolute() != root / "frozen/protocol.json": raise ValueError("wrong task root/protocol")
    out = Path(out).absolute()
    if (out != root / name / ("fit-" + runtime) or out.exists() or not out.parent.is_dir()
            or any(p.is_symlink() for p in (out, *out.parents))):
        raise ValueError("fit requires fresh registered task-owned output directory")
    public_argv = public_fit_argv(protocol_path, name, runtime, out)
    env = dict(os.environ, CUDA_VISIBLE_DEVICES="", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", OMP_NUM_THREADS="2", MKL_NUM_THREADS="2", OPENBLAS_NUM_THREADS="2", TOKENIZERS_PARALLELISM="false", PYTHONDONTWRITEBYTECODE="1")
    with cpu_lock(root) as lock_fd, deadline(1800) as interrupts:
        out.mkdir()
        started = time.time()
        attempt = dict(schema="request-weight-fit-attempt-v1", name=name, runtime=runtime, protocol=str(Path(protocol_path).absolute()),
                       out=str(out), public_argv=public_argv, cwd=str(REPO), started=started, deadline=started + 1800, timeout_seconds=1800)
        save(out / "attempt.json", attempt)
        try:
            with reap_owned_children():
                context = load_context(protocol_path, name, runtime)
                context["guard"] = dict(scope="actual-model-training-fit", started=started, deadline=started + 1800, owner_pid=os.getpid(), public_argv=public_argv)
                resources(); save(out / "context.json", context)
                env.update(REQUEST_WEIGHT_FIT_CPU_FD=str(lock_fd), REQUEST_WEIGHT_FIT_CONTEXT_SHA256=digest(out / "context.json"))
                argv = ["node", str(HERE / "modernbert_request_weight_fit.mjs"), "--context", str(out / "context.json"), "--out", str(out)]
                model_started = time.time()
                with (out / "stdout.log").open("x") as stdout, (out / "stderr.log").open("x") as stderr:
                    process = None
                    failure = None
                    cleanup = None
                    try:
                        interrupts.launching = True
                        try:
                            process = subprocess.Popen(argv, env=env, cwd=REPO, stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr, start_new_session=True, pass_fds=(lock_fd,))
                        finally: interrupts.launching = False
                        interrupts.check()
                        import psutil
                        while process.poll() is None:
                            resources()
                            tree = psutil.Process(os.getpid())
                            rss = 0
                            for member in [tree, *tree.children(recursive=True)]:
                                try: rss += member.memory_info().rss
                                except psutil.NoSuchProcess: pass
                            if rss > 12 * 1024 ** 3: raise RuntimeError("fit process tree memory stop")
                            if time.time() >= attempt["deadline"]: raise TimeoutError("finite fit deadline exceeded")
                            try: process.wait(timeout=1)
                            except subprocess.TimeoutExpired: pass
                    except BaseException as error:
                        failure = str(error)
                        raise
                    finally:
                        # Further cancellation cannot interrupt bounded cleanup or its receipt.
                        interrupts.launching = True
                        try:
                            if process is not None: cleanup = cleanup_group(process)
                        finally:
                            code = process.returncode if process is not None else None
                            execution = dict(argv=argv, cwd=str(REPO), started=model_started, ended=time.time(), exit_code=code, signal=-code if code is not None and code < 0 else None, timeout_seconds=1800, failure=failure, cleanup=cleanup)
                            save(out / "execution.json", execution)
                            interrupts.launching = False
                        interrupts.check()
                check_hashes(context["identities"])
                node = read_json(out / "node-receipt.json"); validate_node_receipt(node, context, out)
                decoded = [json.loads(line) for line in (out / "decoded.jsonl").read_text().splitlines()]
                observations, summary = summarize(context, decoded)
                if node.get("requests") != summary["requests"] or node.get("batches") != (summary["requests"] + 7) // 8: raise ValueError("wrong execution counts")
                summary["parity"] = node["parity"]; summary["export_diagnostics"] = context["export_diagnostics"]
                summary["passed"] &= process.returncode == 0 and (runtime == "float" or node["parity"].get("passed") is True)
                with (out / "rows.jsonl").open("x") as f:
                    for row in observations: f.write(json.dumps(row, ensure_ascii=False, allow_nan=False) + "\n")
                save(out / "summary.json", summary)
                result = dict(schema="request-weight-fit-attempt-result-v1", started=started, ended=time.time(), complete=True, error=None, passed=summary["passed"])
                save(out / "attempt-result.json", result)
                outputs = {p.name: digest(p) for p in out.iterdir() if p.is_file()}
                receipt = dict(version="modernbert-request-weight-fit-v1", scope="actual-model-training-fit", name=name, runtime=runtime,
                               protocol={"path":context["protocol"],"sha256":context["identities"][context["protocol"]]}, identities_before=context["identities"],
                               identities_after={p:digest(p) for p in context["identities"]}, execution=execution, attempt=attempt, attempt_result=result,
                               outputs=outputs, counts={k:summary[k] for k in ("observations","positives","absents","requests")},
                               parity=node["parity"], export_diagnostics=context["export_diagnostics"], passed=summary["passed"])
                save(out / "receipt.json", receipt)
                if not summary["passed"]: raise RuntimeError("training-fit/parity gate failed; evidence preserved at " + str(out))
                return receipt
        except BaseException as error:
            if not (out / "attempt-result.json").exists():
                save(out / "attempt-result.json", dict(schema="request-weight-fit-attempt-result-v1", started=started, ended=time.time(), complete=False, error=str(error), passed=None))
            raise


def engine(context_path):
    context = read_json(context_path); guard = require_fit_worker(context_path, context); check_hashes(context["identities"]); resources()
    def watch():
        while True:
            threading.Event().wait(1)
            try:
                resources()
                if time.time() >= guard["deadline"]: raise TimeoutError("finite inherited fit deadline exceeded")
            except Exception as error:
                print(str(error), file=sys.stderr, flush=True); os._exit(70)
    threading.Thread(target=watch, daemon=True).start()
    import numpy as np
    import torch
    torch.set_num_threads(2); torch.set_num_interop_threads(2)
    sys.path.insert(0, str(NEURAL))
    from transformers import AutoTokenizer, ModernBertConfig, ModernBertModel
    from finetune_modernbert import ModernReader
    from modernbert_tokenization import batch
    arm = context["arm"]; run = Path(arm["training"])
    tok = AutoTokenizer.from_pretrained(run / "tokenizer", local_files_only=True)
    versions = dict(python=sys.version, numpy=np.__version__, torch=torch.__version__)
    if context["runtime"] == "float":
        checkpoint = torch.load(context["checkpoint"], map_location="cpu", weights_only=False, mmap=True)
        complete = read_json(run / "complete.json")
        if checkpoint["metadata"] != complete["metadata"] or any(checkpoint["state"].get(k) != v for k,v in complete["state"].items()): raise ValueError("completed checkpoint identity mismatch")
        config = ModernBertConfig.from_pretrained(run / "encoder_config", local_files_only=True)
        config.reference_compile = False; config._attn_implementation = "eager"
        layout = context["layout"]
        model = ModernReader(ModernBertModel(config), len(layout["acts"]), [len(v) for _, v in layout["classes"]], len(layout["tags"])).float().cpu().eval()
        model.load_state_dict(checkpoint["model"], strict=True); del checkpoint
        def infer(arrays):
            with torch.no_grad(): return [x.detach().numpy() for x in model(**{k:torch.tensor(v,dtype=torch.long) for k,v in arrays.items()})]
    else:
        import onnxruntime as ort
        options = ort.SessionOptions(); options.intra_op_num_threads = 2; options.inter_op_num_threads = 2; options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        session = ort.InferenceSession(str(Path(arm["model"]) / "onnx/model_quantized.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
        if session.get_providers() != ["CPUExecutionProvider"]: raise ValueError("wrong runtime provider")
        versions["onnxruntime"] = ort.__version__
        def infer(arrays): return session.run(list(OUTPUTS), {k:np.asarray(v,dtype=np.int64) for k,v in arrays.items()})
    count = 0; start = time.time()
    for line in sys.stdin:
        job = json.loads(line)
        if job == {"finish": True}:
            if not count: raise ValueError("zero model batches")
            check_hashes(context["identities"])
            print(json.dumps(dict(finished=True, batches=count, versions=versions, argv=sys.argv, started=start, ended=time.time())), flush=True); return
        if job.get("batch") != count or job.get("cap") != 128: raise ValueError("wrong batch order/cap")
        resources(); prepared, arrays = batch(tok, job["texts"], 128)
        if arrays != job["arrays"] or any(p["truncated"] for p in prepared): raise ValueError("token preparation differs/truncated")
        values = infer(arrays)
        raw = {k:dict(dims=list(v.shape), data=v.reshape(-1).tolist()) for k,v in zip(OUTPUTS, values)}
        validate_tensors(raw, arrays, context["layout"]); resources()
        print(json.dumps(raw, allow_nan=False, separators=(",", ":")), flush=True); count += 1
    raise RuntimeError("unexpected EOF without explicit finish")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--engine", required=True)
    args = ap.parse_args()
    for key, value in dict(CUDA_VISIBLE_DEVICES="", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", OMP_NUM_THREADS="2", MKL_NUM_THREADS="2", OPENBLAS_NUM_THREADS="2", TOKENIZERS_PARALLELISM="false").items(): os.environ[key] = value
    engine(args.engine)
