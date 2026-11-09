"""Campaign-bound actual training-fit execution; imports never load a model.

The float path is completed-checkpoint CPU inference decoded by makeReader.
The ort path runs Python ORT and production Node ORT on identical padded arrays.
Fixture tests exercise contracts only and cannot establish model accuracy.
"""
import argparse
from collections import Counter, defaultdict
from contextlib import contextmanager
import hashlib
import json
import math
import os
from pathlib import Path
import resource
import signal
import subprocess
import sys
import threading
import time

HERE = Path(__file__).resolve().parent
NEURAL = HERE.parent
REPO = NEURAL.parent.parent
NAMES = ("W-s0", "F-s1", "W-s1")
LAYOUT_KEYS = ("acts", "tags", "classes", "act_keys", "ref_keys", "desc_keys", "desc2_keys", "output_contract", "text_state_keys")
OUTPUTS = ("token_logits", "seq_logits", "cut_logits")
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
    if {k: v for k, v in settings.items() if k != "class_loss"} != expected: raise ValueError("wrong training recipe")
    if arm["objective"] == "ordinary-ce-v1":
        if "class_loss" in settings: raise ValueError("weighted control")
    elif arm["objective"] != "sqrt-positive-absent-v1" or settings.get("class_loss", {}).get("formula") != arm["objective"]:
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
    from modernbert_rare_heads import verify_frozen
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
    for p in (run / "complete.json", checkpoint, HERE / "modernbert_rare_heads_fit.py", HERE / "modernbert_rare_heads_fit.mjs", REPO / "training/laptop/package-lock.json"):
        identities[str(p)] = digest(p)
    if arm["objective"] != "ordinary-ce-v1" and complete["metadata"]["settings"]["class_loss"].get("sha256") != frozen["loss_manifest"]["sha256"]:
        raise ValueError("objective manifest differs")
    selections_path = frozen["selections"]["path"]
    selections = read_json(selections_path)
    populations_ref = frozen["selections"]["populations"]
    populations = read_json(populations_ref["path"])
    identities[selections_path] = frozen["selections"]["sha256"]
    identities[populations_ref["path"]] = populations_ref["sha256"]
    check_hashes(identities)
    export_diagnostics = dict(receipt_sha256=digest(model / "arm_receipt.json"), float_vs_node_categorical_passed=receipt["passed"],
                              float_vs_node=receipt["torch_vs_node"], cases_where_q8_decodes_differently_from_float=receipt["cases_where_q8_decodes_differently_from_float"])
    return dict(version="modernbert-rare-heads-fit-context-v1", name=name, runtime=runtime, arm=arm, protocol=str(Path(protocol_path).resolve()), task_root=frozen["task_root"], identities=identities, layout=layout, selections=selections, populations=populations, checkpoint=str(checkpoint), repo=str(REPO), python=sys.executable, export_diagnostics=export_diagnostics)


def summarize(context, decoded):
    """Recompute integer counts from exhaustive original observation indices."""
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
    return observations, dict(runtime=runtime, observations=len(observations), positives=259, absents=1440, requests=len(decoded), populations=population_counts,
        metrics=[dict(family=k[0], absent_control=k[1], representation=k[2], runtime=runtime, **v) for k, v in groups.items()], all_heads=dict(all_heads),
        passed=all(v["passed"] is not False for v in population_counts.values()))


