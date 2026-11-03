"""Fixed preregistered ModernBERT ALL run. The eight-update pilot stops by default.

No model is downloaded on import. See MODERNBERT_PLAN.md for the protocol. Run
--prepare-data once, then --data DIR --work DIR; resume the same checkpoint with
--resume and, only after source/pilot approval, --continue-after-pilot.
"""
import argparse
from contextlib import ExitStack
import fcntl
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import random
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

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
IDENTITY_KEYS = ("base", "revision", "settings", "data", "tokenization", "sources", "device", "gpu_uuid", "versions", "torch_build", "numerics")


class RunLock:
    """Advisory ownership held by an open descriptor; never unlink another lock."""
    def __init__(self, path): self.path, self.handle = Path(path), None

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.handle = self.path.open("a+")
        try: fcntl.flock(self.handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.handle.close(); self.handle = None
            raise RuntimeError("Run/device already owned: " + str(self.path)) from None
        return self

    def __exit__(self, *_):
        if self.handle is not None:
            fcntl.flock(self.handle, fcntl.LOCK_UN); self.handle.close(); self.handle = None


def cuda_selection(uuid):
    """Resolve the physical UUID before any CUDA runtime initialization."""
    visible = os.environ.get("CUDA_VISIBLE_DEVICES")
    uuid = uuid or visible
    if not uuid or not re.fullmatch(r"GPU-[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", uuid):
        raise RuntimeError("CUDA requires one physical GPU UUID via --gpu-uuid or CUDA_VISIBLE_DEVICES")
    if visible is not None and visible != uuid:
        raise RuntimeError("CUDA_VISIBLE_DEVICES must equal the selected physical UUID")
    if torch.cuda.is_initialized(): raise RuntimeError("CUDA was initialized before UUID selection")
    os.environ["CUDA_VISIBLE_DEVICES"] = uuid
    return uuid


def cuda_health(uuid):
    result = subprocess.run(["nvidia-smi", "-i", uuid, "-q", "-x"], capture_output=True, text=True, check=True)
    root = ET.fromstring(result.stdout)
    gpus = root.findall("gpu")
    if len(gpus) != 1 or gpus[0].findtext("uuid") != uuid:
        raise RuntimeError("nvidia-smi physical UUID mismatch")
    gpu = gpus[0]
    recovery = gpu.findtext("gpu_recovery_action")
    if recovery != "None": raise RuntimeError("GPU recovery action must be None: " + str(recovery))
    if any("C" in p.findtext("type", "C") for p in gpu.findall("processes/process_info")):
        raise RuntimeError("GPU has an existing compute workload")
    name = gpu.findtext("product_name")
    if name != "NVIDIA GeForce RTX 3060 Laptop GPU": raise RuntimeError("Unexpected GPU: " + str(name))
    return {"gpu_uuid": uuid, "gpu_name": name, "gpu_driver": root.findtext("driver_version"), "gpu_recovery_action": recovery}


class Backend:
    def __init__(self, name="mps", identity=None):
        self.name, self.identity = name, identity or {}

    def synchronize(self):
        if self.name == "cuda": torch.cuda.synchronize(0)
        elif self.name == "mps": torch.mps.synchronize()

    def seed(self, seed):
        # torch.manual_seed seeds every accelerator, including unselected backends.
        random.seed(seed); np.random.seed(seed); torch.random.default_generator.manual_seed(seed)
        if self.name == "cuda": torch.cuda.manual_seed(seed)
        elif self.name == "mps": torch.mps.manual_seed(seed)

    def rng(self):
        if self.name == "cuda": return torch.cuda.get_rng_state(0)
        if self.name == "mps": return torch.mps.get_rng_state()
        return None

    def restore(self, value):
        if self.name == "cuda": torch.cuda.set_rng_state(value, 0)
        elif self.name == "mps": torch.mps.set_rng_state(value)

    def memory(self):
        if self.name == "cuda":
            free, total = torch.cuda.mem_get_info(0)
            return dict(cuda_allocated=torch.cuda.memory_allocated(0), cuda_reserved=torch.cuda.memory_reserved(0),
                        cuda_peak_allocated=torch.cuda.max_memory_allocated(0), cuda_peak_reserved=torch.cuda.max_memory_reserved(0),
                        cuda_free=free, cuda_total=total)
        if self.name == "mps":
            return dict(mps_allocated=torch.mps.current_allocated_memory(), mps_driver=torch.mps.driver_allocated_memory())
        return {}

    def configure(self):
        torch.set_float32_matmul_precision("highest")
        if self.name == "cuda":
            if sys.version_info[:2] != (3, 12) or torch.__version__ != "2.15.0+cu132":
                raise RuntimeError("CUDA requires Python 3.12 and Torch 2.15.0+cu132")
            if not torch.cuda.is_available() or torch.cuda.device_count() != 1:
                raise RuntimeError("Exactly one native visible CUDA GPU is required")
            props = torch.cuda.get_device_properties(0)
            actual = str(props.uuid)
            if actual != self.identity["gpu_uuid"]: raise RuntimeError("CUDA physical UUID mismatch: " + actual)
            if props.total_memory < 4 * GIB: raise RuntimeError("GPU total memory is below allocator cap")
            torch.backends.cuda.matmul.allow_tf32 = False
            torch.backends.cudnn.allow_tf32 = False
            torch.cuda.set_per_process_memory_fraction(4 * GIB / props.total_memory, 0)
            self.identity.update(cuda_total=props.total_memory, cuda_allocator_limit=4 * GIB,
                                 cuda_capability=list(torch.cuda.get_device_capability(0)), cuda_runtime=torch.version.cuda)
        elif self.name == "mps":
            if os.environ.get("PYTORCH_ENABLE_MPS_FALLBACK") == "1": raise RuntimeError("MPS CPU fallback is forbidden")
            if not torch.backends.mps.is_available(): raise RuntimeError("Native MPS is required")
            recommended = torch.mps.recommended_max_memory()
            torch.mps.set_per_process_memory_fraction(4 * GIB / recommended)
            self.identity.update(mps_recommended=recommended, mps_allocator_limit=4 * GIB)
        else: raise RuntimeError("Training requires native MPS or CUDA")
        return self.identity


def validate_resume(metadata, previous):
    for key in IDENTITY_KEYS:
        if previous.get(key) != metadata.get(key): raise RuntimeError("Resume contract changed: " + key)


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


def rng_state(backend=None):
    if backend is None: backend = Backend("mps" if torch.backends.mps.is_available() else "cpu")
    return {"python": random.getstate(), "numpy": np.random.get_state(), "torch": torch.get_rng_state(),
            "backend": backend.name, "gpu_uuid": backend.identity.get("gpu_uuid"), "device_rng": backend.rng()}


def restore_rng(state, backend=None):
    if backend is None: backend = Backend(state.get("backend", "mps" if state.get("mps") is not None else "cpu"))
    if state.get("backend", backend.name) != backend.name or state.get("gpu_uuid") != backend.identity.get("gpu_uuid"):
        raise RuntimeError("RNG backend/UUID mismatch")
    random.setstate(state["python"]); np.random.set_state(state["numpy"]); torch.set_rng_state(state["torch"])
    value = state.get("device_rng", state.get("mps"))
    if value is not None: backend.restore(value)


def memory(backend=None):
    import psutil
    return {"rss": psutil.Process().memory_info().rss, "available": psutil.virtual_memory().available,
            **(backend or Backend()).memory()}


def check_resources(elapsed, pilot, backend=None):
    m = memory(backend) if backend is not None else memory()
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


def save_checkpoint(path, model, opt, sch, state, metadata, backend=None):
    payload = {"model": model.state_dict(), "optimizer": opt.state_dict(), "scheduler": sch.state_dict(),
               "rng": rng_state(backend), "state": state, "metadata": metadata,
               "gradients": {n: p.grad.detach().cpu() for n, p in model.named_parameters() if p.grad is not None}}
    temp = path.with_suffix(".tmp")
    torch.save(payload, temp)
    os.replace(temp, path)


def rollback_group(state, opt, backend=None):
    group = state.get("group_start")
    if group is None: raise RuntimeError("Cannot roll back accumulation without its start state")
    (state["request_pos"], state["cut_pos"], state["cut_order"], rng,
     state["truncated_requests"], state["truncated_messages"]) = group
    restore_rng(rng, backend); state["accumulated"] = 0; opt.zero_grad(set_to_none=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--work", required=True, type=Path)
    ap.add_argument("--cache", default=str(Path.home() / ".cache/diagram-vss-modernbert/hf"))
    ap.add_argument("--prepare-data", action="store_true")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--continue-after-pilot", action="store_true")
    ap.add_argument("--device", choices=("mps", "cuda"), default="mps")
    ap.add_argument("--gpu-uuid")
    a = ap.parse_args()
    repo = Path(__file__).resolve().parents[2]
    if a.work.resolve().is_relative_to(repo) or a.data.resolve().is_relative_to(repo):
        raise SystemExit("Data/checkpoints must stay outside git")
    with ExitStack() as ownership:
        ownership.enter_context(RunLock(a.work / ".run.lock"))
        backend = Backend(a.device)
        if not a.prepare_data and a.device == "cuda":
            uuid = cuda_selection(a.gpu_uuid)
            ownership.enter_context(RunLock(Path.home() / ".cache/diagram-vss-modernbert/locks" / (uuid + ".lock")))
            backend.identity = cuda_health(uuid)
        run(a, backend)


def run(a, backend):
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
    if backend.name == "cuda" and not a.resume and any(p.name != ".run.lock" for p in a.work.iterdir()):
        raise RuntimeError("Fresh CUDA run requires an empty work directory")
    device_metadata = backend.configure()
    rows, cuts, manifest = data_manifest(a.data)
    R = json.loads((a.data / "reader.json").read_text()); layout = Layout(R)
    metadata = {"base": BASE, "revision": REVISION, "settings": SETTINGS, "data": manifest,
                "tokenization": POLICY, "device": backend.name, "platform": platform.platform(), "python": sys.version,
                "versions": {p: importlib.metadata.version(p) for p in ("torch", "transformers", "tokenizers", "numpy", "onnx", "onnxruntime", "psutil")},
                **device_metadata, "torch_build": torch.__config__.show(),
                "numerics": {"dtype": "float32", "matmul_precision": "highest", "tf32": False, "amp": False, "grad_scaler": False},
                "sources": {n: sha(Path(__file__).with_name(n)) for n in ("finetune_modernbert.py", "modernbert_tokenization.py", "finetune_roles.py", "make_roles.py", "make_data.py")}}
    checkpoint = a.work / "checkpoint.pt"
    ck = None
    if a.resume:
        ck = torch.load(checkpoint, map_location="cpu", weights_only=False)
        validate_resume(metadata, ck["metadata"])
        if (a.work / "complete.json").exists():
            if ck["state"]["request_pos"] != len(rows) or ck["state"]["accumulated"] != 0:
                raise RuntimeError("Completed checkpoint state is inconsistent")
            print("One complete request epoch already finished; no mutation")
            return
    elif checkpoint.exists(): raise SystemExit("Checkpoint exists: explicitly --resume")
    write_json(a.work / "environment.json", metadata)
    backend.seed(0)
    tok, model = build(layout, a.cache); model.to(backend.name).float(); model.train()
    opt = torch.optim.AdamW(model.parameters(), lr=SETTINGS["lr"], weight_decay=.01, foreach=False)
    from transformers import get_linear_schedule_with_warmup
    total_updates = math.ceil(len(rows) / 16)
    sch = get_linear_schedule_with_warmup(opt, int(.06 * total_updates), total_updates)
    order, cut_order = list(range(len(rows))), list(range(len(cuts)))
    random.shuffle(order); random.shuffle(cut_order)
    state = dict(order=order, cut_order=cut_order, request_pos=0, cut_pos=0, update=0, accumulated=0,
                 elapsed=0., truncated_requests=0, truncated_messages=0, pilot=None)
    if a.resume:
        model.load_state_dict(ck["model"]); opt.load_state_dict(ck["optimizer"]); sch.load_state_dict(ck["scheduler"])
        state = ck["state"]
        for n, p in model.named_parameters():
            if n in ck["gradients"]: p.grad = ck["gradients"][n].to(backend.name)
        restore_rng(ck["rng"], backend)
        del ck
        if not (0 <= state["request_pos"] <= len(rows) and 0 <= state["accumulated"] <= 16
                and state["accumulated"] <= state["request_pos"] and 0 <= state["cut_pos"] <= len(cuts)):
            raise RuntimeError("Checkpoint positions are outside the fixed epoch")
        if state["accumulated"] > 0 and state["accumulated"] >= min(16, len(rows) - (state["request_pos"] - state["accumulated"])):
            rollback_group(state, opt, backend)
        stopped = a.work / "stopped.json"
        if stopped.exists(): state["elapsed"] = max(state["elapsed"], json.loads(stopped.read_text())["elapsed"])
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
        if not a.resume: save_checkpoint(checkpoint, model, opt, sch, state, metadata, backend)
        while state["request_pos"] < len(rows):
            m = check_resources(elapsed(), state["update"] < 8, backend)
            if state["accumulated"] == 0:
                group_state = (state["request_pos"], state["cut_pos"], list(state["cut_order"]), rng_state(backend),
                               state["truncated_requests"], state["truncated_messages"])
                state["group_start"] = group_state
                opt.zero_grad(set_to_none=True)
            group_size = min(16, len(rows) - (state["request_pos"] - state["accumulated"]))
            if state["cut_pos"] == len(cuts):
                random.shuffle(state["cut_order"]); state["cut_pos"] = 0
            row = rows[state["order"][state["request_pos"]]]
            crow = cuts[state["cut_order"][state["cut_pos"]]]
            safe_pair = False
            rl, rt = request_loss(model, tok, row, layout, backend.name)
            if not torch.isfinite(rl).item(): raise RuntimeError("Non-finite request loss")
            (rl / group_size).backward()
            cl, ct = cut_loss(model, tok, crow, layout, backend.name)
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
                    backend.synchronize()
                    m = check_resources(elapsed(), True, backend)
                    projected = elapsed() * len(rows) / state["request_pos"]
                    state["pilot"] = {"passed": projected <= 4 * 3600 and elapsed() <= 1800,
                                      "elapsed": elapsed(), "projected_seconds": projected,
                                      "requests": state["request_pos"], "cut_microbatches": state["request_pos"],
                                      "gradients": evidence, "gradient_norm": float(norm), "native_mps": backend.name == "mps", "native_cuda": backend.name == "cuda", "memory": m}
                    write_json(a.work / "pilot.json", state["pilot"])
                    state["elapsed"] = elapsed(); save_checkpoint(checkpoint, model, opt, sch, state, metadata, backend)
                    if not state["pilot"]["passed"]: raise RuntimeError("Pilot did not satisfy preregistered limits")
                    if not a.continue_after_pilot:
                        print(json.dumps({"status": "pilot_pending_continuation", **state["pilot"]})); return
                elif state["update"] % 32 == 0:
                    state["elapsed"] = elapsed(); save_checkpoint(checkpoint, model, opt, sch, state, metadata, backend)
        state["elapsed"] = elapsed(); save_checkpoint(checkpoint, model, opt, sch, state, metadata, backend)
        model.encoder.config.save_pretrained(a.work / "encoder_config"); tok.save_pretrained(a.work / "tokenizer")
        write_json(a.work / "complete.json", {"complete": True, "state": {k: v for k, v in state.items() if k not in ("order", "cut_order", "group_start")}, "metadata": metadata})
        print("One complete request epoch finished; export is a separate CPU command")
    except BaseException as exc:
        state["elapsed"] = elapsed()
        write_json(a.work / "stopped.json", {"reason": str(exc), "elapsed": state["elapsed"], "request_pos": state["request_pos"],
                                            "accumulated": state["accumulated"], "uncertain_transition": transition_dirty})
        if not transition_dirty:
            if not safe_pair and group_state is not None: rollback_group(state, opt, backend)
            save_checkpoint(checkpoint, model, opt, sch, state, metadata, backend)
        raise
    finally: log.close()


if __name__ == "__main__": main()
