"""Batched ModernBERT trainer: SOP-BERT's recipe (finetune_roles.py) on the 6 GiB card, for the arms of MODERNBERT_PARITY_PLAN.md.

finetune_modernbert.py and export_modernbert.py stay as the record of the first run; this file imports what is clean from them.
No model is downloaded (local_files_only). Data and checkpoints stay outside git. Export is parity/arm_export.py, on the CPU.

python finetune_modernbert_batched.py --data DIR --work DIR --seed 0 --gpu-uuid UUID --stop-at "YYYY-MM-DD HH:MM" [--expect-manifest FILE]
                                      [--epochs 8 --lr 6e-5 --head-lr LR --batch 32 --cut-batch 8] [--resume] [--overfit-gate] [--max-updates N]
                                      [--canvas-rows DIR [--canvas-tokens 4096]]
--canvas-rows (arm M4, the drawing as a second read): a third pass per update over DIR/canvas_train.jsonl (parity/build_canvas_rows.mjs: the request,
then the drawing's lines; B / I / O tags on the drawing's words only, the request's words unlabelled), with its own backward, tag loss only, as
many rows per batch as fit in --canvas-tokens padded tokens, cycling as the cut pass does. Without the flag nothing of it runs or is recorded.

Exit codes: 0 finished, already complete, gate passed, or stopped by --stop-at (checkpoint saved, resume with --resume); 1 gate failed or an error (the
checkpoint on disk is the last durable one; stopped.json says why); 3 a clean stop for another reason: temperature, hardware slowdown, a failed GPU
reading, memory limits, a signal (checkpoint saved, stopped.json says why).
complete.json is the only mark of a finished run. With --max-updates it says full_schedule false, and arm_export refuses it unless told otherwise.
"""
import argparse
from contextlib import ExitStack
from dataclasses import dataclass
from datetime import datetime
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import random
import signal
import subprocess
import sys
import time
from typing import Callable, Optional
import xml.etree.ElementTree as ET

import torch
from torch import nn

from finetune_modernbert import (BASE, REVISION, GIB, Backend, ModernReader, RunLock, cuda_health, cuda_selection, gradients,
                                 restore_rng, rng_state, sha, validate_resume)
from finetune_roles import CUT_ID, Layout, read
from modernbert_tokenization import POLICY, encode, prepare

SOURCES = ("finetune_modernbert_batched.py", "finetune_modernbert.py", "modernbert_tokenization.py", "finetune_roles.py", "make_roles.py", "make_data.py")
REQUEST_CAP, MESSAGE_CAP = 128, 512
CANVAS_CAP, CANVAS_FIT_ROWS = 512, 500   # the second read's cap (docs/js/neural.js, build_canvas_rows.mjs CAP); canvas rows measured at each epoch's end
WARMUP, WEIGHT_DECAY, CLIP = .06, .01, 1.
RSS_LIMIT, AVAILABLE_FLOOR = 8 * GIB, 2 * GIB
STOP_CELSIUS = 90
MONITOR_EVERY, EVIDENCE_EVERY, MEMORY_EVERY = 200, 200, 50
# Reasons that mean the hardware itself is slowing down. sw_power_cap reads Active in normal work and is only logged.
HARDWARE_SLOWDOWNS = ("clocks_event_reason_hw_slowdown", "clocks_event_reason_hw_thermal_slowdown", "clocks_event_reason_hw_power_brake_slowdown")
GATE_ROWS, GATE_BATCH, GATE_UPDATES, GATE_EVERY, GATE_SHARE = 200, 16, 400, 50, .99
FIT_ROWS = 1000
WORK_FILES_ALLOWED_FRESH = {".run.lock", "overfit_gate.json"}


class NonFinite(RuntimeError):
    """A loss or gradient is not finite. The checkpoint on disk is left as it is."""


def fsync_dir(path):
    fd = os.open(path, os.O_RDONLY)
    try: os.fsync(fd)
    finally: os.close(fd)


def atomic_save(path, payload):
    path = Path(path); temp = path.with_name(path.name + ".tmp")
    with open(temp, "wb") as f:
        torch.save(payload, f); f.flush(); os.fsync(f.fileno())
    os.replace(temp, path); fsync_dir(path.parent)


def atomic_json(path, value):
    path = Path(path); temp = path.with_name(path.name + ".tmp")
    with open(temp, "w") as f:
        f.write(json.dumps(value, indent=2, allow_nan=False) + "\n"); f.flush(); os.fsync(f.fileno())
    os.replace(temp, path); fsync_dir(path.parent)


