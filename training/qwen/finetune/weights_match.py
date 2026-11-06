"""weights_match.py: is the GGUF the browser reader uses the official Qwen/Qwen3-0.6B weights, quantized to Q8_0?

  python weights_match.py GGUF MODEL.safetensors [OUT.json]

Reads both files with no ML library (numpy only): parses the GGUF header and tensor table, maps each GGUF tensor to its Hugging Face
name (the qwen3 mapping of llama.cpp's convert_hf_to_gguf.py), and for every tensor:
  - Q8_0 in the GGUF: quantizes the safetensors BF16 values with ggml's reference Q8_0 rule (blocks of 32, d = amax / 127 as FP16,
    q = round half away from zero of x / d) and compares the bytes; also the largest difference after dequantizing;
  - F32 / F16 in the GGUF: compares the values exactly (BF16 -> F32 is exact).
CPU only. Prints a summary and writes OUT.json when given.
"""
import json, struct, sys, hashlib
import numpy as np

GGML = {0: ('F32', 4, 1), 1: ('F16', 2, 1), 8: ('Q8_0', 34, 32), 30: ('BF16', 2, 1)}


def read_gguf(path):
    f = open(path, 'rb')
    def u32(): return struct.unpack('<I', f.read(4))[0]
    def u64(): return struct.unpack('<Q', f.read(8))[0]
    def s(): n = u64(); return f.read(n).decode('utf8')
    scal = {0: '<B', 1: '<b', 2: '<H', 3: '<h', 4: '<I', 5: '<i', 6: '<f', 7: '<?', 10: '<Q', 11: '<q', 12: '<d'}
    def val(t):
        if t == 8: return s()
        if t == 9:
            it, n = u32(), u64()
            return [val(it) for _ in range(n)]
        fmt = scal[t]; return struct.unpack(fmt, f.read(struct.calcsize(fmt)))[0]
    assert f.read(4) == b'GGUF'
    version, nt, nkv = u32(), u64(), u64()
    kv = {}
    for _ in range(nkv):
        k = s(); t = u32(); v = val(t)
        kv[k] = v if not (isinstance(v, list) and len(v) > 64) else f'<array of {len(v)}>'
    tensors = []
    for _ in range(nt):
        name = s(); nd = u32(); dims = [u64() for _ in range(nd)]; typ = u32(); off = u64()
        tensors.append((name, dims, typ, off))
    align = kv.get('general.alignment', 32)
    base = (f.tell() + align - 1) // align * align
    return f, version, kv, tensors, base


def read_safetensors(path):
    f = open(path, 'rb')
    n = struct.unpack('<Q', f.read(8))[0]
    head = json.loads(f.read(n))
    return f, 8 + n, {k: v for k, v in head.items() if k != '__metadata__'}


def bf16_to_f32(raw):
    u = np.frombuffer(raw, dtype=np.uint16).astype(np.uint32) << 16
    return u.view(np.float32)


def hf_name(g):
    top = {'token_embd.weight': 'model.embed_tokens.weight', 'output_norm.weight': 'model.norm.weight', 'output.weight': 'lm_head.weight'}
    if g in top: return top[g]
    _, i, rest = g.split('.', 2)
    m = {'attn_norm.weight': 'input_layernorm.weight', 'ffn_norm.weight': 'post_attention_layernorm.weight',
         'attn_q.weight': 'self_attn.q_proj.weight', 'attn_k.weight': 'self_attn.k_proj.weight', 'attn_v.weight': 'self_attn.v_proj.weight',
         'attn_output.weight': 'self_attn.o_proj.weight', 'attn_q_norm.weight': 'self_attn.q_norm.weight', 'attn_k_norm.weight': 'self_attn.k_norm.weight',
         'ffn_gate.weight': 'mlp.gate_proj.weight', 'ffn_up.weight': 'mlp.up_proj.weight', 'ffn_down.weight': 'mlp.down_proj.weight'}
    return f'model.layers.{i}.{m[rest]}'


