"""requant_roundtrip.py: does the reference Q8_0 rule give back the shipped GGUF bytes from its own dequantized values?

  python requant_roundtrip.py GGUF [OUT.json]

If yes for every block, a model fine-tuned from the dequantized GGUF and written with the reference rule reproduces the shipped bytes
wherever its weights did not change, so "no training" = "the shipped file". Blocks whose largest |q| is not 127 cannot round-trip.
"""
import json, sys
import numpy as np
from weights_match import read_gguf, deq_q8_0, q8_0, GGML

gf, version, kv, tensors, base = read_gguf(sys.argv[1])
tot = same = full = 0; per = []
for name, dims, typ, off in tensors:
    if GGML[typ][0] != 'Q8_0': continue
    n = int(np.prod(dims)); gf.seek(base + off); graw = gf.read(n // 32 * 34)
    G = np.frombuffer(graw, np.uint8).reshape(-1, 34)
    q = G[:, 2:].copy().view(np.int8).astype(int)
    M = np.frombuffer(q8_0(deq_q8_0(graw)), np.uint8).reshape(-1, 34)
    eq = np.all(G == M, axis=1); f = np.abs(q).max(1) == 127
    tot += len(eq); same += int(eq.sum()); full += int(f.sum())
    per.append({'tensor': name, 'blocks': len(eq), 'roundtrip_equal': int(eq.sum()), 'max_abs_q_127': int(f.sum())})
s = {'q8_0_blocks': tot, 'roundtrip_equal_blocks': same, 'blocks_with_max_abs_q_127': full, 'tensors_fully_equal': sum(p['roundtrip_equal'] == p['blocks'] for p in per), 'tensors': len(per)}
print(json.dumps(s, indent=1))
if len(sys.argv) > 2: json.dump({'summary': s, 'tensors': per}, open(sys.argv[2], 'w'), indent=1)