def data_manifest(data, expect=None):
    """The first run's manifest, without its fixed counts: other arms have other data. expect compares it with a file; extra_dirs only comes from there."""
    data = Path(data)
    rows, cuts = read(data / "train.jsonl"), read(data / "cut_train.jsonl")
    if not rows or not cuts: raise ValueError("Training data is empty")
    if read(data / "heldout.jsonl") or read(data / "cut_heldout.jsonl"): raise ValueError("This trainer has no use for held-out rows; the data must have none")
    manifest = {"messages": len(cuts), "requests": len(rows), "files": {p.name: sha(p) for p in sorted(data.glob("*.json*"))}}
    if expect is not None:
        want = json.loads(Path(expect).read_text())
        for key in ("messages", "requests", "files"):
            if want.get(key) != manifest[key]:
                changed = sorted(k for k in set(want.get("files", {})) | set(manifest["files"]) if want.get("files", {}).get(k) != manifest["files"].get(k)) if key == "files" else [want.get(key), manifest[key]]
                raise ValueError(f"Data does not match {expect}: {key}: {changed}")
        if "extra_dirs" in want: manifest["extra_dirs"] = want["extra_dirs"]
    return rows, cuts, manifest


def fixed_rows(rows):
    """The rows of first_run_fit.py, so that its numbers compare: Random(0) shuffle, the first 1,000 for the fit, the next 200 for the gate."""
    rng, idx = random.Random(0), list(range(len(rows)))
    rng.shuffle(idx)
    fit = [rows[i] for i in idx[:FIT_ROWS]]
    gate = [rows[i] for i in (idx[FIT_ROWS:FIT_ROWS + GATE_ROWS] if len(idx) >= FIT_ROWS + GATE_ROWS else idx[:GATE_ROWS])]
    return fit, gate


def build(layout, a):
    from transformers import AutoTokenizer, ModernBertModel
    tok = AutoTokenizer.from_pretrained(BASE, revision=REVISION, cache_dir=a.cache, local_files_only=True)
    encoder = ModernBertModel.from_pretrained(BASE, revision=REVISION, cache_dir=a.cache, attn_implementation="sdpa",
                                            reference_compile=False, local_files_only=True)
    encoder.config.reference_compile = False
    return tok, ModernReader(encoder, len(layout.acts), layout.class_sizes, len(layout.tags))


def autocast(backend):
    return torch.autocast(backend.name, dtype=torch.bfloat16)


def request_loss(model, tok, part, layout, backend, act_weight=None):
    """The loss of finetune_roles.py without the cut: act + mean of the class heads + word tags."""
    x, lab, _ = encode(tok, part, layout, REQUEST_CAP, backend.name)
    with autocast(backend): tl, sl, _ = model(**x)
    tl, sl = tl.float(), sl.float(); ce = nn.functional.cross_entropy
    ya = torch.tensor([layout.act_id[r["act"]] for r in part], device=backend.name)
    yc = torch.tensor([layout.class_targets(r) for r in part], device=backend.name)
    loss = ce(sl[:, :len(layout.acts)], ya, weight=act_weight)
    loss = loss + sum(ce(sl[:, s:s + c], yc[:, i]) for i, (s, c) in enumerate(zip(layout.offsets[:-1], layout.class_sizes))) / len(layout.class_sizes)
    if bool((lab != -100).any()): loss = loss + ce(tl.flatten(0, 1), lab.flatten(), ignore_index=-100)
    return loss, int(x["input_ids"].numel())


def cut_loss(model, tok, part, layout, backend):
    x, lab, _ = encode(tok, part, layout, MESSAGE_CAP, backend.name, CUT_ID)
    with autocast(backend): _, _, cl = model(**x)
    cl = cl.float()
    loss = nn.functional.cross_entropy(cl.flatten(0, 1), lab.flatten(), ignore_index=-100) if bool((lab != -100).any()) else cl.sum() * 0
    return loss, int(x["input_ids"].numel())


def canvas_data(folder):
    """The second-read rows of arm M4 and their identity (hashes of the rows and of the builder's manifest)."""
    folder = Path(folder); rows = read(folder / "canvas_train.jsonl")
    if not rows: raise ValueError(f"No canvas rows in {folder}")
    man = folder / "canvas_manifest.json"
    return rows, {"rows": len(rows), "sha256": sha(folder / "canvas_train.jsonl"), "manifest_sha256": sha(man) if man.exists() else None}


def canvas_prepare(tok, rows, layout):
    """Each canvas row once: its word pieces at CANVAS_CAP and its labels (-100 on the request's words, tag null). A row the reader would cut at the
    cap, or split into other words, is refused: the builder counted its pieces with the same tokenizer, so this is the Node / Python parity check."""
    out = []
    for r in rows:
        p = prepare(tok, r["text"], CANVAS_CAP)
        if p["truncated"]: raise ValueError(f"Canvas row {r['id']} is over {CANVAS_CAP} pieces here; the builder counted it within the cap")
        if [w["w"] for w in p["ws"]] != r["words"] or len(r["tags"]) != len(r["words"]): raise ValueError(f"Canvas row {r['id']}: word splitter differs from the builder")
        lab = [-100] * len(p["ids"])
        for w, t in p["first"].items():
            tag = r["tags"][w]
            if tag is None: continue
            if tag not in layout.tag_id: raise ValueError(f"Canvas row {r['id']}: tag {tag} is not in reader.json")
            lab[t] = layout.tag_id[tag]
        out.append({"ids": p["ids"], "labels": lab})
    return out


