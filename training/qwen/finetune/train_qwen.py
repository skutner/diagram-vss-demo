"""train_qwen.py: LoRA fine-tuning of the shipped Qwen3-0.6B (QWEN3_FINETUNE_PLAN.md section 4, arm Q1's recipe) in the line format.

  CUDA_VISIBLE_DEVICES=GPU-905b8484-3b1e-30f6-defd-05d44f00f692 flock -n LOCK python train_qwen.py --examples EX.jsonl --gguf GGUF --base DIR \
      --out RUNDIR [--epochs 2] [--rows-per-update 32] [--lr 2e-4] [--warmup 0.03] [--seed 0] [--token-budget 8192] [--deadline ISO]

Fixed recipe (the plan's Q1, not tuned): base = the shipped GGUF dequantized (qwen_lib.load_gguf_weights), held in BF16; LoRA r=16,
alpha=32 on q,k,v,o,gate,up,down of all 28 layers (196 modules), FP32 LoRA weights and AdamW state, no weight decay; lr 2e-4, linear
warm-up over the first 3% of updates then cosine decay to 0; 2 epochs; 32 rows per update; seed 0; loss on the target tokens and the
closing <|im_end|> only (qwen_lib.Tok.example). BF16 autocast, SDPA, gradient checkpointing. An update's 32 rows are cut into micro-batches
of at most --token-budget padded tokens (a memory setting: the gradient is the same sum, divided by the update's target tokens).
Order: a seeded permutation per epoch. Resumable: RUNDIR/ckpt.pt (LoRA, optimizer, step, RNG) every --save-every updates; a run that finds
it continues. --deadline: stops cleanly (checkpoint written, exit 3) when the next update could not finish before it.
Writes RUNDIR/lora.pt (LoRA weights), RUNDIR/train_log.jsonl, RUNDIR/train_summary.json; --merge also RUNDIR/merged.pt (FP32 HF state dict,
the input of write_gguf.py --weights).
"""
import argparse, datetime, hashlib, json, math, os, random, sys, time
import torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qwen_lib import load_gguf_weights, build_model, add_lora, lora_params, merge_lora, Tok, IM_END

ap = argparse.ArgumentParser()
for k, d in [('--examples', None), ('--gguf', None), ('--base', None), ('--out', None)]: ap.add_argument(k, required=True)
ap.add_argument('--epochs', type=float, default=2); ap.add_argument('--rows-per-update', type=int, default=32); ap.add_argument('--lr', type=float, default=2e-4)
ap.add_argument('--warmup', type=float, default=0.03); ap.add_argument('--seed', type=int, default=0); ap.add_argument('--token-budget', type=int, default=8192)
ap.add_argument('--save-every', type=int, default=100); ap.add_argument('--deadline', default=None); ap.add_argument('--merge', action='store_true')
ap.add_argument('--no-ckpt-grad', action='store_true'); ap.add_argument('--max-updates', type=int, default=None)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
deadline = datetime.datetime.fromisoformat(a.deadline).timestamp() if a.deadline else None
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
random.seed(a.seed); torch.manual_seed(a.seed)
dev = torch.device('cuda')
torch.backends.cuda.matmul.allow_tf32 = True

rows = [json.loads(l) for l in open(a.examples) if l.strip()]
tok = Tok(os.path.join(a.base, 'tokenizer.json'))
ex = [tok.example(r['system'], r['user'], r['target']) for r in rows]
n_upd_epoch = math.ceil(len(ex) / a.rows_per_update)
total = int(round(n_upd_epoch * a.epochs)) if a.max_updates is None else a.max_updates
warm = max(1, int(round(a.warmup * total)))
lr_at = lambda s: a.lr * (s / warm if s < warm else 0.5 * (1 + math.cos(math.pi * (s - warm) / max(1, total - warm))))

W, _ = load_gguf_weights(a.gguf)
model = build_model(os.path.join(a.base, 'config.json'), W, dtype=torch.bfloat16); del W
model.config._attn_implementation = 'sdpa'
n_mod = add_lora(model, 16, 32)
model.to(dev)
if not a.no_ckpt_grad: model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False}); model.config.use_cache = False
model.train()
params = lora_params(model)
opt = torch.optim.AdamW(params, lr=a.lr, weight_decay=0.0)
names = [n for n, p in model.named_parameters() if p.requires_grad]


def order_of(epoch):
    g = random.Random(a.seed * 1000003 + epoch); idx = list(range(len(ex))); g.shuffle(idx); return idx


def micro(idx):
    """rows of one update -> micro-batches of <= token_budget padded tokens (longest first inside the update)"""
    idx = sorted(idx, key=lambda i: -len(ex[i][0])); out, cur = [], []
    for i in idx:
        L = max([len(ex[j][0]) for j in cur + [i]])
        if cur and L * (len(cur) + 1) > a.token_budget: out.append(cur); cur = []
        cur.append(i)
    if cur: out.append(cur)
    return out


