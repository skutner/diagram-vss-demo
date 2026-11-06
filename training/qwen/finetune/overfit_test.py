"""overfit_test.py: can LoRA on the shipped Qwen3 weights learn the line format on a few of its own training rows?

  python overfit_test.py --examples EX.jsonl --gguf GGUF --base DIR --out OUT.json [--rows 20] [--steps 100] [--device cpu|cuda]

Fixed before the run (the gate of the plan's step Q1): LoRA r=16, alpha=32 on q,k,v,o,gate,up,down of all 28 layers, AdamW lr 2e-4,
batch 4, no weight decay, FP32 (CPU) or BF16 autocast (GPU), seed 0; the first `rows` examples of EX.jsonl that have at least one request.
It passes when, after at most `steps` updates, greedy decoding gives every row's target exactly (rows/rows). Also reported: the target loss
before and after, per 10 updates, seconds per update, peak memory, and the tokenization check against a running llama-server (TOKCHECK=url).
"""
import argparse, json, os, sys, time, resource
import torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qwen_lib import load_gguf_weights, build_model, add_lora, lora_params, Tok, render, IM_END

ap = argparse.ArgumentParser()
ap.add_argument('--examples', required=True); ap.add_argument('--gguf', required=True); ap.add_argument('--base', required=True)
ap.add_argument('--out', required=True); ap.add_argument('--rows', type=int, default=20); ap.add_argument('--steps', type=int, default=100)
ap.add_argument('--device', default='cpu'); ap.add_argument('--threads', type=int, default=6); ap.add_argument('--batch', type=int, default=4)
a = ap.parse_args()
torch.manual_seed(0); torch.set_num_threads(a.threads)
t0 = time.time()
rows = [r for r in map(json.loads, open(a.examples)) if r['requests'] > 0][:a.rows]
tok = Tok(os.path.join(a.base, 'tokenizer.json'))
ex = [tok.example(r['system'], r['user'], r['target']) for r in rows]
report = {'rows': len(rows), 'row_ids': [r['id'] for r in rows], 'tokens_per_row': [len(i) for i, _ in ex], 'target_tokens_per_row': [sum(m) for _, m in ex],
          'settings': {'r': 16, 'alpha': 32, 'lr': 2e-4, 'batch': a.batch, 'steps': a.steps, 'device': a.device, 'threads': a.threads}}

if os.environ.get('TOKCHECK'):   # the same text through the GGUF's tokenizer (llama-server /tokenize with special tokens parsed)
    import urllib.request
    bad = 0
    for r, (ids, _) in zip(rows, ex):
        head, tail = render(r['system'], r['user'], r['target'])
        req = urllib.request.Request(os.environ['TOKCHECK'] + '/tokenize', data=json.dumps({'content': head + tail, 'add_special': False, 'parse_special': True}).encode(), headers={'content-type': 'application/json'})
        if json.loads(urllib.request.urlopen(req).read())['tokens'] != ids: bad += 1
    report['tokenization_differs_from_gguf'] = bad

weights, _ = load_gguf_weights(a.gguf)
model = build_model(os.path.join(a.base, 'config.json'), weights)
del weights
n_lora = add_lora(model, 16, 32)
dev = torch.device(a.device); model.to(dev); model.train()
params = lora_params(model)
report['lora_modules'] = n_lora; report['trainable_params'] = sum(p.numel() for p in params)
opt = torch.optim.AdamW(params, lr=2e-4, weight_decay=0.0)


def batch_loss(idx):
    L = max(len(ex[i][0]) for i in idx)
    ids = torch.full((len(idx), L), IM_END, dtype=torch.long); mask = torch.zeros((len(idx), L)); att = torch.zeros((len(idx), L), dtype=torch.long)
    for j, i in enumerate(idx):
        x, m = ex[i]; ids[j, :len(x)] = torch.tensor(x); mask[j, :len(m)] = torch.tensor(m, dtype=torch.float); att[j, :len(x)] = 1
    ids, mask, att = ids.to(dev), mask.to(dev), att.to(dev)
    with torch.autocast(device_type=dev.type, dtype=torch.bfloat16, enabled=dev.type == 'cuda'):
        h = model.model(input_ids=ids, attention_mask=att).last_hidden_state
        sel = mask[:, 1:].bool()                      # predict token t+1 from position t, only where t+1 is a target token
        logits = model.lm_head(h[:, :-1][sel]).float()
        return torch.nn.functional.cross_entropy(logits, ids[:, 1:][sel])


@torch.no_grad()
def full_loss():
    model.eval(); s = 0.0
    for i in range(0, len(ex), a.batch): s += batch_loss(list(range(i, min(len(ex), i + a.batch)))).item() * len(range(i, min(len(ex), i + a.batch)))
    model.train(); return s / len(ex)


@torch.no_grad()
def decode_all():
    model.eval(); exact = 0; outs = []
    for r in rows:
        ids = torch.tensor([tok.ids(render(r['system'], r['user']))], device=dev)
        want = tok.ids(r['target'] + '<|im_end|>')
        g = model.generate(ids, max_new_tokens=len(want) + 16, do_sample=False, eos_token_id=IM_END, pad_token_id=IM_END)
        text = tok.decode(g[0, ids.shape[1]:].tolist()).replace('<|im_end|>', '')
        outs.append({'id': r['id'], 'equal': text == r['target'], 'got': text[:300], 'want': r['target'][:300]}); exact += text == r['target']
    model.train(); return exact, outs


report['loss_before'] = full_loss()
log, ts = [], time.time()
order = torch.randperm(len(ex)).tolist(); k = 0
for step in range(1, a.steps + 1):
    idx = [order[(k + j) % len(ex)] for j in range(a.batch)]; k += a.batch
    if k >= len(ex): order = torch.randperm(len(ex)).tolist(); k = 0
    loss = batch_loss(idx); opt.zero_grad(set_to_none=True); loss.backward(); opt.step()
    if step % 10 == 0: log.append({'step': step, 'loss': round(loss.item(), 5), 'elapsed': round(time.time() - ts, 1)}); print(log[-1], flush=True)
report['train_seconds'] = round(time.time() - ts, 1); report['seconds_per_update'] = round((time.time() - ts) / a.steps, 2); report['log'] = log
report['loss_after'] = full_loss()
exact, outs = decode_all()
report['exact_rows'] = exact; report['passed'] = exact == len(rows); report['outputs'] = outs
report['peak_rss_gib'] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20, 2)
if dev.type == 'cuda': report['peak_cuda_allocated_gib'] = round(torch.cuda.max_memory_allocated() / 2**30, 2)
report['wall_seconds'] = round(time.time() - t0, 1)
json.dump(report, open(a.out, 'w'), indent=1)
print(json.dumps({k: report[k] for k in ('rows', 'loss_before', 'loss_after', 'exact_rows', 'passed', 'seconds_per_update', 'peak_rss_gib', 'trainable_params') if k in report}))
