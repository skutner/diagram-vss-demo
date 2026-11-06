"""first_run_fit.py, a diagnostic for MODERNBERT_PARITY_PLAN.md. (1) The first ModernBERT checkpoint on 1,000 of its OWN training rows: per-key accuracy of the class heads, act, tags.
(2) A from-the-base overfit test on 200 training rows with its recipe's optimizer settings: can these heads fit at all, how fast, at which learning rate.
Nothing is written. The frozen checkpoint is only read.
Run with the task venv, one visible GPU and the GPU lock (README.md)."""
import json, os, random, sys, time, gc
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import torch, numpy as np
from torch import nn
from finetune_roles import Layout, read
from modernbert_tokenization import encode
from transformers import AutoTokenizer, ModernBertModel
from finetune_modernbert import ModernReader, BASE, REVISION

C = Path.home() / ".cache/diagram-vss-modernbert"
rows = read(C / "roles/train.jsonl"); R = json.loads((C / "roles/reader.json").read_text()); L = Layout(R)
tok = AutoTokenizer.from_pretrained(BASE, revision=REVISION, cache_dir=str(C / "hf"), local_files_only=True)
dev = "cuda"


def fresh(attn="sdpa"):
    enc = ModernBertModel.from_pretrained(BASE, revision=REVISION, cache_dir=str(C / "hf"), attn_implementation=attn, reference_compile=False, local_files_only=True)
    return ModernReader(enc, len(L.acts), L.class_sizes, len(L.tags)).to(dev)


@torch.no_grad()
def measure(model, sample, bs=32):
    model.eval()
    act_ok = 0; tag_ok = tag_n = 0; keys = {}
    for i in range(0, len(sample), bs):
        part = sample[i:i + bs]
        x, lab, ps = encode(tok, part, L, 128, dev)
        with torch.autocast("cuda", dtype=torch.bfloat16):
            tl, sl, _ = model(**x)
        tl, sl = tl.float(), sl.float()
        pa = sl[:, :len(L.acts)].argmax(-1).tolist()
        for j, r in enumerate(part):
            act_ok += pa[j] == L.act_id[r["act"]]
            t = L.class_targets(r)
            for h, (s, c) in enumerate(zip(L.offsets[:-1], L.class_sizes)):
                k = L.classes[h][0]; p = sl[j, s:s + c].argmax().item()
                d = keys.setdefault(k, dict(val_n=0, val_ok=0, none_n=0, none_ok=0, pred_none_when_val=0))
                if t[h] > 0:
                    d["val_n"] += 1; d["val_ok"] += p == t[h]; d["pred_none_when_val"] += p == 0
                else:
                    d["none_n"] += 1; d["none_ok"] += p == 0
        m = lab != -100
        tag_ok += (tl.argmax(-1)[m] == lab[m]).sum().item(); tag_n += m.sum().item()
    return dict(n=len(sample), act=round(act_ok / len(sample), 4), tag=round(tag_ok / max(tag_n, 1), 4), keys=keys)


def show(title, res, top=("color", "shape", "size", "style", "position", "direction", "layout", "arrow", "fill:target", "fill:from", "desc:shape", "desc:color", "desc:quantifier")):
    print(f"--- {title}: rows {res['n']}, act {res['act']}, word tags {res['tag']}")
    for k in top:
        d = res["keys"].get(k)
        if d and d["val_n"]:
            print(f"    {k:15} with a value: right {d['val_ok']:4}/{d['val_n']:<4} = {100*d['val_ok']/d['val_n']:5.1f}% (said none {d['pred_none_when_val']:4}); no value: right {100*d['none_ok']/max(d['none_n'],1):5.1f}%")
    vn = sum(d["val_n"] for d in res["keys"].values()); vo = sum(d["val_ok"] for d in res["keys"].values())
    print(f"    all class heads, rows with a value: {vo}/{vn} = {100*vo/max(vn,1):.1f}%", flush=True)


rng = random.Random(0); idx = list(range(len(rows))); rng.shuffle(idx)
seen = [rows[i] for i in idx[:1000]]
print("rows", len(rows), "classes", len(L.classes), "acts", len(L.acts), "tags", len(L.tags), flush=True)

# (1) the checkpoint on its own training rows
ck = torch.load(C / "cuda-run-0e25611/checkpoint.pt", map_location="cpu", weights_only=False)
m = fresh("eager"); m.load_state_dict(ck["model"]); print("checkpoint update", ck["state"]["update"], "request_pos", ck["state"]["request_pos"], flush=True)
show("first run checkpoint, 1000 of its own training rows", measure(m, seen))
del m, ck; gc.collect(); torch.cuda.empty_cache()


def request_batch_loss(model, part):
    x, lab, _ = encode(tok, part, L, 128, dev)
    with torch.autocast("cuda", dtype=torch.bfloat16):
        tl, sl, _ = model(**x)
    tl, sl = tl.float(), sl.float(); ce = nn.functional.cross_entropy
    ya = torch.tensor([L.act_id[r["act"]] for r in part], device=dev)
    yc = torch.tensor([L.class_targets(r) for r in part], device=dev)
    loss = ce(sl[:, :len(L.acts)], ya)
    loss = loss + sum(ce(sl[:, s:s + c], yc[:, i]) for i, (s, c) in enumerate(zip(L.offsets[:-1], L.class_sizes))) / len(L.classes)
    if (lab != -100).any(): loss = loss + ce(tl.flatten(0, 1), lab.flatten(), ignore_index=-100)
    return loss


# (2) overfit test on 200 rows, from the base weights. Same rows, batch 16, a constant learning rate, measured at fixed updates.
few = [rows[i] for i in idx[1000:1200]]
for lr, head_lr in [(3e-5, 3e-5), (6e-5, 6e-5), (6e-5, 6e-4)]:
    torch.manual_seed(0); random.seed(0)
    model = fresh(); model.train()
    enc_params = [p for n, p in model.named_parameters() if n.startswith("encoder.")]
    head_params = [p for n, p in model.named_parameters() if not n.startswith("encoder.")]
    opt = torch.optim.AdamW([dict(params=enc_params, lr=lr), dict(params=head_params, lr=head_lr)], weight_decay=.01, fused=True)
    t0 = time.time(); order = []
    for up in range(1, 401):
        if len(order) < 16: order = random.sample(range(len(few)), len(few))
        part = [few[order.pop()] for _ in range(16)]
        loss = request_batch_loss(model, part)
        loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.); opt.step(); opt.zero_grad(set_to_none=True)
        if up in (100, 200, 400):
            show(f"overfit test lr {lr} head lr {head_lr}: update {up} ({up*16/200:.0f} passes over the 200 rows), loss {loss.item():.3f}, {time.time()-t0:.0f}s", measure(model, few))
            model.train()
    del model, opt; gc.collect(); torch.cuda.empty_cache()
