"""CPU export of a completed fixed run; never publish partial/pilot weights.

python export_modernbert.py --work CACHE/completed-run --data CACHE/roles \
    --source-artifact CACHE/failed/modernbert --float-graph CACHE/model_float.onnx \
    --out CACHE/new/modernbert
The output is kept outside git until the coordinator accepts parity evidence.
"""
import argparse
import hashlib
import json
import platform
from pathlib import Path
import subprocess

import numpy as np
import torch

from finetune_modernbert import ModernReader, BASE, REVISION, sha, write_json
from finetune_roles import Layout, decode
from modernbert_tokenization import POLICY, prepare, batch
from modernbert_weight_only import MODE, convert, initializer_hashes

CHUNK_BYTES = 90 * 1024 ** 2
GIT_LIMIT = 100 * 1024 ** 2
EXECUTION_POLICY = {"graph_optimization": "basic", "arithmetic": "float32", "weight_storage": "uint8"}
FAILED_DYNAMIC_FILES = {
    "model_quantized.onnx": {"sha256": "519389f976151b579018284f21a6a529d1263006758f371e2601eac6bfaf8465", "bytes": 1561037},
    "model_quantized.onnx_data": {"sha256": "541c6b319dc6a6a9e2660d9aa5ed70fd87c1a82dbd2001608c788e72e899ee47", "bytes": 93974180},
    "model_quantized.onnx_data_1": {"sha256": "465d747105a1d055be9a9afd3bb1a70ef967b6aa9737141c93b4dc2ac55ff14d", "bytes": 56133888},
}


def graph_files(path):
    """Bind a graph and each external initializer file, without rewriting it."""
    import onnx
    path = Path(path)
    names = {path.name}
    for tensor in onnx.load(path, load_external_data=False).graph.initializer:
        for item in tensor.external_data:
            if item.key == "location":
                location = Path(item.value)
                if location.is_absolute() or ".." in location.parts: raise ValueError("Unsafe external tensor path")
                names.add(item.value)
    return {name: {"sha256": sha(path.parent / name), "bytes": (path.parent / name).stat().st_size} for name in sorted(names)}


def pack_external(model_path, out_path, chunk_bytes=CHUNK_BYTES):
    """Pack complete tensors; never split a tensor to evade hosting bounds."""
    import onnx
    from onnx import external_data_helper as external
    import copy
    graph = copy.deepcopy(model_path) if isinstance(model_path, onnx.ModelProto) else onnx.load(model_path, load_external_data=True)
    chunks, handle, used = [], None, 0
    try:
        for tensor in graph.graph.initializer:
            # Shape inference needs inline Constant attributes and small shape tensors.
            # Externalize weights, keeping every tensor whole.
            if not tensor.HasField("raw_data") or len(tensor.raw_data) < 1024: continue
            raw = tensor.raw_data
            if len(raw) > chunk_bytes: raise ValueError(f"Tensor {tensor.name!r} exceeds 90 MiB: {len(raw)}")
            if handle is None or used + len(raw) > chunk_bytes:
                if handle: handle.close()
                name = out_path.name + "_data" + ("_" + str(len(chunks)) if chunks else "")
                chunks.append(name); handle = open(out_path.parent / name, "xb"); used = 0
            handle.write(raw)
            external.set_external_data(tensor, location=chunks[-1], offset=used, length=len(raw))
            tensor.ClearField("raw_data"); used += len(raw)
        if handle: handle.close(); handle = None
        onnx.save_model(graph, out_path)
        for p in [out_path] + [out_path.parent / n for n in chunks]:
            if p.stat().st_size >= GIT_LIMIT: raise ValueError(f"Artifact exceeds hosting limit: {p}")
        onnx.checker.check_model(str(out_path))
    finally:
        if handle: handle.close()
    return chunks


