"""CPU export of a finished run of finetune_modernbert_batched.py into a folder that docs/js/neural.js makeReader reads through Transformers.js, with
dtype q8 and graphOptimizationLevel basic, as the published docs/model/neural/modernbert is read. For experiment arms: it takes any head layout, from the run's reader.json.

python training/neural/parity/arm_export.py --work RUN --data DATA --out FOLDER [--epoch N] [--allow-partial]

Steps: PyTorch (eager, FP32) -> float ONNX, checked against PyTorch -> dynamic q8 -> the weight-only conversion -> shards under 90 MiB.
Checks, written to FOLDER/arm_receipt.json:
  - SDPA, the training attention, against eager, the export attention, within the tolerance;
  - Python ONNX Runtime against Node on the fixture cases, within the tolerance, decoded output identical (modernbert_parity.mjs checkParity, the runtime check of the published model);
  - decoded action, classes, tags and cuts of PyTorch against Node through makeReader, on about 20 texts of varied length, with the margin of each difference.
Exit codes: 0 all of it holds; 1 an export or runtime check failed; 2 the folder is written and the runtime holds, but PyTorch and Node decode some text differently
(8-bit weights can flip an answer whose logits are close; the published model has 7 such changes on its fixtures). Those are listed, never hidden.
The full Python, Node and browser gate of the final model is not this file (MODERNBERT_EXPORT_PLAN.md).
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tempfile

os.environ["CUDA_VISIBLE_DEVICES"] = ""   # on the CPU: it may run beside a training
HERE = Path(__file__).resolve().parent
NEURAL = HERE.parent
REPO = NEURAL.parents[1]
sys.path.insert(0, str(NEURAL))
import numpy as np
import torch

from export_modernbert import EXECUTION_POLICY, decoded, graph_files, pack_external
from finetune_modernbert import BASE, REVISION, ModernReader, sha
from finetune_modernbert_batched import atomic_json
from finetune_roles import Layout, read
from modernbert_tokenization import POLICY, batch, prepare
from modernbert_weight_only import MODE, convert, initializer_hashes

ATOL, RTOL = 1e-3, 1e-3
# Changing these two changes what a decode means; the others are the record of how the weights were made.
DECODE_SOURCES = ("modernbert_tokenization.py", "finetune_roles.py")

NODE_RUNNER = r"""
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const { folder, references, texts, out, laptop, neural, parity, logic } = JSON.parse(readFileSync(process.env.ARM_NODE_JOB, 'utf8'));
const { checkParity, EXECUTION_POLICY } = await import(pathToFileURL(parity).href);
const require = createRequire(laptop);
const T = require('@huggingface/transformers'), ort = require('onnxruntime-node');
const version = JSON.parse(readFileSync(join(dirname(require.resolve('@huggingface/transformers')), '../package.json'), 'utf8')).version;
if (version !== '3.8.1') throw new Error('Transformers.js 3.8.1 is required, found ' + version);
globalThis.SOPKit = require(logic);
const N = require(neural);
const cache = mkdtempSync(join(tmpdir(), 'arm-node-'));
T.env.allowRemoteModels = false; T.env.allowLocalModels = true;
T.env.localModelPath = dirname(folder) + '/'; T.env.useBrowserCache = false;
// Transformers.js 3.8 needs its FS cache path to resolve external tensor files.
T.env.useFSCache = true; T.env.cacheDir = cache;
let model;
try {
  const name = basename(folder), tokenizer = await T.AutoTokenizer.from_pretrained(name, { local_files_only: true });
  model = await T.AutoModel.from_pretrained(name, { device: 'cpu', dtype: 'q8', local_files_only: true,
    session_options: { graphOptimizationLevel: EXECUTION_POLICY.graph_optimization } });
  if (model.config.model_type !== 'modernbert') throw new Error('Not read as a ModernBERT model');
  const checks = await checkParity(T, tokenizer, model, N, JSON.parse(readFileSync(references, 'utf8')));
  const r = N.makeReader(T, tokenizer, model), reads = [];
  for (const text of texts) {
    const one = (await r.readMany([text]))[0], p128 = r.prepare(text, 128), p512 = r.prepare(text, 512);
    const spans = {};
    for (const [key, list] of Object.entries(one.spans)) spans[key] = list.map(s => [p128.ws.findIndex(w => w.start === s.start), p128.ws.findIndex(w => w.end === s.end) + 1]);
    reads.push({ text, ids128: p128.ids, ids512: p512.ids, act: one.acts[0].label,
      classes: Object.fromEntries(Object.entries(one.classes).filter(([, v]) => v.value != null).map(([k, v]) => [k, v.value])),
      tags: one.tags, spans, cut: (await r.cut(text)).map(x => [x.c0, x.c1]), cutInfo: r.cutInfo(text) });
  }
  writeFileSync(out, JSON.stringify({ checks, reads, runtime: { transformers_js: version, onnxruntime: ort.env.versions.node, node: process.version, backend: 'cpu' } }));
} finally {
  try { if (model) await model.dispose(); } finally { rmSync(cache, { recursive: true, force: true }); }
}
"""


def load_run(a):
    """The weights and the description of a finished run. A dry run is refused unless asked for; epochs are weights-only files of that run."""
    complete = json.loads((a.work / "complete.json").read_text())
    if not complete.get("complete"): raise SystemExit("The run is not complete")
    if not complete["full_schedule"] and not a.allow_partial:
        raise SystemExit(f"The run stopped by --max-updates {complete['max_updates']}: it is a dry run, not an arm. --allow-partial exports it anyway, marked as such")
    meta = complete["metadata"]
    if meta["base"] != BASE or meta["revision"] != REVISION: raise ValueError("Not a run from the pinned base model")
    for name, expected in meta["data"]["files"].items():
        if sha(a.data / name) != expected: raise ValueError("Generated training data changed: " + name)
    for name in DECODE_SOURCES:
        if sha(NEURAL / name) != meta["sources"][name]: raise ValueError("Source changed since training: " + name)
    source_changes = sorted(n for n, want in meta["sources"].items() if sha(NEURAL / n) != want)
    path = a.work / (f"epoch_{a.epoch}.pt" if a.epoch else "checkpoint.pt")
    ck = torch.load(path, map_location="cpu", weights_only=False)
    if ck["metadata"]["settings"] != meta["settings"] or ck["metadata"]["data"] != meta["data"]: raise ValueError(path.name + " does not belong to this run")
    if a.epoch and ck["epoch"] != a.epoch: raise ValueError("Epoch file holds epoch " + str(ck["epoch"]))
    where = {"epoch": ck["epoch"], "update": ck["update"]} if a.epoch else {"epoch": ck["state"]["epoch"], "update": ck["state"]["update"]}
    if not a.epoch and ck["state"]["update"] != complete["state"]["update"]: raise ValueError("Checkpoint and complete.json disagree")
    for key, value in ck["model"].items():
        if not torch.isfinite(value).all(): raise ValueError("Non-finite weight: " + key)
    provenance = {k: meta[k] for k in ("base", "revision", "settings", "tokenization", "sources")}
    provenance["completed"] = dict(where, total=complete["state"]["total"], full_schedule=complete["full_schedule"], max_updates=complete["max_updates"], source_file=path.name, source_changes_since_training=source_changes)
    return ck["model"], meta, provenance, sha(path), source_changes


def export_float(model, tok, path):
    _, sample = batch(tok, ["draw a circle", "connect A to B with a dashed arrow"], 128)
    x = tuple(torch.tensor(sample[k], dtype=torch.long) for k in ("input_ids", "attention_mask"))
    with torch.no_grad():
        torch.onnx.export(model, x, str(path), dynamo=False, opset_version=17,
                          input_names=["input_ids", "attention_mask"], output_names=["token_logits", "seq_logits", "cut_logits"],
                          dynamic_axes={"input_ids": {0: "batch", 1: "sequence"}, "attention_mask": {0: "batch", 1: "sequence"},
                                        "token_logits": {0: "batch", 1: "sequence"}, "seq_logits": {0: "batch"}, "cut_logits": {0: "batch", 1: "sequence"}})


def inventory(graph):
    """What the weight-only conversion must find: counted from this graph, so that it holds for any head layout, and checked against the float graph it came from."""
    return sum(n.op_type == "MatMulInteger" for n in graph.graph.node), sum(n.op_type == "DynamicQuantizeLinear" for n in graph.graph.node)


def float_matmul_weights(graph):
    initial = {t.name for t in graph.graph.initializer}
    # A linear layer on one vector per text (pre, act, classes) exports as Gemm; on tokens as MatMul. Dynamic quantization turns both into MatMulInteger.
    return sum(n.op_type in ("MatMul", "Gemm") and n.input[1] in initial for n in graph.graph.node)


def fixture_rows(fixtures, extras):
    """The rows of export_modernbert.py, which checkParity requires (single-00 to single-15 and two padded batches), and the extra texts at both caps."""
    cases = fixtures["cases"] + [{"text": r["text"], "limit": 512} for r in fixtures["cases"] if r["limit"] == 128]
    rows = [{"id": f"single-{i:02d}", "texts": [case["text"]], "limit": case["limit"]} for i, case in enumerate(cases)]
    rows += [{"id": "batch-request-128", "texts": fixtures["batch"]["texts"], "limit": 128},
             {"id": "batch-message-512", "texts": [fixtures["cases"][6]["text"], fixtures["cases"][3]["text"], "draw A; connect A to B"], "limit": 512},
             {"id": "request-view-of-long-message", "texts": [fixtures["cases"][6]["text"]], "limit": 128}]
    for i, text in enumerate(extras):
        rows += [{"id": f"extra-{i:02d}-{limit}", "texts": [text], "limit": limit} for limit in (128, 512)]
    return rows


def varied_texts(data, tok, fixtures):
    """About 20 texts of varied length: the alignment fixtures, the shortest common command, and whole messages of the run's data at even steps of length, up to the longest."""
    messages = sorted((r["text"] for r in read(data / "cut_train.jsonl")), key=lambda t: (len(t), t))
    steps = [messages[min(len(messages) - 1, int(q * len(messages)))] for q in (.1, .3, .5, .6, .7, .8, .9, .95, .99)] + [messages[-1]]
    extras = ["draw a red circle."] + steps
    texts = [c["text"] for c in fixtures["cases"] if c["limit"] > 5] + fixtures["batch"]["texts"]
    seen, out = set(), []
    for t in extras + texts:
        if t not in seen: seen.add(t); out.append(t)
    return extras, out


