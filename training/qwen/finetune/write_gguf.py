"""write_gguf.py: put (fine-tuned, merged) Qwen3 weights back into the shipped GGUF container.

  python write_gguf.py --gguf SHIPPED.gguf --out NEW.gguf [--weights STATE.pt]     (no --weights: the self-test)

The output is a byte copy of the shipped file (header, metadata, tokenizer, chat template, tensor table and offsets unchanged) with each
tensor's data replaced: Q8_0 tensors re-quantized with ggml's reference rule (weights_match.q8_0), F32 tensors written as they are. Sizes
and offsets cannot change (Q8_0 is 34 bytes per 32 values), so the file stays 639,446,688 bytes. Without --weights the shipped weights are
dequantized and written back, and the SHA-256 must equal the shipped one (requant_roundtrip.py: every block round-trips); a different hash
is an error. Prints the SHA-256, the size and the tensors whose bytes changed.
"""
import argparse, hashlib, shutil, sys, os
import numpy as np
import torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from weights_match import read_gguf, hf_name, q8_0, GGML
from qwen_lib import load_gguf_weights

ap = argparse.ArgumentParser(); ap.add_argument('--gguf', required=True); ap.add_argument('--out', required=True); ap.add_argument('--weights')
a = ap.parse_args()
shipped_sha = hashlib.sha256(open(a.gguf, 'rb').read()).hexdigest()
W = torch.load(a.weights, map_location='cpu') if a.weights else load_gguf_weights(a.gguf)[0]
f, version, kv, tensors, base = read_gguf(a.gguf)
shutil.copyfile(a.gguf, a.out)
changed = []
with open(a.out, 'r+b') as o:
    for name, dims, typ, off in tensors:
        tname, bsz, bel = GGML[typ]; n = int(np.prod(dims)); size = n // bel * bsz
        x = W[hf_name(name)].detach().to(torch.float32).contiguous().numpy().reshape(-1)
        if x.size != n: raise SystemExit(f'{name}: {x.size} values, the container holds {n}')
        new = q8_0(x) if tname == 'Q8_0' else x.astype(np.float32).tobytes() if tname == 'F32' else None
        if new is None or len(new) != size: raise SystemExit(f'{name}: cannot write {tname}')
        f.seek(base + off); old = f.read(size)
        if new != old: changed.append(name); o.seek(base + off); o.write(new)
sha = hashlib.sha256(open(a.out, 'rb').read()).hexdigest()
print({'out': a.out, 'bytes': os.path.getsize(a.out), 'sha256': sha, 'shipped_sha256': shipped_sha, 'tensors_changed': len(changed), 'first_changed': changed[:5]})
if not a.weights and sha != shipped_sha: raise SystemExit('self-test failed: unchanged weights did not reproduce the shipped file')