def canvas_batch(prepared, order, pos, budget):
    """From order[pos]: rows while rows x the longest of them stays within budget padded tokens (at least one row) -> their indices"""
    take, longest = [], 0
    while pos + len(take) < len(order):
        n = len(prepared[order[pos + len(take)]]["ids"])
        if take and (len(take) + 1) * max(longest, n) > budget: break
        take.append(order[pos + len(take)]); longest = max(longest, n)
    return take


def canvas_tensors(tok, part, device):
    n = max(len(p["ids"]) for p in part)
    ids = torch.tensor([p["ids"] + [tok.pad_token_id] * (n - len(p["ids"])) for p in part], dtype=torch.long, device=device)
    mask = torch.tensor([[1] * len(p["ids"]) + [0] * (n - len(p["ids"])) for p in part], dtype=torch.long, device=device)
    lab = torch.tensor([p["labels"] + [-100] * (n - len(p["labels"])) for p in part], dtype=torch.long, device=device)
    return {"input_ids": ids, "attention_mask": mask}, lab


def canvas_loss(model, tok, part, backend):
    """The second read's loss: word tags on the drawing's words only (no act, class or cut loss)."""
    x, lab = canvas_tensors(tok, part, backend.name)
    with autocast(backend): tl, _, _ = model(**x)
    tl = tl.float()
    loss = nn.functional.cross_entropy(tl.flatten(0, 1), lab.flatten(), ignore_index=-100) if bool((lab != -100).any()) else tl.sum() * 0
    return loss, int(x["input_ids"].numel())


@torch.no_grad()
def measure_canvas(model, tok, sample, layout, backend, budget):
    """Tag accuracy of the second read on canvas rows: every labelled word of the drawing, and the words a role refers to (B / I)"""
    was_training = model.training; model.eval()
    ok = n = ok_bi = n_bi = 0; order = list(range(len(sample))); pos = 0
    while pos < len(order):
        take = canvas_batch(sample, order, pos, budget); pos += len(take)
        x, lab = canvas_tensors(tok, [sample[i] for i in take], backend.name)
        with autocast(backend): tl, _, _ = model(**x)
        pred, m = tl.float().argmax(-1), lab != -100
        ok += (pred[m] == lab[m]).sum().item(); n += m.sum().item()
        bi = m & (lab != layout.tag_id["O"]); ok_bi += (pred[bi] == lab[bi]).sum().item(); n_bi += bi.sum().item()
    if was_training: model.train()
    return dict(canvas_rows=len(sample), canvas_tags=ok / max(n, 1), canvas_role_words=ok_bi / max(n_bi, 1), canvas_role_words_n=n_bi)


def act_weights(rows, layout, device):
    """finetune_roles.py: "none" is weighted down when it would be more than 40% of the rows."""
    n_none = sum(r["act"] == "none" for r in rows)
    if "none" not in layout.act_id or n_none / len(rows) <= .40: return None
    weight = torch.ones(len(layout.acts), device=device)
    weight[layout.act_id["none"]] = .40 / .60 * (len(rows) - n_none) / n_none
    return weight


@torch.no_grad()
def measure(model, tok, sample, layout, backend, batch=32):
    """Accuracy per class head on rows with a value and rows without, act and word tags (first_run_fit.py). Dropout is off, so no generator moves."""
    was_training = model.training; model.eval()
    act_ok = tag_ok = tag_n = 0; keys = {}
    for i in range(0, len(sample), batch):
        part = sample[i:i + batch]
        x, lab, _ = encode(tok, part, layout, REQUEST_CAP, backend.name)
        with autocast(backend): tl, sl, _ = model(**x)
        tl, sl = tl.float(), sl.float()
        pa = sl[:, :len(layout.acts)].argmax(-1).tolist()
        for j, r in enumerate(part):
            act_ok += pa[j] == layout.act_id[r["act"]]
            target = layout.class_targets(r)
            for h, (s, c) in enumerate(zip(layout.offsets[:-1], layout.class_sizes)):
                d = keys.setdefault(layout.classes[h][0], dict(val_n=0, val_ok=0, none_n=0, none_ok=0, said_none_on_value=0))
                p = sl[j, s:s + c].argmax().item()
                if target[h] > 0:
                    d["val_n"] += 1; d["val_ok"] += p == target[h]; d["said_none_on_value"] += p == 0
                else:
                    d["none_n"] += 1; d["none_ok"] += p == 0
        m = lab != -100
        tag_ok += (tl.argmax(-1)[m] == lab[m]).sum().item(); tag_n += m.sum().item()
    if was_training: model.train()
    return dict(rows=len(sample), act=act_ok / len(sample), word_tags=tag_ok / max(tag_n, 1),
                value_right=sum(d["val_ok"] for d in keys.values()), value_rows=sum(d["val_n"] for d in keys.values()), keys=keys)