def q8_0(x):
    b = x.reshape(-1, 32).astype(np.float32)
    d = np.abs(b).max(axis=1, keepdims=True) / 127
    with np.errstate(divide='ignore'):
        inv = np.where(d == 0, 0, 1 / d)
    q = b * inv
    q = np.sign(q) * np.floor(np.abs(q) + 0.5)          # round half away from zero (roundf)
    out = np.empty((b.shape[0], 34), dtype=np.uint8)
    out[:, :2] = d.astype(np.float16).view(np.uint8).reshape(-1, 2)
    out[:, 2:] = q.astype(np.int8).view(np.uint8)
    return out.tobytes()


def deq_q8_0(raw):
    a = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 34)
    d = a[:, :2].copy().view(np.float16).astype(np.float32)
    q = a[:, 2:].copy().view(np.int8).astype(np.float32)
    return (q * d).reshape(-1)


def main():
    gpath, spath = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else None
    gf, version, kv, tensors, base = read_gguf(gpath)
    sf, sbase, shead = read_safetensors(spath)
    rows, types = [], {}
    for name, dims, typ, off in tensors:
        tname, bsz, bel = GGML[typ]
        n = int(np.prod(dims)); size = n // bel * bsz
        gf.seek(base + off); graw = gf.read(size)
        h = hf_name(name); meta = shead.get(h)
        types[tname] = types.get(tname, 0) + 1
        if meta is None:
            rows.append({'gguf': name, 'hf': h, 'status': 'no such tensor in the safetensors'}); continue
        a, b = meta['data_offsets']; sf.seek(sbase + a); sraw = sf.read(b - a)
        assert meta['dtype'] == 'BF16', meta['dtype']
        x = bf16_to_f32(sraw)
        if int(np.prod(meta['shape'])) != n or list(reversed(meta['shape'])) != list(dims):
            rows.append({'gguf': name, 'hf': h, 'status': f'shape differs: gguf {dims} hf {meta["shape"]}'}); continue
        if tname == 'Q8_0':
            mine = q8_0(x)
            same = mine == graw
            nb = n // 32
            diff_blocks = 0 if same else int(np.sum(np.any(np.frombuffer(mine, np.uint8).reshape(nb, 34) != np.frombuffer(graw, np.uint8).reshape(nb, 34), axis=1)))
            dq = deq_q8_0(graw)
            rows.append({'gguf': name, 'hf': h, 'type': tname, 'bytes_equal': bool(same), 'blocks_differing': diff_blocks, 'blocks': nb,
                         'max_abs_dequant_minus_hf': float(np.max(np.abs(dq - x))), 'max_abs_hf': float(np.max(np.abs(x)))})
        else:
            g = np.frombuffer(graw, dtype=np.float32 if tname == 'F32' else np.float16).astype(np.float32)
            rows.append({'gguf': name, 'hf': h, 'type': tname, 'values_equal': bool(np.array_equal(g, x)), 'max_abs_diff': float(np.max(np.abs(g - x)))})
    q8 = [r for r in rows if r.get('type') == 'Q8_0']
    other = [r for r in rows if r.get('type') in ('F32', 'F16')]
    unmatched = [r for r in rows if 'status' in r]
    used = {hf_name(t[0]) for t in tensors}
    summary = {'gguf': gpath, 'gguf_sha256_prefix': None, 'safetensors': spath, 'gguf_version': version, 'gguf_tensors': len(tensors),
               'gguf_types': types, 'general.name': kv.get('general.name'), 'general.base_model.0.repo_url': kv.get('general.base_model.0.repo_url'),
               'q8_0_tensors_byte_equal': sum(r['bytes_equal'] for r in q8), 'q8_0_tensors': len(q8),
               'q8_0_blocks_differing': sum(r['blocks_differing'] for r in q8), 'q8_0_blocks': sum(r['blocks'] for r in q8),
               'float_tensors_equal': sum(r['values_equal'] for r in other), 'float_tensors': len(other), 'unmatched': unmatched,
               'safetensors_tensors_not_in_gguf': sorted(set(shead) - used)}
    print(json.dumps(summary, indent=1))
    if out:
        json.dump({'summary': summary, 'tensors': rows}, open(out, 'w'), indent=1)


if __name__ == '__main__':
    main()
