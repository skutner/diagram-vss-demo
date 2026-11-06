"""teacher_forced.py: Q0.6 of QWEN3_FINETUNE_PLAN.md. A PyTorch model, teacher-forced on a native run's prompts and generated tokens,
against that run's per-token log-probabilities (records of collect_lines.mjs: qwen.prompt, the rendered prompt; qwen.tokens, [id, logprob,
second logprob] per generated token; qwen.eos, the end-of-turn token if listed).

  python teacher_forced.py --records R.jsonl --gguf GGUF --base DIR --out OUT.json [--weights merged.pt] [--dtype bf16|fp32] [--n 50]

- zero arm: no --weights, --dtype bf16: the training base (the shipped GGUF dequantized, rounded to BF16) against the shipped GGUF.
- export: --weights RUN/merged.pt --dtype fp32, records collected from the exported GGUF.
Per message: greedy identical = at every generated position the model's argmax is the native token (so greedy decoding from the same
prompt gives the same output); |delta log-probability| per token. Pass (fixed in the plan): greedy identical on >= 95% of messages and the
99th percentile of |delta| <= 0.05. Messages are the first n records that have a prompt and tokens, in file order.
"""
import argparse, json, os, sys
import numpy as np
import torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qwen_lib import load_gguf_weights, build_model, Tok, IM_END

ap = argparse.ArgumentParser()
for k in ('--records', '--gguf', '--base', '--out'): ap.add_argument(k, required=True)
ap.add_argument('--weights'); ap.add_argument('--dtype', default='bf16'); ap.add_argument('--n', type=int, default=50); ap.add_argument('--device', default='cuda')
a = ap.parse_args()
dt = torch.bfloat16 if a.dtype == 'bf16' else torch.float32
W = torch.load(a.weights, map_location='cpu') if a.weights else load_gguf_weights(a.gguf)[0]
model = build_model(os.path.join(a.base, 'config.json'), W, dtype=dt); del W
model.config._attn_implementation = 'eager' if a.dtype == 'fp32' else 'sdpa'
dev = torch.device(a.device); model.to(dev).eval()
tok = Tok(os.path.join(a.base, 'tokenizer.json'))
recs = [r for r in map(json.loads, open(a.records)) if r.get('qwen') and r['qwen'].get('prompt') and r['qwen'].get('tokens')][:a.n]
rows, deltas = [], []
with torch.no_grad():
    for r in recs:
        q = r['qwen']; p = tok.ids(q['prompt']); out = [t[0] for t in q['tokens']]; lp = [t[1] for t in q['tokens']]
        if q.get('eos') and q['eos'].get('lp') is not None: out.append(IM_END); lp.append(q['eos']['lp'])
        ids = torch.tensor([p + out], device=dev)
        logits = model(input_ids=ids).logits[0, len(p) - 1:len(p) - 1 + len(out)].float()
        logp = torch.log_softmax(logits, -1)
        mine = logp[torch.arange(len(out)), torch.tensor(out, device=dev)].cpu().numpy()
        arg = logp.argmax(-1).cpu().numpy().tolist()
        d = np.abs(mine - np.array(lp, dtype=np.float64)); deltas += d.tolist()
        first = next((i for i, (x, y) in enumerate(zip(arg, out)) if x != y), None)
        margin = None
        if first is not None:
            top2 = torch.topk(logp[first], 2).values.cpu().numpy(); margin = float(top2[0] - top2[1])
        rows.append({'id': r['id'], 'set': r['set'], 'tokens': len(out), 'greedy_identical': first is None, 'first_divergence': first, 'divergence_margin_nats': margin, 'delta_max': float(d.max()) if len(d) else 0.0})
q = lambda xs, p: float(np.quantile(np.array(xs), p)) if xs else None
res = {'records': os.path.abspath(a.records), 'weights': a.weights, 'dtype': a.dtype, 'messages': len(rows), 'greedy_identical': sum(x['greedy_identical'] for x in rows),
       'greedy_identical_share': sum(x['greedy_identical'] for x in rows) / len(rows) if rows else None, 'tokens': len(deltas), 'delta_p50': q(deltas, .5), 'delta_p99': q(deltas, .99), 'delta_max': max(deltas) if deltas else None, 'rows': rows}
why = []
if len(rows) < a.n: why.append(f'only {len(rows)} messages (need {a.n})')
if not (res['greedy_identical_share'] or 0) >= 0.95: why.append(f"greedy identical {res['greedy_identical']}/{len(rows)} (need 95%)")
if not (res['delta_p99'] is not None and res['delta_p99'] <= 0.05): why.append(f"p99 |delta| {res['delta_p99']} (need <= 0.05)")
res['gate'] = 'FAIL' if why else 'PASS'; res['reasons'] = why
json.dump(res, open(a.out, 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != 'rows'}, indent=1))