def gate_verdict(fit, share=GATE_SHARE):
    """Every class head at least `share` right, on its rows with a value and on those without. Pooled numbers would let a head that says none pass."""
    failures = []
    for k, d in fit["keys"].items():
        if d["val_n"] and d["val_ok"] / d["val_n"] < share: failures.append(f"{k}: value {d['val_ok']}/{d['val_n']}")
        if d["none_n"] and d["none_ok"] / d["none_n"] < share: failures.append(f"{k}: no value {d['none_ok']}/{d['none_n']}")
    if not fit["value_rows"]: failures.append("no row has a value")
    return not failures, failures


def parse_gpu_status(xml_text):
    """Temperature, throttle reasons and recovery action from nvidia-smi -q -x. A field that cannot be read is a reason to stop. Power is not read: it is nonsense on this card."""
    gpu = ET.fromstring(xml_text).find("gpu")
    temp, reasons = gpu.findtext("temperature/gpu_temp"), gpu.find("clocks_event_reasons")
    status = {"temperature": None, "active": [], "recovery": gpu.findtext("gpu_recovery_action"), "stop": None}
    try: status["temperature"] = int(temp.split()[0])
    except (AttributeError, ValueError, IndexError): status["stop"] = "gpu-unreadable: temperature " + str(temp)
    if reasons is None or any(reasons.find(k) is None for k in HARDWARE_SLOWDOWNS): status["stop"] = "gpu-unreadable: throttle reasons"
    else: status["active"] = [c.tag.replace("clocks_event_reason_", "") for c in reasons if c.text == "Active"]
    if status["temperature"] is not None and status["temperature"] >= STOP_CELSIUS: status["stop"] = f"temperature {status['temperature']} C"
    if reasons is not None:
        slow = [k for k in HARDWARE_SLOWDOWNS if reasons.findtext(k) == "Active"]
        if slow: status["stop"] = "hardware slowdown: " + ",".join(slow)
    if status["recovery"] != "None": status["stop"] = "gpu recovery action: " + str(status["recovery"])
    return status


def gpu_status(uuid):
    try: result = subprocess.run(["nvidia-smi", "-i", uuid, "-q", "-x"], capture_output=True, text=True, check=True, timeout=60)
    except (subprocess.SubprocessError, OSError) as exc: return {"temperature": None, "active": [], "recovery": None, "stop": "gpu-unreadable: " + type(exc).__name__}
    return parse_gpu_status(result.stdout)


def host_memory():
    import psutil
    return psutil.Process().memory_info().rss, psutil.virtual_memory().available


@dataclass
class Hooks:
    """What differs between the real run and the CPU tests. The training loop is the same code."""
    build: Callable = build
    configure: Callable = lambda backend: backend.configure()
    monitor: Callable = lambda update: {"temperature": None, "active": [], "recovery": None, "stop": None}
    now: Callable = time.time
    interrupted: Callable = lambda: None
    host_memory: Callable = host_memory
    allocator_limit_gib: Optional[float] = None


def settings_of(a):
    s = dict(seed=a.seed, epochs=a.epochs, lr=a.lr, head_lr=a.head_lr, batch=a.batch, cut_batch=a.cut_batch, weight_decay=WEIGHT_DECAY, warmup=WARMUP, clip=CLIP,
             request_cap=REQUEST_CAP, message_cap=MESSAGE_CAP, attn="sdpa", autocast="bfloat16", weights="float32", gradient_checkpointing=False, max_updates=a.max_updates)
    if getattr(a, "canvas_rows", None) is not None:   # only with --canvas-rows: the default settings stay as they were
        s["canvas"] = dict(getattr(a, "canvas_identity", {}), tokens=a.canvas_tokens, cap=CANVAS_CAP)
    return s


def metadata_of(a, backend, manifest, device_metadata):
    return {"base": BASE, "revision": REVISION, "settings": settings_of(a), "data": manifest, "tokenization": POLICY, "device": backend.name,
            "platform": platform.platform(), "python": sys.version, **device_metadata,
            "versions": {p: importlib.metadata.version(p) for p in ("torch", "transformers", "tokenizers", "numpy", "onnx", "onnxruntime", "psutil")},
            "torch_build": torch.__config__.show(),
            "numerics": {"weights": "float32", "autocast": "bfloat16", "attn": "sdpa", "grad_scaler": False},
            "sources": {n: sha(Path(__file__).with_name(n)) for n in SOURCES}}


def parameter_groups(model, lr, head_lr):
    encoder = [p for n, p in model.named_parameters() if n.startswith("encoder.")]
    heads = [p for n, p in model.named_parameters() if not n.startswith("encoder.")]
    return [dict(params=encoder, lr=lr), dict(params=heads, lr=head_lr)]


def make_optimizer(model, a, backend):
    return torch.optim.AdamW(parameter_groups(model, a.lr, a.head_lr), weight_decay=WEIGHT_DECAY, fused=backend.name == "cuda")


def trim_jsonl(path, update):
    """After a resume, drop what was logged past the checkpoint (and a torn last line): those steps run again."""
    path = Path(path)
    if not path.exists(): return
    kept = []
    for line in path.read_text().splitlines():
        try: row = json.loads(line)
        except ValueError: continue
        if row["update"] <= update: kept.append(line)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text("".join(x + "\n" for x in kept)); os.replace(temp, path)