def decoded(outputs, p, layout):
    tl, sl, cl = outputs
    d = decode(tl[0], sl[0], p["first"], len(p["ws"]), layout)
    spans, current, unread = [], None, p["unreadFrom"]
    for i, word in enumerate(p["ws"]):
        token = p["first"].get(i)
        tag = "O" if token is None else "OBI"[int(np.argmax(cl[0, token]))]
        if token is None and p["truncated"] and current is not None:
            # NeuralKit.makeReader.cut drops a span still open at the cap. Its
            # omitted suffix starts at that span, before prepare.unreadFrom.
            unread = min(unread, current[0]); spans.pop()
        if tag == "O": current = None
        elif tag == "I" and current is not None: current[1] = word["end"]
        else:
            current = [word["start"], word["end"]]; spans.append(current)
    d["cut"] = spans
    d["cutInfo"] = {"truncated": p["truncated"], "unreadFrom": unread}
    return d


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--work", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--source-artifact", required=True, type=Path, help="Retained failed dynamic-q8 model directory")
    ap.add_argument("--float-graph", required=True, type=Path, help="Existing float ONNX; revalidated against the completed checkpoint")
    ap.add_argument("--checkpoint-sha256", required=True, help="Immutable completed checkpoint SHA256")
    ap.add_argument("--run-node", action="store_true", help="Run native parity after writing the unaccepted candidate")
    a = ap.parse_args()
    repo = Path(__file__).resolve().parents[2]
    if a.out.resolve().is_relative_to(repo): raise SystemExit("Export outside git; coordinator installs finalized artifacts")
    if a.out.exists(): raise SystemExit("Use a new output directory; never overwrite an accepted artifact")
    if sha(a.work / "checkpoint.pt") != a.checkpoint_sha256: raise ValueError("Completed checkpoint hash mismatch")
    if graph_files(a.source_artifact / "onnx/model_quantized.onnx") != FAILED_DYNAMIC_FILES:
        raise ValueError("Retained dynamic graph/shard identity mismatch")
    complete = json.loads((a.work / "complete.json").read_text())
    if not complete.get("complete") or complete["state"]["request_pos"] != 54584:
        raise SystemExit("One complete ALL epoch is required before export")
    from transformers import ModernBertConfig, ModernBertModel, AutoTokenizer
    import onnxruntime as ort
    import onnx
    if ort.__version__ != "1.29.0": raise ValueError("Canonical Python reference requires ONNX Runtime 1.29.0")
    ck = torch.load(a.work / "checkpoint.pt", map_location="cpu", weights_only=False)
    meta = ck["metadata"]
    if meta["base"] != BASE or meta["revision"] != REVISION or ck["state"]["request_pos"] != 54584:
        raise ValueError("Checkpoint is not the preregistered completed ModernBERT run")
    if complete["metadata"] != meta or ck["state"]["update"] != 3412 or ck["state"]["accumulated"] != 0 or not ck["state"].get("pilot", {}).get("passed"):
        raise ValueError("Completed epoch/checkpoint state does not agree")
    for name, expected in meta["sources"].items():
        if sha(Path(__file__).with_name(name)) != expected: raise ValueError("Training source changed: " + name)
    for name, expected in meta["data"]["files"].items():
        if sha(a.data / name) != expected: raise ValueError("Generated training data changed: " + name)
    train_ids = [json.loads(line)["id"] for line in (a.data / "cut_train.jsonl").read_text().splitlines() if line.strip()]
    if len(train_ids) != 24698 or len(set(train_ids)) != 24698: raise ValueError("Actual ALL message IDs are not complete")
    provenance = {k: meta[k] for k in ("base", "revision", "settings", "tokenization", "sources")}
    provenance["completed"] = {"request_pos": 54584, "update": 3412, "accumulated": 0, "pilot_passed": True}
    del ck["optimizer"], ck["gradients"]
    # Load the exact hashed generated layout, never infer labels from another model.
    reader_path = a.data / "reader.json"
    if sha(reader_path) != meta["data"]["files"]["reader.json"]: raise ValueError("Reader layout hash mismatch")
    R = json.loads(reader_path.read_text()); layout = Layout(R)
    cfg = ModernBertConfig.from_pretrained(a.work / "encoder_config", local_files_only=True)
    cfg.reference_compile = False; cfg._attn_implementation = "eager"
    model = ModernReader(ModernBertModel(cfg), len(layout.acts), layout.class_sizes, len(layout.tags))
    model.load_state_dict(ck["model"]); del ck
    model.float().cpu().eval()
    tok = AutoTokenizer.from_pretrained(a.work / "tokenizer", local_files_only=True)
    fixtures = json.loads(Path(__file__).with_name("fixtures").joinpath("modernbert_alignment.json").read_text())
    float_path = a.float_graph
    quant_path = a.source_artifact / "onnx/model_quantized.onnx"
    source_config = json.loads((a.source_artifact / "config.json").read_text())
    if source_config["reader"]["training_provenance"] != provenance:
        raise ValueError("Retained dynamic artifact does not describe this completed run")
    # Revalidate the existing float export; no source graph or failed evidence is overwritten.
    fs = ort.InferenceSession(str(float_path), providers=["CPUExecutionProvider"])
    references, maxima = [], [0., 0., 0.]
    cases = fixtures["cases"] + [{"text": r["text"], "limit": 512} for r in fixtures["cases"] if r["limit"] == 128]
    rows = [{"id": f"single-{i:02d}", "texts": [case["text"]], "limit": case["limit"]} for i, case in enumerate(cases)]
    rows += [{"id": "batch-request-128", "texts": fixtures["batch"]["texts"], "limit": 128},
             {"id": "batch-message-512", "texts": [fixtures["cases"][6]["text"], fixtures["cases"][3]["text"], "draw A; connect A to B"], "limit": 512},
             {"id": "request-view-of-long-message", "texts": [fixtures["cases"][6]["text"]], "limit": 128}]
    for row in rows:
        ps, arrays = batch(tok, row["texts"], row["limit"])
        inp = {k: np.array(v, dtype=np.int64) for k, v in arrays.items()}
        with torch.no_grad(): expected = [t.numpy() for t in model(**{k: torch.from_numpy(v) for k, v in inp.items()})]
        got = fs.run(None, inp)
        for i, (g, e) in enumerate(zip(got, expected)):
            np.testing.assert_allclose(g, e, atol=1e-3, rtol=1e-3)
            maxima[i] = max(maxima[i], float(np.max(np.abs(g - e))))
        float_decoded = []
        for b, p in enumerate(ps):
            d = decoded([g[b:b + 1] for g in got], p, layout)
            if d != decoded([e[b:b + 1] for e in expected], p, layout): raise ValueError("Float ONNX decoded fixture mismatch")
            float_decoded.append(d)
        references.append(dict(row, inputs=arrays,
            prepared=[{k: list(map(list, p[k].items())) if k == "first" else p[k] for k in ("ids", "first", "truncated", "unreadFrom")} for p in ps],
            float_decoded=float_decoded))
    del fs, model
    candidate, conversion = convert(onnx.load(quant_path, load_external_data=True))
    a.out.mkdir(parents=True); (a.out / "onnx").mkdir()
    chunks = pack_external(candidate, a.out / "onnx/model_quantized.onnx")
    if initializer_hashes(onnx.load(a.out / "onnx/model_quantized.onnx", load_external_data=True)) != conversion["initializer_hashes"]:
        raise ValueError("Packed initializer values changed")
    del candidate
    tok.save_pretrained(a.out)
    config = cfg.to_dict(); config["architectures"] = ["ModernBertModel"]
    config["reader"] = dict(R, max_length=128, tokenization=POLICY)
    config["reader"]["export_mode"] = MODE
    config["reader"]["arithmetic"] = "8-bit weights, float32 arithmetic"
    config["reader"]["execution_policy"] = EXECUTION_POLICY
    config["reader"]["training_manifest"] = dict(meta["data"], message_ids=sorted(train_ids),
        message_ids_sha256=hashlib.sha256(("\n".join(sorted(train_ids)) + "\n").encode()).hexdigest())
    config["reader"]["training_provenance"] = provenance
    config["reader"]["cut"] = dict(R.get("cut", {}), max_length=512)
    config["transformers.js_config"] = {"use_external_data_format": len(chunks)}
    write_json(a.out / "config.json", config)
    options = ort.SessionOptions()
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
    qs = ort.InferenceSession(str(a.out / "onnx/model_quantized.onnx"), options, providers=["CPUExecutionProvider"])
    changes = []
    for ref in references:
        ps, arrays = batch(tok, ref["texts"], ref["limit"])
        inp = {k: np.array(v, dtype=np.int64) for k, v in arrays.items()}
        got = qs.run(None, inp)
        ref.update(output_shapes=[list(g.shape) for g in got], outputs=[g.tolist() for g in got],
                   decoded=[decoded([g[b:b + 1] for g in got], p, layout) for b, p in enumerate(ps)])
        if ref["decoded"] != ref["float_decoded"]: changes.append({"id": ref["id"], "float": ref["float_decoded"], "selected": ref["decoded"]})
    del qs
    required = [str(p.relative_to(a.out)) for p in sorted(a.out.rglob("*")) if p.is_file()]
    repo = Path(__file__).resolve().parents[2]
    source_names = ["export_modernbert.py", "modernbert_weight_only.py", "modernbert_parity.mjs", "check_modernbert.mjs",
                    "check_modernbert_browser.py", "check_modernbert_browser.mjs", "finalize_modernbert_export.mjs",
                    "modernbert_tokenization.py", "finetune_modernbert.py", "finetune_roles.py", "fixtures/modernbert_alignment.json"]
    sources = {"training/neural/" + n: sha(Path(__file__).parent / n) for n in source_names}
    sources.update({n: sha(repo / n) for n in ("docs/js/neural.js", "docs/js/logic.js")})
    bindings = {"checkpoint_sha256": sha(a.work / "checkpoint.pt"), "float_graph_sha256": sha(float_path),
                "float_graph_files": graph_files(float_path), "source_dynamic_files": graph_files(quant_path),
                "source_dynamic_graph_sha256": sha(quant_path),
                "files": {n: {"sha256": sha(a.out / n), "bytes": (a.out / n).stat().st_size} for n in required}, "sources": sources}
    # Prepared arrays are independently bound even if a consumer parses/reserializes JSON.
    bindings["inputs_sha256"] = hashlib.sha256(json.dumps([{k: r[k] for k in ("id", "texts", "limit", "inputs", "prepared")} for r in references],
        sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()).hexdigest()
    float_validation = {"passed": True, "atol": 1e-3, "rtol": 1e-3, "max_abs": maxima,
                        "checkpoint_sha256": bindings["checkpoint_sha256"], "graph_sha256": bindings["float_graph_sha256"], "cases": len(references)}
    refs_path = a.out / "references.json"
    write_json(refs_path, {"schema": "modernbert-reference-v2", "export_mode": MODE, "execution_policy": EXECUTION_POLICY, "bindings": bindings,
        "runtime": {"python": platform.python_version(), "onnxruntime": ort.__version__, "providers": ["CPUExecutionProvider"], "graph_optimization_level": "basic"},
        "float_validation": float_validation, "cases": references})
    write_json(a.out / "conversion.json", conversion)
    write_json(a.out / "export_parity.json", {"float_max_abs": maxima, "selected_prediction_changes": changes})
    write_json(a.out / "export_manifest.json", {"schema": "modernbert-export-candidate-v2", "complete": False, "export_mode": MODE, "execution_policy": EXECUTION_POLICY,
        "bindings": bindings, "reference": {"file": "references.json", "sha256": sha(refs_path)},
        "conversion": conversion, "float_validation": float_validation})
    if any(p.stat().st_size >= GIT_LIMIT for p in a.out.rglob("*") if p.is_file()):
        raise ValueError("Candidate file exceeds hosting limit")
    print("Unaccepted candidate written:", a.out)
    if a.run_node:
        subprocess.run(["node", str(Path(__file__).with_name("check_modernbert.mjs")), str(a.out), str(refs_path)], check=True)


if __name__ == "__main__": main()