def torch_read(model, tok, text, layout):
    """Decode by the same rule as the reader: the request view at 128 pieces, the cut at 512."""
    def outputs(limit):
        p = prepare(tok, text, limit)
        x = {"input_ids": torch.tensor([p["ids"]], dtype=torch.long), "attention_mask": torch.ones((1, len(p["ids"])), dtype=torch.long)}
        with torch.no_grad(): return p, [t.numpy() for t in model(**x)]
    p128, out128 = outputs(128)
    p512, out512 = outputs(512)
    read128, read512 = decoded(out128, p128, layout), decoded(out512, p512, layout)
    return {"text": text, "ids128": p128["ids"], "ids512": p512["ids"], "act": read128["act"], "classes": read128["classes"], "tags": read128["tags"],
            "spans": read128["spans"], "cut": read512["cut"], "cutInfo": read512["cutInfo"]}, (p128, out128, p512, out512)


def margin(logits, i, j):
    """How close two answers are in logits: how much the q8 weights would have to move this answer."""
    return round(abs(float(logits[i]) - float(logits[j])), 4)


def describe_difference(key, want, got, logits, layout):
    """The logits of the PyTorch reading at the place where Node differs."""
    (p128, out128, _, out512) = logits
    if key == "act":
        a, b = layout.acts.index(want), layout.acts.index(got)
        return {"key": key, "torch": want, "node": got, "margin": margin(out128[1][0], a, b)}
    if key.startswith("class:"):
        name = key[6:]; h = [k for k, _ in layout.classes].index(name); s = layout.offsets[h]; values = layout.classes[h][1]
        a, b = values.index(want, 1) if want is not None else 0, values.index(got, 1) if got is not None else 0
        return {"key": key, "torch": want, "node": got, "margin": margin(out128[1][0], s + a, s + b)}
    if key.startswith("tag:"):
        w = int(key[4:]); t = p128["first"][w]
        return {"key": key, "torch": want, "node": got, "margin": margin(out128[0][0, t], layout.tags.index(want), layout.tags.index(got))}
    return {"key": key, "torch": want, "node": got}