def prepare_model(a, backend, hooks, layout):
    tok, model = hooks.build(layout, a)
    if model.encoder.config._attn_implementation != "sdpa": raise RuntimeError("Training uses SDPA")
    if getattr(model.encoder, "gradient_checkpointing", False): raise RuntimeError("Training uses no gradient checkpointing")
    model.to(backend.name).float(); model.train()
    if any(p.dtype != torch.float32 for p in model.parameters()): raise RuntimeError("Weights must stay float32")
    return tok, model


def apply_allocator_limit(backend, hooks):
    if backend.name != "cuda" or hooks.allocator_limit_gib is None: return
    total = torch.cuda.get_device_properties(0).total_memory
    limit = hooks.allocator_limit_gib * GIB
    if limit > total: raise RuntimeError("Allocator limit is above the card's memory")
    torch.cuda.set_per_process_memory_fraction(limit / total, 0)
    backend.identity["cuda_allocator_limit"] = limit


def peak_memory(backend, hooks):
    rss, available = hooks.host_memory()
    out = {"rss_gib": round(rss / GIB, 3), "available_gib": round(available / GIB, 3)}
    if backend.name == "cuda":
        out.update(peak_allocated_gib=round(torch.cuda.max_memory_allocated(0) / GIB, 3), peak_reserved_gib=round(torch.cuda.max_memory_reserved(0) / GIB, 3))
    return out


def largest(rows, tok, cap, n):
    prepared = [prepare(tok, r["text"], cap) for r in rows]
    order = sorted(range(len(rows)), key=lambda i: (-len(prepared[i]["ids"]), i))
    return [rows[i] for i in order[:n]], len(prepared[order[0]]["ids"]), sum(p["truncated"] for p in prepared)


def preflight(model, tok, opt, rows, cuts, layout, backend, hooks, a, act_weight, canvas=None):
    """One worst-case step with the optimizer state already in memory: the longest requests, then the longest messages padded together. Random batches
    reach this size only once every few thousand steps; better to fail in the first minute than in the third hour. Nothing changes: no optimizer step, generators restored."""
    state = rng_state(backend)
    top_requests, long_request, cut_requests = largest(rows, tok, REQUEST_CAP, a.batch)
    top_messages, long_message, cut_messages = largest(cuts, tok, MESSAGE_CAP, a.cut_batch)
    opt.zero_grad(set_to_none=True)
    rl, tokens_r = request_loss(model, tok, top_requests, layout, backend, act_weight); rl.backward(); rv = rl.item(); del rl
    cl, tokens_c = cut_loss(model, tok, top_messages, layout, backend); cl.backward(); cv = cl.item(); del cl
    extra = {}
    if canvas is not None:   # the canvas pass's worst case: the longest rows, packed under the budget
        longest = sorted(range(len(canvas)), key=lambda i: (-len(canvas[i]["ids"]), i))
        part = [canvas[i] for i in canvas_batch(canvas, longest, 0, a.canvas_tokens)]
        xl, tokens_x = canvas_loss(model, tok, part, backend); xl.backward(); xv = xl.item(); del xl
        if not math.isfinite(xv): raise NonFinite("Non-finite canvas loss on the longest batch")
        extra = {"canvas_tokens": tokens_x, "canvas_rows": len(part), "longest_canvas": len(part[0]["ids"])}
    if not (math.isfinite(rv) and math.isfinite(cv)): raise NonFinite("Non-finite loss on the longest batches")
    gradients(model); torch.nn.utils.clip_grad_norm_(model.parameters(), CLIP, error_if_nonfinite=True)
    opt.zero_grad(set_to_none=True); restore_rng(state, backend)
    return {"request_tokens": tokens_r, "message_tokens": tokens_c, "longest_request": long_request, "longest_message": long_message,
            "requests_over_cap": cut_requests, "messages_over_cap": cut_messages, **extra, **peak_memory(backend, hooks)}


