"""Fixed preregistered ModernBERT ALL run. The eight-update pilot stops by default.

No model is downloaded on import. See MODERNBERT_PLAN.md for the protocol. Run
--prepare-data once, then --data DIR --work DIR; resume the same checkpoint with
--resume and, only after source/pilot approval, --continue-after-pilot.
"""
import argparse
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import random
import subprocess
import sys
import time

import numpy as np
import torch
from torch import nn

from finetune_roles import Layout, CUT_ID, read
from modernbert_tokenization import POLICY, encode

BASE = "answerdotai/ModernBERT-base"
REVISION = "8949b909ec900327062f0ebf497f51aef5e6f0c8"
EXTRAS = ["llm_train/" + x for x in ("opus_train_a opus_train_b opus_train_c opus_train_d opus_gen_1 opus_gen_2 synth_rules synth_rules_ops synth_rules_ext ops_formulations opus_ext_1 synth_combo").split()]
SETTINGS = dict(seed=0, epochs=1, lr=3e-5, weight_decay=.01, warmup=.06,
                accumulation=16, microbatch=1, cut_microbatch=1, clip=1., dtype="float32")
GIB = 1024 ** 3


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


class ModernReader(nn.Module):
    def __init__(self, encoder, n_acts, class_sizes, n_tags):
        super().__init__()
        h = encoder.config.hidden_size
        self.encoder, self.class_sizes = encoder, list(class_sizes)
        self.pre, self.drop = nn.Linear(h, h), nn.Dropout(.1)
        self.act, self.classes = nn.Linear(h, n_acts), nn.Linear(h, sum(class_sizes))
        self.tok_drop, self.tags, self.cut = nn.Dropout(.1), nn.Linear(h, n_tags), nn.Linear(h, 3)

    def forward(self, input_ids, attention_mask):
        h = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        c, t = self.drop(torch.relu(self.pre(h[:, 0]))), self.tok_drop(h)
        return self.tags(t), torch.cat((self.act(c), self.classes(c)), -1), self.cut(t)


def build(layout, cache):
    from transformers import AutoTokenizer, ModernBertModel
    tok = AutoTokenizer.from_pretrained(BASE, revision=REVISION, cache_dir=cache)
    encoder = ModernBertModel.from_pretrained(BASE, revision=REVISION, cache_dir=cache,
                                            attn_implementation="eager", reference_compile=False)
    encoder.config.reference_compile = False
    encoder.gradient_checkpointing_enable()
    return tok, ModernReader(encoder, len(layout.acts), layout.class_sizes, len(layout.tags))


def data_manifest(data):
    data = Path(data)
    rows, cuts = read(data / "train.jsonl"), read(data / "cut_train.jsonl")
    if (len(cuts), len(rows)) != (24698, 54584):
        raise ValueError(f"ALL data count mismatch: messages={len(cuts)}, requests={len(rows)}; expected 24698/54584")
    if read(data / "heldout.jsonl") or read(data / "cut_heldout.jsonl"):
        raise ValueError("ALL data must have no held-out rows")
    manifest = {"messages": len(cuts), "requests": len(rows), "extra_dirs": EXTRAS,
                "files": {p.name: sha(p) for p in sorted(data.glob("*.json*"))}}
    return rows, cuts, manifest


def rng_state():
    return {"python": random.getstate(), "numpy": np.random.get_state(), "torch": torch.get_rng_state(),
            "mps": torch.mps.get_rng_state() if torch.backends.mps.is_available() else None}


def restore_rng(state):
    random.setstate(state["python"]); np.random.set_state(state["numpy"]); torch.set_rng_state(state["torch"])
    if state["mps"] is not None: torch.mps.set_rng_state(state["mps"])


def memory():
    import psutil
    return {"rss": psutil.Process().memory_info().rss, "available": psutil.virtual_memory().available,
            "mps_allocated": torch.mps.current_allocated_memory(), "mps_driver": torch.mps.driver_allocated_memory()}