def loss_sum(idx):
    L = max(len(ex[i][0]) for i in idx)
    ids = torch.full((len(idx), L), IM_END, dtype=torch.long); mask = torch.zeros((len(idx), L), dtype=torch.bool); att = torch.zeros((len(idx), L), dtype=torch.long)
    for j, i in enumerate(idx):
        x, m = ex[i]; ids[j, :len(x)] = torch.tensor(x); mask[j, :len(m)] = torch.tensor(m, dtype=torch.bool); att[j, :len(x)] = 1
    ids, mask, att = ids.to(dev), mask.to(dev), att.to(dev)
    with torch.autocast('cuda', dtype=torch.bfloat16):
        h = model.model(input_ids=ids, attention_mask=att).last_hidden_state
        sel = mask[:, 1:]
        logits = model.lm_head(h[:, :-1][sel]).float()
    return torch.nn.functional.cross_entropy(logits, ids[:, 1:][sel], reduction='sum'), int(sel.sum())


ck = os.path.join(a.out, 'ckpt.pt'); step = 0
if os.path.exists(ck):
    st = torch.load(ck, map_location='cpu', weights_only=False)
    for n, p in model.named_parameters():
        if p.requires_grad: p.data.copy_(st['lora'][n].to(dev))
    opt.load_state_dict(st['opt']); step = st['step']; random.setstate(st['py_rng']); torch.set_rng_state(st['torch_rng'])
    print(json.dumps({'resumed_at': step}), flush=True)


def save(path, final=False):
    lora = {n: p.detach().cpu().clone() for n, p in model.named_parameters() if p.requires_grad}
    if final: torch.save(lora, path); return
    torch.save({'lora': lora, 'opt': opt.state_dict(), 'step': step, 'py_rng': random.getstate(), 'torch_rng': torch.get_rng_state()}, path + '.tmp'); os.replace(path + '.tmp', path)


log = open(os.path.join(a.out, 'train_log.jsonl'), 'a'); t0 = time.time(); times = []
info = {'examples': os.path.abspath(a.examples), 'examples_sha256': sha(a.examples), 'gguf_sha256': sha(a.gguf), 'rows': len(ex), 'updates': total, 'updates_per_epoch': n_upd_epoch,
        'warmup_updates': warm, 'lora_modules': n_mod, 'trainable': sum(p.numel() for p in params), 'recipe': {k: getattr(a, k) for k in ('epochs', 'rows_per_update', 'lr', 'warmup', 'seed', 'token_budget')},
        'code_sha256': {f: sha(os.path.join(os.path.dirname(os.path.abspath(__file__)), f)) for f in ('train_qwen.py', 'qwen_lib.py', 'weights_match.py')}, 'torch': torch.__version__}
json.dump(info, open(os.path.join(a.out, 'train_info.json'), 'w'), indent=1)
stopped = None
while step < total:
    if deadline and times and time.time() + 2 * max(times[-20:]) > deadline: stopped = 'deadline'; break
    ts = time.time()
    epoch, k = divmod(step, n_upd_epoch)
    order = order_of(epoch); idx = order[k * a.rows_per_update:(k + 1) * a.rows_per_update]
    if not idx: step += 1; continue
    for g in opt.param_groups: g['lr'] = lr_at(step)
    n_tgt = sum(sum(ex[i][1]) for i in idx); tot = 0.0
    opt.zero_grad(set_to_none=True)
    for mb in micro(idx):
        ls, n = loss_sum(mb); (ls / n_tgt).backward(); tot += ls.item()
    gn = torch.nn.utils.clip_grad_norm_(params, float('inf')).item()
    opt.step(); step += 1; times.append(time.time() - ts)
    if step % 10 == 0 or step == total:
        rec = {'step': step, 'epoch': round(step / n_upd_epoch, 3), 'loss': round(tot / n_tgt, 5), 'lr': lr_at(step - 1), 'grad_norm': round(gn, 4), 's_per_update': round(sum(times[-10:]) / len(times[-10:]), 3),
               'peak_gib': round(torch.cuda.max_memory_allocated() / 2**30, 2), 'elapsed_s': round(time.time() - t0)}
        log.write(json.dumps(rec) + '\n'); log.flush(); print(json.dumps(rec), flush=True)
    if step % a.save_every == 0: save(ck)
save(ck)
if stopped:
    print(json.dumps({'stopped': stopped, 'step': step}), flush=True); sys.exit(3)
save(os.path.join(a.out, 'lora.pt'), final=True)
summary = dict(info, finished=datetime.datetime.now().isoformat(), steps_done=step, wall_s=round(time.time() - t0), peak_cuda_allocated_gib=round(torch.cuda.max_memory_allocated() / 2**30, 2))
if a.merge:
    # the delta B @ A * scale of every LoRA module, added to the EXACT FP32 dequantized weights (not to the BF16 copy trained on)
    W, _ = load_gguf_weights(a.gguf); n_merged = 0
    for name, m in model.named_modules():
        if hasattr(m, 'A') and hasattr(m, 'B') and hasattr(m, 'base'):
            key = name + '.weight'
            if key.endswith('.base.weight'): key = key[:-len('.base.weight')] + '.weight'
            if key not in W: raise SystemExit('merge: no base weight for ' + name)
            W[key] = W[key] + (m.B.detach().float().cpu() @ m.A.detach().float().cpu()) * m.scale; n_merged += 1
    torch.save(W, os.path.join(a.out, 'merged.pt')); summary['merged'] = os.path.join(a.out, 'merged.pt'); summary['merged_modules'] = n_merged
json.dump(summary, open(os.path.join(a.out, 'train_summary.json'), 'w'), indent=1)
print(json.dumps({k: summary[k] for k in ('steps_done', 'wall_s', 'peak_cuda_allocated_gib')}), flush=True)
