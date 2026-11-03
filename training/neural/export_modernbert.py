"""CPU export of a completed fixed run; never publish partial/pilot weights.

python export_modernbert.py --work CACHE/run --data CACHE/roles --out CACHE/final/modernbert
The output is kept outside git until the coordinator accepts parity evidence.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
import torch

from finetune_modernbert import ModernReader, BASE, REVISION, sha, write_json
from finetune_roles import Layout, decode
from modernbert_tokenization import POLICY, prepare, batch

CHUNK_BYTES = 90 * 1024 ** 2
GIT_LIMIT = 100 * 1024 ** 2


def pack_external(model_path, out_path, chunk_bytes=CHUNK_BYTES):
    """Pack complete tensors; never split a tensor to evade hosting bounds."""
    import onnx
    from onnx import external_data_helper as external, numpy_helper
    graph = onnx.load(model_path, load_external_data=True)
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
    a = ap.parse_args()
    repo = Path(__file__).resolve().parents[2]
    if a.out.resolve().is_relative_to(repo): raise SystemExit("Export outside git; coordinator installs finalized artifacts")
    if a.out.exists(): raise SystemExit("Use a new output directory; never overwrite an accepted artifact")
    complete = json.loads((a.work / "complete.json").read_text())
    if not complete.get("complete") or complete["state"]["request_pos"] != 54584:
        raise SystemExit("One complete ALL epoch is required before export")
    from transformers import ModernBertConfig, ModernBertModel, AutoTokenizer
    import onnxruntime as ort
    from onnxruntime.quantization import QuantType, quantize_dynamic
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
    float_path, quant_path = a.work / "model_float.onnx", a.work / "model_q8.onnx"
    _, sample = batch(tok, ["draw a circle", "connect A to B with a dashed arrow"], 128)
    x = tuple(torch.tensor(sample[k], dtype=torch.long) for k in ("input_ids", "attention_mask"))
    with torch.no_grad():
        torch.onnx.export(model, x, str(float_path), dynamo=False, opset_version=17,
                          input_names=["input_ids", "attention_mask"], output_names=["token_logits", "seq_logits", "cut_logits"],
                          dynamic_axes={"input_ids": {0: "batch", 1: "sequence"}, "attention_mask": {0: "batch", 1: "sequence"},
                                        "token_logits": {0: "batch", 1: "sequence"}, "seq_logits": {0: "batch"}, "cut_logits": {0: "batch", 1: "sequence"}})
    fs = ort.InferenceSession(str(float_path), providers=["CPUExecutionProvider"])
    references, maxima = [], [0., 0., 0.]
    cases = fixtures["cases"] + [{"text": r["text"], "limit": 512} for r in fixtures["cases"] if r["limit"] == 128]
    for case in cases:
        p = prepare(tok, case["text"], case["limit"])
        inp = {"input_ids": np.array([p["ids"]], dtype=np.int64), "attention_mask": np.ones((1, len(p["ids"])), dtype=np.int64)}
        with torch.no_grad(): expected = [t.numpy() for t in model(**{k: torch.from_numpy(v) for k, v in inp.items()})]
        got = fs.run(None, inp)
        for i, (g, e) in enumerate(zip(got, expected)):
            np.testing.assert_allclose(g, e, atol=1e-3, rtol=1e-3)
            maxima[i] = max(maxima[i], float(np.max(np.abs(g - e))))
        if decoded(got, p, layout) != decoded(expected, p, layout): raise ValueError("Float ONNX decoded fixture mismatch")
        references.append({"text": case["text"], "limit": case["limit"], "float_decoded": decoded(got, p, layout)})
    # Batch padding is exercised independently of the single-fixture outputs.
    _, pad = batch(tok, fixtures["batch"]["texts"], 128)
    pad = {k: np.array(v, dtype=np.int64) for k, v in pad.items()}
    with torch.no_grad(): pt = model(**{k: torch.from_numpy(v) for k, v in pad.items()})
    for g, e in zip(fs.run(None, pad), pt): np.testing.assert_allclose(g, e.numpy(), atol=1e-3, rtol=1e-3)
    del fs
    quantize_dynamic(str(float_path), str(quant_path), per_channel=True, reduce_range=True,
                     weight_type=QuantType.QUInt8, use_external_data_format=True)
    a.out.mkdir(parents=True); (a.out / "onnx").mkdir()
    chunks = pack_external(quant_path, a.out / "onnx/model_quantized.onnx")
    tok.save_pretrained(a.out)
    config = cfg.to_dict(); config["architectures"] = ["ModernBertModel"]
    config["reader"] = dict(R, max_length=128, tokenization=POLICY)
    config["reader"]["training_manifest"] = dict(meta["data"], message_ids=sorted(train_ids),
        message_ids_sha256=hashlib.sha256(("\n".join(sorted(train_ids)) + "\n").encode()).hexdigest())
    config["reader"]["training_provenance"] = provenance
    config["reader"]["cut"] = dict(R.get("cut", {}), max_length=512)
    config["transformers.js_config"] = {"use_external_data_format": len(chunks)}
    write_json(a.out / "config.json", config)
    qs = ort.InferenceSession(str(a.out / "onnx/model_quantized.onnx"), providers=["CPUExecutionProvider"])
    changes = []
    for ref in references:
        p = prepare(tok, ref["text"], ref["limit"])
        inp = {"input_ids": np.array([p["ids"]], dtype=np.int64), "attention_mask": np.ones((1, len(p["ids"])), dtype=np.int64)}
        got = qs.run(None, inp)
        ref.update(ids=p["ids"], first=list(map(list, p["first"].items())), truncated=p["truncated"], unreadFrom=p["unreadFrom"],
                   outputs=[g.tolist() for g in got], decoded=decoded(got, p, layout))
        if ref["decoded"] != ref["float_decoded"]: changes.append({"text": ref["text"], "float": ref["float_decoded"], "q8": ref["decoded"]})
    refs_path = a.work / "q8_references.json"
    write_json(refs_path, references)
    result = subprocess.run(["node", str(Path(__file__).with_name("check_modernbert.mjs")), str(a.out), str(refs_path)], text=True, capture_output=True)
    write_json(a.work / "export_parity.json", {"float_max_abs": maxima, "q8_prediction_changes": changes,
                                               "node_returncode": result.returncode, "node_stdout": result.stdout, "node_stderr": result.stderr})
    print(result.stdout, result.stderr)
    if result.returncode: raise SystemExit("Python ORT/JavaScript q8 parity failed; artifact is unaccepted")
    required = ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"] + ["onnx/" + n for n in chunks]
    repo = Path(__file__).resolve().parents[2]
    write_json(a.out / "export_manifest.json", {"schema": "modernbert-export-v1", "complete": True,
        "checkpoint_sha256": sha(a.work / "checkpoint.pt"),
        "sources": {n: sha(repo / n) for n in ("training/neural/export_modernbert.py", "training/neural/check_modernbert.mjs", "docs/js/neural.js")},
        "parity": {"node_exit_code": result.returncode, "float_atol": 1e-3, "float_rtol": 1e-3},
        "files": {n: {"sha256": sha(a.out / n), "bytes": (a.out / n).stat().st_size} for n in required}})
    write_json(a.work / "export_complete.json", {"complete": True, "files": {str(p.relative_to(a.out)): {"sha256": sha(p), "bytes": p.stat().st_size} for p in sorted(a.out.rglob("*")) if p.is_file()}})


if __name__ == "__main__": main()