def check_resources(elapsed, pilot):
    m = memory()
    if m["rss"] > 8 * GIB or m["available"] < 2 * GIB:
        raise RuntimeError("Resource stop: " + json.dumps(m))
    if elapsed >= 4 * 3600 or (pilot and elapsed >= 30 * 60): raise RuntimeError("Preregistered wall-time cap")
    return m


def gradients(model):
    seen = {}
    for name, p in model.named_parameters():
        if p.grad is None: continue
        if not torch.isfinite(p.grad).all().item(): raise RuntimeError("Non-finite gradient: " + name)
        group = name.split(".")[0]
        seen[group] = seen.get(group, False) or bool(torch.any(p.grad != 0).item())
    if not all(seen.get(k) for k in ("encoder", "pre", "act", "classes", "tags", "cut")):
        raise RuntimeError("Missing/nonzero gradient evidence: " + json.dumps(seen))
    return seen


def request_loss(model, tok, row, layout, device):
    x, lab, ps = encode(tok, [row], layout, 128, device)
    tl, sl, _ = model(**x)
    ce = nn.functional.cross_entropy
    loss = ce(sl[:, :len(layout.acts)], torch.tensor([layout.act_id[row["act"]]], device=device))
    target = layout.class_targets(row)
    loss = loss + sum(ce(sl[:, s:s + c], torch.tensor([target[i]], device=device))
                      for i, (s, c) in enumerate(zip(layout.offsets[:-1], layout.class_sizes))) / len(layout.classes)
    if bool((lab != -100).any()): loss = loss + ce(tl.flatten(0, 1), lab.flatten(), ignore_index=-100)
    return loss, ps[0]["truncated"]


def cut_loss(model, tok, row, layout, device):
    x, lab, ps = encode(tok, [row], layout, 512, device, CUT_ID)
    _, _, cl = model(**x)
    loss = nn.functional.cross_entropy(cl.flatten(0, 1), lab.flatten(), ignore_index=-100)
    return loss, ps[0]["truncated"]


def save_checkpoint(path, model, opt, sch, state, metadata):
    payload = {"model": model.state_dict(), "optimizer": opt.state_dict(), "scheduler": sch.state_dict(),
               "rng": rng_state(), "state": state, "metadata": metadata,
               "gradients": {n: p.grad.detach().cpu() for n, p in model.named_parameters() if p.grad is not None}}
    temp = path.with_suffix(".tmp")
    torch.save(payload, temp)
    os.replace(temp, path)