def validate_node_receipt(node, context, out):
    """Reject partial or relabeled receipts before any accuracy gate is reported."""
    runtime = context["runtime"]
    count = sum(r["arm"] == "F" for r in context["selections"]["requests"])
    if (node.get("version") != "modernbert-rare-heads-fit-node-v1" or node.get("name") != context["name"] or node.get("runtime") != runtime
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


@contextmanager
def cpu_lock(root):
    import fcntl
    with (Path(root) / "cpu.lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


@contextmanager
def deadline(seconds):
    def expired(*_): raise TimeoutError("finite fit deadline exceeded")
    previous = signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try: yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0); signal.signal(signal.SIGALRM, previous)


def run_fit(protocol_path, name, runtime, out):
    # Read only the lock location before taking ownership; expensive verification
    # and all model/input hashing run serially with the actual CPU work.
    root = Path(read_json(protocol_path)["task_root"]).resolve()
    if root != Path.home() / ".cache/diagram-vss-modernbert/rare-heads-2026-11-09": raise ValueError("wrong task root")
    out = Path(out).absolute()
    if out.exists() or not out.parent.is_dir() or not out.parent.resolve().is_relative_to(root) or any(p.is_symlink() for p in (out, *out.parents)):
        raise ValueError("fit requires fresh task-owned output directory")
    env = dict(os.environ, CUDA_VISIBLE_DEVICES="", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", OMP_NUM_THREADS="2", MKL_NUM_THREADS="2", OPENBLAS_NUM_THREADS="2", TOKENIZERS_PARALLELISM="false", PYTHONDONTWRITEBYTECODE="1")
    with cpu_lock(root), deadline(1800):
        context = load_context(protocol_path, name, runtime)
        resources(); out.mkdir(); save(out / "context.json", context)
        argv = ["node", str(HERE / "modernbert_rare_heads_fit.mjs"), "--context", str(out / "context.json"), "--out", str(out)]
        started = time.time()
        with (out / "stdout.log").open("x") as stdout, (out / "stderr.log").open("x") as stderr:
            process = subprocess.Popen(argv, env=env, cwd=REPO, stdout=stdout, stderr=stderr, start_new_session=True)
            failure = None
            try:
                import psutil
                while process.poll() is None:
                    resources()
                    try:
                        tree = psutil.Process(process.pid)
                        rss = sum(p.memory_info().rss for p in [tree, *tree.children(recursive=True)] if p.is_running())
                    except psutil.NoSuchProcess:
                        rss = 0
                    if rss > 12 * 1024 ** 3: raise RuntimeError("fit process tree memory stop")
                    if time.time() - started > 1800: raise TimeoutError("finite fit deadline exceeded")
                    try: process.wait(timeout=1)
                    except subprocess.TimeoutExpired: pass
            except BaseException as error:
                failure = str(error)
                try: os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError: pass
                try: process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL); process.wait()
                raise
            finally:
                execution = dict(argv=argv, cwd=str(REPO), started=started, ended=time.time(), exit_code=process.returncode, signal=-process.returncode if process.returncode is not None and process.returncode < 0 else None, timeout_seconds=1800, failure=failure)
                save(out / "execution.json", execution)
        check_hashes(context["identities"])
        node = read_json(out / "node-receipt.json")
        validate_node_receipt(node, context, out)
        decoded = [json.loads(line) for line in (out / "decoded.jsonl").read_text().splitlines()]
        observations, summary = summarize(context, decoded)
        if node.get("requests") != summary["requests"] or node.get("batches") != (summary["requests"] + 7) // 8: raise ValueError("wrong execution counts")
        summary["parity"] = node["parity"]
        summary["export_diagnostics"] = context["export_diagnostics"]
        summary["passed"] &= process.returncode == 0 and (runtime == "float" or node["parity"].get("passed") is True)
        with (out / "rows.jsonl").open("x") as f:
            for row in observations: f.write(json.dumps(row, ensure_ascii=False, allow_nan=False) + "\n")
        save(out / "summary.json", summary)
        outputs = {p.name: digest(p) for p in out.iterdir() if p.is_file()}
        receipt = dict(version="modernbert-rare-heads-fit-v1", scope="actual-model-training-fit", name=name, runtime=runtime, protocol={"path":context["protocol"],"sha256":context["identities"][context["protocol"]]}, identities_before=context["identities"], identities_after={p:digest(p) for p in context["identities"]}, execution=execution, outputs=outputs, counts={k:summary[k] for k in ("observations","positives","absents","requests")}, parity=node["parity"], export_diagnostics=context["export_diagnostics"], passed=summary["passed"])
        save(out / "receipt.json", receipt)
        if not summary["passed"]: raise RuntimeError("training-fit/parity gate failed; evidence preserved at " + str(out))
        return receipt


def engine(context_path):
    context = read_json(context_path); check_hashes(context["identities"]); resources()
    def watch():
        while True:
            threading.Event().wait(1)
            try: resources()
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