def overfit_gate(a, backend, hooks):
    """From the base weights, the 200 rows of first_run_fit.py, batch 16, a constant learning rate, the request loss only."""
    device_metadata = hooks.configure(backend); apply_allocator_limit(backend, hooks)
    rows, _, manifest = data_manifest(a.data, a.expect_manifest)
    layout = Layout(json.loads((a.data / "reader.json").read_text()))
    backend.seed(a.seed)
    tok, model = prepare_model(a, backend, hooks, layout)
    opt = make_optimizer(model, a, backend)
    _, few = fixed_rows(rows)
    rng, order, passed, log, start = random.Random(a.seed), [], False, [], time.monotonic()
    reason, failures, stop_at = None, [], a.stop_at_ts
    for update in range(1, GATE_UPDATES + 1):
        if hooks.now() >= stop_at: reason = "stop-at"; break
        status = hooks.monitor(update) if update % MONITOR_EVERY == 1 else {}
        if status.get("stop"): reason = status["stop"]; break
        if len(order) < GATE_BATCH: order = rng.sample(range(len(few)), len(few))
        part = [few[order.pop()] for _ in range(min(GATE_BATCH, len(few)))]
        loss, _ = request_loss(model, tok, part, layout, backend)
        if not torch.isfinite(loss).item(): raise NonFinite("Non-finite request loss")
        opt.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), CLIP, error_if_nonfinite=True); opt.step()
        if update % GATE_EVERY == 0:
            fit = measure(model, tok, few, layout, backend)
            passed, failures = gate_verdict(fit)
            log.append(dict(update=update, loss=loss.item(), elapsed=time.monotonic() - start, **fit, failures=failures))
            print(json.dumps({"update": update, "loss": round(loss.item(), 4), "value_right": fit["value_right"], "value_rows": fit["value_rows"], "act": fit["act"], "word_tags": fit["word_tags"], "passed": passed}), flush=True)
            if passed: break
    atomic_json(a.work / "overfit_gate.json", {"passed": passed, "stopped_by": reason, "lr": a.lr, "head_lr": a.head_lr, "rows": len(few), "data": manifest, **device_metadata,
                                               "memory": peak_memory(backend, hooks), "log": log})
    print(json.dumps({"overfit_gate": "passed" if passed else "failed", "stopped_by": reason, "updates": log[-1]["update"] if log else 0, "failures": failures, "memory": peak_memory(backend, hooks)}), flush=True)
    return 0 if passed else 1