def compare(torch_reads, node_reads, layout, logits):
    counts = {k: {"agree": 0, "total": 0} for k in ("act", "classes", "tags", "cuts", "pieces")}
    differences = []
    per_text = []
    for want, got, lg in zip(torch_reads, node_reads, logits):
        if want["text"] != got["text"]: raise ValueError("Node read another text")
        found = []
        if want["ids128"] != got["ids128"] or want["ids512"] != got["ids512"]: found.append({"key": "pieces"})
        counts["pieces"]["total"] += 1; counts["pieces"]["agree"] += want["ids128"] == got["ids128"] and want["ids512"] == got["ids512"]
        counts["act"]["total"] += 1; counts["act"]["agree"] += want["act"] == got["act"]
        if want["act"] != got["act"]: found.append(describe_difference("act", want["act"], got["act"], lg, layout))
        for k, _ in layout.classes:
            counts["classes"]["total"] += 1; same = want["classes"].get(k) == got["classes"].get(k); counts["classes"]["agree"] += same
            if not same: found.append(describe_difference("class:" + k, want["classes"].get(k), got["classes"].get(k), lg, layout))
        for w, (a, b) in enumerate(zip(want["tags"], got["tags"])):
            counts["tags"]["total"] += 1; counts["tags"]["agree"] += a == b
            if a != b: found.append(describe_difference(f"tag:{w}", a, b, lg, layout))
        if len(want["tags"]) != len(got["tags"]): found.append({"key": "tags-length"})
        same_cut = want["cut"] == got["cut"] and want["cutInfo"] == got["cutInfo"]
        counts["cuts"]["total"] += 1; counts["cuts"]["agree"] += same_cut
        if not same_cut: found.append({"key": "cut", "torch": want["cut"], "node": got["cut"], "torch_info": want["cutInfo"], "node_info": got["cutInfo"]})
        per_text.append({"chars": len(want["text"]), "pieces": len(want["ids512"]), "words": len(want["tags"]), "agree": not found})
        if found: differences.append({"text": want["text"][:80], "chars": len(want["text"]), "differences": found})
    return counts, differences, per_text


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--work", required=True, type=Path, help="a finished run of finetune_modernbert_batched.py")
    ap.add_argument("--data", required=True, type=Path, help="the run's data folder")
    ap.add_argument("--out", required=True, type=Path, help="a new folder, outside the repository")
    ap.add_argument("--epoch", type=int, help="export epoch_N.pt instead of the last weights")
    ap.add_argument("--allow-partial", action="store_true", help="export a dry run; marked in the config and the receipt")
    a = ap.parse_args()
    if a.out.resolve().is_relative_to(REPO): raise SystemExit("Arms export outside the repository; only an adopted one enters docs/model")
    if a.out.exists(): raise SystemExit("Use a new output folder")
    state, meta, provenance, weights_sha, source_changes = load_run(a)
    from transformers import AutoTokenizer, ModernBertConfig, ModernBertModel
    import onnx
    import onnxruntime as ort
    from onnxruntime.quantization import QuantType, quantize_dynamic
    R = json.loads((a.data / "reader.json").read_text()); layout = Layout(R)
    if sha(a.data / "reader.json") != meta["data"]["files"]["reader.json"]: raise ValueError("Reader layout hash mismatch")

    def reader(attn):
        cfg = ModernBertConfig.from_pretrained(a.work / "encoder_config", local_files_only=True)
        cfg.reference_compile = False; cfg._attn_implementation = attn
        m = ModernReader(ModernBertModel(cfg), len(layout.acts), layout.class_sizes, len(layout.tags))
        m.load_state_dict(state)
        return m.float().cpu().eval(), cfg

    model, cfg = reader("eager")
    if cfg._attn_implementation != "eager" or model.encoder.config._attn_implementation != "eager": raise RuntimeError("Export uses eager attention")
    sdpa, _ = reader("sdpa")
    tok = AutoTokenizer.from_pretrained(a.work / "tokenizer", local_files_only=True)
    fixtures = json.loads((NEURAL / "fixtures/modernbert_alignment.json").read_text())
    extras, texts = varied_texts(a.data, tok, fixtures)
    rows = fixture_rows(fixtures, extras)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    build = Path(tempfile.mkdtemp(prefix=a.out.name + ".build-", dir=a.out.parent))
    try:
        float_path, quant_path = build / "model_float.onnx", build / "model_q8.onnx"
        export_float(model, tok, float_path)
        fs = ort.InferenceSession(str(float_path), providers=["CPUExecutionProvider"])
        references, maxima, sdpa_max = [], [0., 0., 0.], [0., 0., 0.]
        for row in rows:
            ps, arrays = batch(tok, row["texts"], row["limit"])
            inp = {k: np.array(v, dtype=np.int64) for k, v in arrays.items()}
            tensors = {k: torch.from_numpy(v) for k, v in inp.items()}
            with torch.no_grad(): expected, attention = [t.numpy() for t in model(**tensors)], [t.numpy() for t in sdpa(**tensors)]
            got = fs.run(None, inp)
            mask = inp["attention_mask"].astype(bool)
            for i, (g, e, s) in enumerate(zip(got, expected, attention)):
                # Padded positions carry no answer: compare the real ones (the sequence head has one row per text).
                g2, e2, s2 = (x[mask] if i != 1 else x for x in (g, e, s))
                np.testing.assert_allclose(g2, e2, atol=ATOL, rtol=RTOL, err_msg=f"{row['id']}: float ONNX against PyTorch")
                np.testing.assert_allclose(s2, e2, atol=ATOL, rtol=RTOL, err_msg=f"{row['id']}: SDPA against eager")
                maxima[i] = max(maxima[i], float(np.max(np.abs(g2 - e2)))); sdpa_max[i] = max(sdpa_max[i], float(np.max(np.abs(s2 - e2))))
            float_decoded = []
            for b, p in enumerate(ps):
                d = decoded([g[b:b + 1] for g in got], p, layout)
                if d != decoded([e[b:b + 1] for e in expected], p, layout): raise ValueError(row["id"] + ": float ONNX decodes differently from PyTorch")
                float_decoded.append(d)
            references.append(dict(row, inputs=arrays,
                prepared=[{k: list(map(list, p[k].items())) if k == "first" else p[k] for k in ("ids", "first", "truncated", "unreadFrom")} for p in ps],
                float_decoded=float_decoded))
        del fs
        quantize_dynamic(str(float_path), str(quant_path), per_channel=True, reduce_range=True, weight_type=QuantType.QUInt8, use_external_data_format=True)
        quant = onnx.load(quant_path, load_external_data=True)
        blocks, quantizers = inventory(quant)
        float_blocks = float_matmul_weights(onnx.load(float_path, load_external_data=False))
        if not blocks or blocks != float_blocks: raise ValueError(f"The q8 graph holds {blocks} integer MatMul blocks, the float graph {float_blocks} MatMul or Gemm on a weight")
        candidate, conversion = convert(quant, expected_blocks=blocks, expected_quantizers=quantizers)
        del quant
        a.out.mkdir(); (a.out / "onnx").mkdir()
        chunks = pack_external(candidate, a.out / "onnx/model_quantized.onnx")
        if initializer_hashes(onnx.load(a.out / "onnx/model_quantized.onnx", load_external_data=True)) != conversion["initializer_hashes"]:
            raise ValueError("Packed initializer values changed")
        del candidate
        float_files = graph_files(float_path)
    finally:
        shutil.rmtree(build, ignore_errors=True)
    tok.save_pretrained(a.out)
    train_ids = [r["id"] for r in read(a.data / "cut_train.jsonl")]
    config = cfg.to_dict(); config["architectures"] = ["ModernBertModel"]
    config["reader"] = dict(R, max_length=128, tokenization=POLICY, export_mode=MODE, arithmetic="8-bit weights, float32 arithmetic", execution_policy=EXECUTION_POLICY,
                            training_manifest=dict(meta["data"], message_ids=sorted(train_ids), message_ids_sha256=hashlib.sha256(("\n".join(sorted(train_ids)) + "\n").encode()).hexdigest()),
                            training_provenance=provenance, cut=dict(R.get("cut", {}), max_length=512))
    if "canvas" in meta["settings"]:   # arm M4: trained with the second read (--canvas-rows); docs/js/neural.js reads the drawing only for a reader with this
        config["reader"]["drawing"] = dict(format="drawing-lines-v1", max_length=meta["settings"]["canvas"]["cap"], canvas_rows=meta["settings"]["canvas"])
    config["transformers.js_config"] = {"use_external_data_format": len(chunks)}
    atomic_json(a.out / "config.json", config)
    atomic_json(a.out / "conversion.json", conversion)
    options = ort.SessionOptions(); options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
    qs = ort.InferenceSession(str(a.out / "onnx/model_quantized.onnx"), options, providers=["CPUExecutionProvider"])
    changes = []
    for ref in references:
        ps, arrays = batch(tok, ref["texts"], ref["limit"])
        got = qs.run(None, {k: np.array(v, dtype=np.int64) for k, v in arrays.items()})
        ref.update(output_shapes=[list(g.shape) for g in got], outputs=[g.tolist() for g in got],
                   decoded=[decoded([g[b:b + 1] for g in got], p, layout) for b, p in enumerate(ps)])
        if ref["decoded"] != ref["float_decoded"]: changes.append(ref["id"])
    del qs
    atomic_json(a.out / "references.json", {"schema": "modernbert-reference-v2", "export_mode": MODE, "execution_policy": EXECUTION_POLICY, "cases": references})
    atomic_json(a.out / "export_parity.json", {"float_max_abs": maxima, "sdpa_vs_eager_max_abs": sdpa_max, "cases_where_q8_decodes_differently_from_float": changes})
    torch_reads, logits = [], []
    for text in texts:
        r, lg = torch_read(model, tok, text, layout)
        torch_reads.append(r); logits.append(lg)
    del model, sdpa, state
    with tempfile.TemporaryDirectory(prefix="arm-node-job-") as job:
        out = Path(job) / "node.json"
        spec = Path(job) / "job.json"
        spec.write_text(json.dumps({"folder": str(a.out.resolve()), "references": str(a.out.resolve() / "references.json"), "texts": texts, "out": str(out),
            "laptop": str(REPO / "training/laptop/package.json"), "neural": str(REPO / "docs/js/neural.js"), "logic": str(REPO / "docs/js/logic.js"), "parity": str(NEURAL / "modernbert_parity.mjs")}))
        env = dict(os.environ, ARM_NODE_JOB=str(spec))
        done = subprocess.run(["node", "--input-type=module", "-e", NODE_RUNNER], env=env, cwd=job, capture_output=True, text=True)
        if done.returncode:
            print(done.stdout[-2000:], done.stderr[-4000:], file=sys.stderr)
            raise SystemExit("Node did not read the folder through makeReader, or its numbers differ from Python ONNX Runtime")
        node = json.loads(out.read_text())
    counts, differences, per_text = compare(torch_reads, node["reads"], layout, logits)
    agree = not differences
    files = {str(p.relative_to(a.out)): {"sha256": sha(p), "bytes": p.stat().st_size} for p in sorted(a.out.rglob("*")) if p.is_file()}
    receipt = {"schema": "arm-export-receipt-v1", "passed": agree, "rule": "passed = PyTorch and Node decode every text the same; the runtime checks before it have already held",
               "weights": {"sha256": weights_sha, **provenance["completed"]}, "export_mode": MODE, "execution_policy": EXECUTION_POLICY,
               "torch_vs_node": {"texts": len(texts), "counts": counts, "differences": differences, "per_text": per_text},
               "python_ort_vs_node": node["checks"], "float_vs_torch_max_abs": maxima, "sdpa_vs_eager_max_abs": sdpa_max, "tolerance": {"atol": ATOL, "rtol": RTOL},
               "cases_where_q8_decodes_differently_from_float": changes, "conversion": {"blocks": blocks, "quantizers": quantizers},
               "float_graph_files": float_files, "shards": chunks, "files": files, "source_changes_since_training": source_changes,
               "runtime": {**node["runtime"], "python": platform.python_version(), "python_onnxruntime": ort.__version__}}
    atomic_json(a.out / "arm_receipt.json", receipt)
    print(json.dumps({"folder": str(a.out), "passed": agree, "full_schedule": provenance["completed"]["full_schedule"], "update": provenance["completed"]["update"],
                      "texts": len(texts), "counts": counts, "differences_in_texts": len(differences), "shards": chunks, "blocks": blocks, "quantizers": quantizers,
                      "float_max_abs": maxima, "sdpa_max_abs": sdpa_max, "node_max_abs": node["checks"]["max_abs"]}))
    return 0 if agree else 2


if __name__ == "__main__": sys.exit(main())
