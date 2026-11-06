"""weights_error.py: how far the GGUF's Q8_0 weights are from the official BF16 weights, against the error of a standard Q8_0 of the same weights.

  python weights_error.py GGUF MODEL.safetensors [OUT.json]

Per Q8_0 tensor: relative error ||dequant(gguf) - hf|| / ||hf|| and the same for the reference Q8_0 of the hf weights (weights_match.q8_0);
the share of elements where |dequant(gguf) - hf| exceeds one quantization step of the GGUF block (impossible for any rounding of the same
values with that scale); the largest such excess in steps. CPU, numpy only.
"""
import json, sys
import numpy as np
from weights_match import read_gguf, read_safetensors, bf16_to_f32, hf_name, q8_0, deq_q8_0, GGML

gf, version, kv, tensors, base = read_gguf(sys.argv[1]); sf, sbase, shead = read_safetensors(sys.argv[2])
rows = []
for name, dims, typ, off in tensors:
    if GGML[typ][0] != 'Q8_0': continue
    n = int(np.prod(dims)); gf.seek(base + off); graw = gf.read(n // 32 * 34)
    a, b = shead[hf_name(name)]['data_offsets']; sf.seek(sbase + a); x = bf16_to_f32(sf.read(b - a))
    g = deq_q8_0(graw); m = deq_q8_0(q8_0(x))
    d = np.repeat(np.frombuffer(graw, np.uint8).reshape(-1, 34)[:, :2].copy().view(np.float16).astype(np.float32).ravel(), 32)
    steps = np.abs(g - x) / np.where(d == 0, 1, d)
    nx = np.linalg.norm(x)
    rows.append({'tensor': name, 'rel_err_gguf': float(np.linalg.norm(g - x) / nx), 'rel_err_reference_q8_0': float(np.linalg.norm(m - x) / nx),
                 'share_over_one_step': float(np.mean(steps > 1.0)), 'max_steps': float(steps.max()),
                 'corr_gguf_minus_hf_vs_hf': float(np.corrcoef((g - x).ravel(), x.ravel())[0, 1])})
agg = {'tensors': len(rows), 'median_rel_err_gguf': float(np.median([r['rel_err_gguf'] for r in rows])),
       'median_rel_err_reference_q8_0': float(np.median([r['rel_err_reference_q8_0'] for r in rows])),
       'tensors_with_any_element_over_one_step': sum(r['share_over_one_step'] > 0 for r in rows),
       'max_share_over_one_step': max(r['share_over_one_step'] for r in rows), 'max_steps': max(r['max_steps'] for r in rows)}
print(json.dumps(agg, indent=1))
for r in sorted(rows, key=lambda r: -r['rel_err_gguf'])[:6]: print(r)
if len(sys.argv) > 3: json.dump({'summary': agg, 'tensors': rows}, open(sys.argv[3], 'w'), indent=1)