def run(a, backend, hooks):
    """The training loop. Positions move only after opt.step(): a stop at a step boundary is exact, and a failure mid-step keeps the last durable checkpoint."""
    a.work.mkdir(parents=True, exist_ok=True)
    if a.overfit_gate: return overfit_gate(a, backend, hooks)
    if not a.resume and any(p.name not in WORK_FILES_ALLOWED_FRESH for p in a.work.iterdir()):
        raise RuntimeError("A fresh run needs an empty work directory; use --resume to continue")
    device_metadata = hooks.configure(backend); apply_allocator_limit(backend, hooks)
    rows, cuts, manifest = data_manifest(a.data, a.expect_manifest)
    layout = Layout(json.loads((a.data / "reader.json").read_text()))
    canvas_rows = None
    if getattr(a, "canvas_rows", None) is not None: canvas_rows, a.canvas_identity = canvas_data(a.canvas_rows)
    metadata = metadata_of(a, backend, manifest, device_metadata)
    checkpoint = a.work / "checkpoint.pt"
    ck = None
    if a.resume:
        ck = torch.load(checkpoint, map_location="cpu", weights_only=False)
        validate_resume(metadata, ck["metadata"])
        if (a.work / "complete.json").exists():
            print(json.dumps({"status": "already-complete"}), flush=True)
            return 0
    if not a.resume: atomic_json(a.work / "environment.json", metadata)
    fit_rows, _ = fixed_rows(rows)
    backend.seed(a.seed)
    tok, model = prepare_model(a, backend, hooks, layout)
    canvas = canvas_prepare(tok, canvas_rows, layout) if canvas_rows is not None else None
    canvas_rng = random.Random(a.seed) if canvas is not None else None   # its own generator: the request and cut orders draw exactly as without the flag
    canvas_fit = None
    if canvas is not None:
        idx = list(range(len(canvas))); random.Random(0).shuffle(idx); canvas_fit = [canvas[i] for i in idx[:CANVAS_FIT_ROWS]]
    opt = make_optimizer(model, a, backend)
    from transformers import get_linear_schedule_with_warmup
    steps_per_epoch = math.ceil(len(rows) / a.batch); total = steps_per_epoch * a.epochs
    sch = get_linear_schedule_with_warmup(opt, int(WARMUP * total), total)
    weight = act_weights(rows, layout, backend.name)
    shuffler = random.Random(a.seed)
    if ck is not None:
        model.load_state_dict(ck["model"]); opt.load_state_dict(ck["optimizer"]); sch.load_state_dict(ck["scheduler"])
        state = ck["state"]; shuffler.setstate(state["shuffler"])
        if canvas is not None: canvas_rng.setstate(state["canvas_rng"])
        restore_rng(ck["rng"], backend)
        trim_jsonl(a.work / "train.jsonl", state["update"]); trim_jsonl(a.work / "fit.jsonl", state["update"]); trim_jsonl(a.work / "gpu.jsonl", state["update"])
        del ck
    else:
        order, cut_order = list(range(len(rows))), list(range(len(cuts)))
        shuffler.shuffle(order); shuffler.shuffle(cut_order)
        state = dict(epoch=0, pos=0, cut_pos=0, update=0, order=order, cut_order=cut_order, elapsed=0., total=total, steps_per_epoch=steps_per_epoch)
        if canvas is not None:
            canvas_order = list(range(len(canvas))); canvas_rng.shuffle(canvas_order)
            state.update(canvas_pos=0, canvas_order=canvas_order)
    if state["total"] != total: raise RuntimeError("The schedule of the checkpoint differs")
    start, previous = time.monotonic(), state["elapsed"]
    elapsed = lambda: previous + time.monotonic() - start
    last_saved, done_preflight = time.monotonic(), False

    def save(path=checkpoint):
        state["elapsed"] = elapsed(); state["shuffler"] = shuffler.getstate()
        if canvas is not None: state["canvas_rng"] = canvas_rng.getstate()
        atomic_save(path, {"model": model.state_dict(), "optimizer": opt.state_dict(), "scheduler": sch.state_dict(), "rng": rng_state(backend), "state": state, "metadata": metadata})

    def stop(reason, code):
        for p in model.parameters():
            if not torch.isfinite(p).all().item(): raise NonFinite("Non-finite weights at a stop; the checkpoint on disk is kept")
        save()
        atomic_json(a.work / "stopped.json", {"reason": reason, "update": state["update"], "epoch": state["epoch"], "pos": state["pos"], "elapsed": state["elapsed"], "checkpoint": True, "memory": peak_memory(backend, hooks)})
        print(json.dumps({"status": "stopped", "reason": reason, "update": state["update"], "of": total, "memory": peak_memory(backend, hooks)}), flush=True)
        return code

    def fit_line(**extra):
        fit = measure(model, tok, fit_rows, layout, backend)
        if canvas is not None: fit.update(measure_canvas(model, tok, canvas_fit, layout, backend, a.canvas_tokens))
        fits.write(json.dumps(dict(update=state["update"], elapsed=elapsed(), **extra, **fit), allow_nan=False) + "\n"); fits.flush()

    log, fits, gpu_log = (open(a.work / n, "a", buffering=1) for n in ("train.jsonl", "fit.jsonl", "gpu.jsonl"))
    try:
        if not a.resume: save()
        while True:
            if a.max_updates and state["update"] >= a.max_updates: break
            if state["epoch"] >= a.epochs: break
            if hooks.now() >= a.stop_at_ts: return stop("stop-at", 0)
            signal_name = hooks.interrupted()
            if signal_name: return stop("signal " + str(signal_name), 3)
            rss, available = hooks.host_memory()
            if rss > RSS_LIMIT or available < AVAILABLE_FLOOR: return stop(f"host memory: rss {rss}, available {available}", 3)
            if state["update"] % MONITOR_EVERY == 0:
                status = hooks.monitor(state["update"])
                gpu_log.write(json.dumps(dict(update=state["update"], elapsed=elapsed(), **status), allow_nan=False) + "\n")
                if status.get("stop"): return stop(status["stop"], 3)
            if time.monotonic() - last_saved >= a.checkpoint_minutes * 60:
                save(); last_saved = time.monotonic()
            # One update: its own backward per pass, positions unchanged until opt.step() has run.
            part = [rows[i] for i in state["order"][state["pos"]:state["pos"] + a.batch]]
            cut_pos, cut_order = state["cut_pos"], state["cut_order"]
            if cut_pos >= len(cuts):
                shuffler.shuffle(cut_order); cut_pos = 0
            crow = [cuts[i] for i in cut_order[cut_pos:cut_pos + a.cut_batch]]
            opt.zero_grad(set_to_none=True)
            rl, tokens_r = request_loss(model, tok, part, layout, backend, weight)
            if not torch.isfinite(rl).item(): raise NonFinite("Non-finite request loss")
            rl.backward(); rv = rl.item(); del rl
            cl, tokens_c = cut_loss(model, tok, crow, layout, backend)
            if not torch.isfinite(cl).item(): raise NonFinite("Non-finite cut loss")
            cl.backward(); cv = cl.item(); del cl
            if canvas is not None:   # the second read: its own backward, the same update
                canvas_pos, canvas_order = state["canvas_pos"], state["canvas_order"]
                if canvas_pos >= len(canvas_order):
                    canvas_rng.shuffle(canvas_order); canvas_pos = 0
                take = canvas_batch(canvas, canvas_order, canvas_pos, a.canvas_tokens)
                xl, tokens_x = canvas_loss(model, tok, [canvas[i] for i in take], backend)
                if not torch.isfinite(xl).item(): raise NonFinite("Non-finite canvas loss")
                xl.backward(); xv = xl.item(); del xl
            evidence = gradients(model) if state["update"] % EVIDENCE_EVERY == 0 else None
            try: norm = torch.nn.utils.clip_grad_norm_(model.parameters(), CLIP, error_if_nonfinite=True)
            except RuntimeError as exc: raise NonFinite(str(exc)) from None
            lrs = sch.get_last_lr()
            opt.step(); sch.step()
            state["update"] += 1; state["pos"] += len(part); state["cut_pos"] = cut_pos + len(crow)
            row = dict(update=state["update"], epoch=state["epoch"] + 1, request_loss=rv, cut_loss=cv, lr=lrs[0], head_lr=lrs[1], grad_norm=norm.item(), request_tokens=tokens_r, cut_tokens=tokens_c, elapsed=elapsed())
            if canvas is not None:
                state["canvas_pos"] = canvas_pos + len(take)
                row.update(canvas_loss=xv, canvas_tokens=tokens_x, canvas_rows=len(take))
            if evidence is not None: row["gradients"] = evidence
            if state["update"] % MEMORY_EVERY == 0: row["memory"] = peak_memory(backend, hooks)
            log.write(json.dumps(row, allow_nan=False) + "\n")
            if not done_preflight:
                info = preflight(model, tok, opt, rows, cuts, layout, backend, hooks, a, weight, canvas)
                atomic_json(a.work / "preflight.json", info); done_preflight = True
                print(json.dumps({"preflight": info}), flush=True)
            if state["pos"] >= len(rows):
                state["epoch"] += 1
                # The weights of this epoch are kept whatever happens next; epoch_N.pt never holds a later state.
                atomic_save(a.work / f"epoch_{state['epoch']}.pt", {"model": model.state_dict(), "epoch": state["epoch"], "update": state["update"], "metadata": metadata})
                fit_line(epoch=state["epoch"])
                print(json.dumps({"epoch": state["epoch"], "update": state["update"], "of": total, "elapsed": round(elapsed()), "memory": peak_memory(backend, hooks)}), flush=True)
                state["pos"] = 0
                shuffler.shuffle(state["order"])
                save(); last_saved = time.monotonic()
        full = state["epoch"] >= a.epochs
        if not full: fit_line(epoch=state["epoch"] + 1, partial=True)
        save()
        model.encoder.config.save_pretrained(a.work / "encoder_config"); tok.save_pretrained(a.work / "tokenizer")
        summary = {k: state[k] for k in ("epoch", "update", "elapsed", "total")}
        atomic_json(a.work / "complete.json", {"complete": True, "full_schedule": full, "max_updates": a.max_updates, "state": summary, "metadata": metadata, "memory": peak_memory(backend, hooks)})
        print(json.dumps({"status": "complete", "full_schedule": full, **summary, "memory": peak_memory(backend, hooks)}), flush=True)
        return 0
    except BaseException as exc:
        # Nothing is saved from here: the failure may be the device, and the last durable checkpoint resumes exactly.
        atomic_json(a.work / "stopped.json", {"reason": f"{type(exc).__name__}: {exc}", "update": state["update"], "elapsed": elapsed(), "checkpoint": False})
        raise
    finally:
        log.close(); fits.close(); gpu_log.close()


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--work", required=True, type=Path)
    ap.add_argument("--seed", required=True, type=int)
    ap.add_argument("--gpu-uuid", required=True)
    ap.add_argument("--stop-at", required=True, help='local time, "YYYY-MM-DD HH:MM"')
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--lr", type=float, default=6e-5)
    ap.add_argument("--head-lr", type=float, default=None, help="default: the same as --lr")
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--cut-batch", type=int, default=8)
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--expect-manifest", type=Path)
    ap.add_argument("--overfit-gate", action="store_true")
    ap.add_argument("--max-updates", type=int, default=0, help="finish after N updates of the full schedule (dry run); the run is marked full_schedule false")
    ap.add_argument("--gpu-limit-gib", type=float, default=5., help="allocator limit. 4 is too tight: the longest batches of the first run's data (8 x 302 pieces) peak at 3.98 GiB allocated, 4.40 reserved")
    ap.add_argument("--canvas-rows", type=Path, default=None, help="arm M4: a folder with canvas_train.jsonl (parity/build_canvas_rows.mjs): the second read's pass")
    ap.add_argument("--canvas-tokens", type=int, default=4096, help="padded tokens per canvas batch (rows x longest row)")
    ap.add_argument("--checkpoint-minutes", type=float, default=15., help="full checkpoint every so often, about 1.8 GB each")
    ap.add_argument("--cache", default=str(Path.home() / ".cache/diagram-vss-modernbert/hf"))
    ap.add_argument("--lock-dir", type=Path, default=Path.home() / ".cache/diagram-vss-modernbert/locks")
    a = ap.parse_args(argv)
    if a.head_lr is None: a.head_lr = a.lr
    a.stop_at_ts = datetime.strptime(a.stop_at, "%Y-%m-%d %H:%M").timestamp()
    return a


def main(argv=None):
    a = parse_args(argv)
    repo = Path(__file__).resolve().parents[2]
    if a.work.resolve().is_relative_to(repo) or a.data.resolve().is_relative_to(repo) or (a.canvas_rows is not None and a.canvas_rows.resolve().is_relative_to(repo)):
        raise SystemExit("Data and checkpoints must stay outside git")
    with ExitStack() as ownership:
        ownership.enter_context(RunLock(a.work / ".run.lock"))
        uuid = cuda_selection(a.gpu_uuid)
        ownership.enter_context(RunLock(a.lock_dir / (uuid + ".lock")))
        backend = Backend("cuda", cuda_health(uuid))
        received = []
        for s in (signal.SIGTERM, signal.SIGINT):
            signal.signal(s, lambda number, _: received.append(signal.Signals(number).name))
        hooks = Hooks(monitor=lambda update: gpu_status(uuid), interrupted=lambda: received[0] if received else None, allocator_limit_gib=a.gpu_limit_gib)
        return run(a, backend, hooks)


if __name__ == "__main__": sys.exit(main())