def rollback_group(state, opt):
    group = state.get("group_start")
    if group is None: raise RuntimeError("Cannot roll back accumulation without its start state")
    (state["request_pos"], state["cut_pos"], state["cut_order"], rng,
     state["truncated_requests"], state["truncated_messages"]) = group
    restore_rng(rng); state["accumulated"] = 0; opt.zero_grad(set_to_none=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--work", required=True, type=Path)
    ap.add_argument("--cache", default=str(Path.home() / ".cache/diagram-vss-modernbert/hf"))
    ap.add_argument("--prepare-data", action="store_true")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--continue-after-pilot", action="store_true")
    a = ap.parse_args()
    repo = Path(__file__).resolve().parents[2]
    if a.work.resolve().is_relative_to(repo) or a.data.resolve().is_relative_to(repo):
        raise SystemExit("Data/checkpoints must stay outside git")
    a.work.mkdir(parents=True, exist_ok=True)
    if a.prepare_data:
        env = dict(os.environ, EXTRA_DIRS=" ".join(EXTRAS))
        subprocess.run([sys.executable, str(Path(__file__).with_name("make_roles.py")), "--all", "--out", str(a.data)], env=env, check=True)
        _, _, manifest = data_manifest(a.data)
        write_json(a.work / "data_manifest.json", manifest)
        return
    if os.environ.get("PYTORCH_ENABLE_MPS_FALLBACK") == "1": raise SystemExit("MPS CPU fallback is forbidden")
    if not torch.backends.mps.is_available(): raise SystemExit("Native MPS is required")
    random.seed(0); np.random.seed(0); torch.manual_seed(0)
    recommended = torch.mps.recommended_max_memory()
    torch.mps.set_per_process_memory_fraction(4 * GIB / recommended)
    rows, cuts, manifest = data_manifest(a.data)
    R = json.loads((a.data / "reader.json").read_text()); layout = Layout(R)
    metadata = {"base": BASE, "revision": REVISION, "settings": SETTINGS, "data": manifest,
                "tokenization": POLICY, "device": "mps", "platform": platform.platform(), "python": sys.version,
                "versions": {p: importlib.metadata.version(p) for p in ("torch", "transformers", "tokenizers", "numpy", "onnx", "onnxruntime", "psutil")},
                "mps_recommended": recommended, "mps_allocator_limit": 4 * GIB,
                "sources": {n: sha(Path(__file__).with_name(n)) for n in ("finetune_modernbert.py", "modernbert_tokenization.py", "finetune_roles.py", "make_roles.py", "make_data.py")}}
    write_json(a.work / "environment.json", metadata)
    tok, model = build(layout, a.cache); model.to("mps").float(); model.train()
    opt = torch.optim.AdamW(model.parameters(), lr=SETTINGS["lr"], weight_decay=.01, foreach=False)
    from transformers import get_linear_schedule_with_warmup
    total_updates = math.ceil(len(rows) / 16)
    sch = get_linear_schedule_with_warmup(opt, int(.06 * total_updates), total_updates)
    order, cut_order = list(range(len(rows))), list(range(len(cuts)))
    random.shuffle(order); random.shuffle(cut_order)
    state = dict(order=order, cut_order=cut_order, request_pos=0, cut_pos=0, update=0, accumulated=0,
                 elapsed=0., truncated_requests=0, truncated_messages=0, pilot=None)
    checkpoint = a.work / "checkpoint.pt"
    if a.resume:
        ck = torch.load(checkpoint, map_location="cpu", weights_only=False)
        for key in ("base", "revision", "settings", "data", "tokenization", "sources"):
            if ck["metadata"][key] != metadata[key]: raise RuntimeError("Resume contract changed: " + key)
        model.load_state_dict(ck["model"]); opt.load_state_dict(ck["optimizer"]); sch.load_state_dict(ck["scheduler"])
        state = ck["state"]
        for n, p in model.named_parameters():
            if n in ck["gradients"]: p.grad = ck["gradients"][n].to("mps")
        restore_rng(ck["rng"])
        del ck
        if not (0 <= state["request_pos"] <= len(rows) and 0 <= state["accumulated"] <= 16
                and state["accumulated"] <= state["request_pos"] and 0 <= state["cut_pos"] <= len(cuts)):
            raise RuntimeError("Checkpoint positions are outside the fixed epoch")
        if state["accumulated"] > 0 and state["accumulated"] >= min(16, len(rows) - (state["request_pos"] - state["accumulated"])):
            rollback_group(state, opt)
        stopped = a.work / "stopped.json"
        if stopped.exists(): state["elapsed"] = max(state["elapsed"], json.loads(stopped.read_text())["elapsed"])
    elif checkpoint.exists(): raise SystemExit("Checkpoint exists: explicitly --resume")
    if state["pilot"] and not a.continue_after_pilot:
        print("Pilot already complete; continuation requires --resume --continue-after-pilot")
        return
    if state["pilot"] and not state["pilot"]["passed"]: raise SystemExit("Pilot failed; no continuation")
    start, previous_elapsed = time.monotonic(), state["elapsed"]
    elapsed = lambda: previous_elapsed + time.monotonic() - start
    log = open(a.work / "train.jsonl", "a", buffering=1)
    safe_pair, transition_dirty = True, False
    group_state = state.get("group_start")
    try:
        # A durable pre-transition state must exist even when the first AdamW step fails.
        if not a.resume: save_checkpoint(checkpoint, model, opt, sch, state, metadata)
        while state["request_pos"] < len(rows):
            m = check_resources(elapsed(), state["update"] < 8)
            if state["accumulated"] == 0:
                group_state = (state["request_pos"], state["cut_pos"], list(state["cut_order"]), rng_state(),
                               state["truncated_requests"], state["truncated_messages"])
                state["group_start"] = group_state
                opt.zero_grad(set_to_none=True)
            group_size = min(16, len(rows) - (state["request_pos"] - state["accumulated"]))
            if state["cut_pos"] == len(cuts):
                random.shuffle(state["cut_order"]); state["cut_pos"] = 0
            row = rows[state["order"][state["request_pos"]]]
            crow = cuts[state["cut_order"][state["cut_pos"]]]
            safe_pair = False
            rl, rt = request_loss(model, tok, row, layout, "mps")
            if not torch.isfinite(rl).item(): raise RuntimeError("Non-finite request loss")
            (rl / group_size).backward()
            cl, ct = cut_loss(model, tok, crow, layout, "mps")
            if not torch.isfinite(cl).item(): raise RuntimeError("Non-finite cut loss")
            (cl / group_size).backward()
            state["request_pos"] += 1; state["cut_pos"] += 1; state["accumulated"] += 1
            state["truncated_requests"] += rt; state["truncated_messages"] += ct
            log.write(json.dumps({"request": state["request_pos"], "update": state["update"], "request_loss": rl.item(), "cut_loss": cl.item(), "elapsed": elapsed(), **m}, allow_nan=False) + "\n")
            del rl, cl
            safe_pair = True
            if state["accumulated"] == group_size:
                # Gradient inspection/clipping may fail or be interrupted: rerun this group.
                safe_pair = False
                evidence = gradients(model)
                norm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1., error_if_nonfinite=True)
                # Neither optimizer nor scheduler mutation is transactional. Preserve the
                # previous durable checkpoint if this transition does not finish.
                transition_dirty = True
                opt.step(); sch.step(); opt.zero_grad(set_to_none=True)
                state["update"] += 1; state["accumulated"] = 0
                safe_pair = True; transition_dirty = False
                if state["update"] == 8:
                    torch.mps.synchronize()
                    projected = elapsed() * len(rows) / state["request_pos"]
                    state["pilot"] = {"passed": projected <= 4 * 3600 and elapsed() <= 1800,
                                      "elapsed": elapsed(), "projected_seconds": projected,
                                      "requests": state["request_pos"], "cut_microbatches": state["request_pos"],
                                      "gradients": evidence, "gradient_norm": float(norm), "native_mps": True}
                    write_json(a.work / "pilot.json", state["pilot"])
                    state["elapsed"] = elapsed(); save_checkpoint(checkpoint, model, opt, sch, state, metadata)
                    if not state["pilot"]["passed"]: raise RuntimeError("Pilot did not satisfy preregistered limits")
                    if not a.continue_after_pilot:
                        print(json.dumps({"status": "pilot_pending_continuation", **state["pilot"]})); return
                elif state["update"] % 32 == 0:
                    state["elapsed"] = elapsed(); save_checkpoint(checkpoint, model, opt, sch, state, metadata)
        state["elapsed"] = elapsed(); save_checkpoint(checkpoint, model, opt, sch, state, metadata)
        model.encoder.config.save_pretrained(a.work / "encoder_config"); tok.save_pretrained(a.work / "tokenizer")
        write_json(a.work / "complete.json", {"complete": True, "state": {k: v for k, v in state.items() if k not in ("order", "cut_order", "group_start")}, "metadata": metadata})
        print("One complete request epoch finished; export is a separate CPU command")
    except BaseException as exc:
        state["elapsed"] = elapsed()
        write_json(a.work / "stopped.json", {"reason": str(exc), "elapsed": state["elapsed"], "request_pos": state["request_pos"],
                                            "accumulated": state["accumulated"], "uncertain_transition": transition_dirty})
        if not transition_dirty:
            if not safe_pair and group_state is not None: rollback_group(state, opt)
            save_checkpoint(checkpoint, model, opt, sch, state, metadata)
        raise
    finally: log.close()


if __name__ == "__main__": main()
