"""gpu_probe_qwen.py: what fits on this RTX 3060 Laptop GPU (6 GiB) for fine-tuning Qwen3-0.6B, and how fast.
NOT RUN YET (the GPU was held by the ModernBERT session until 07:00 on 2026-11-06). Run only with the GPU lock:

  CUDA_VISIBLE_DEVICES=GPU-905b8484-3b1e-30f6-defd-05d44f00f692 flock -n ~/.cache/diagram-vss-modernbert/locks/GPU-905b8484-3b1e-30f6-defd-05d44f00f692.lock \
    ~/.cache/diagram-vss-modernbert/venv/bin/python -B training/qwen/finetune/gpu_probe_qwen.py --gguf ~/.cache/diagram-vss-qwen/models/Qwen3-0.6B-Q8_0.gguf \
    --base ~/.cache/diagram-vss-qwen/base > reports/evidence/qwen3-finetune-plan/gpu_probe_qwen.txt

Forward + backward + optimizer step on random token ids of a fixed length, loss on the last quarter of each row (the target), 10 steps per
case, the last 6 timed. Cases: LoRA r=16 on all projections with the base in BF16 (SDPA, BF16 autocast), with and without gradient
checkpointing, over batch x length; full fine-tuning of everything but the embedding with AdamW (FP32 master weights), expected not to fit;
full fine-tuning in BF16 weights with SGD, as the cheapest full variant. Nothing is written but the printed lines.
"""
import argparse, gc, json, os, sys, time
import torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qwen_lib import load_gguf_weights, build_model, add_lora, lora_params

ap = argparse.ArgumentParser(); ap.add_argument('--gguf', required=True); ap.add_argument('--base', required=True); a = ap.parse_args()
torch.backends.cuda.matmul.allow_tf32 = True
print(json.dumps({'torch': torch.__version__, 'bf16': torch.cuda.is_bf16_supported(), 'gpu': torch.cuda.get_device_name(0),
                  'free_gib': round(torch.cuda.mem_get_info()[0] / 2**30, 2)}), flush=True)
W, _ = load_gguf_weights(a.gguf)


def case(mode, bs, length, ckpt):
    gc.collect(); torch.cuda.empty_cache(); torch.cuda.reset_peak_memory_stats()
    m = opt = None; r = {'mode': mode, 'bs': bs, 'len': length, 'ckpt': ckpt}
    try:
        m = build_model(os.path.join(a.base, 'config.json'), W, dtype=torch.bfloat16 if mode != 'full-adamw-fp32' else torch.float32)
        m.config._attn_implementation = 'sdpa'
        if mode == 'lora':
            add_lora(m, 16, 32); params = lora_params(m); m.cuda(); opt = torch.optim.AdamW(params, lr=2e-4, fused=True)
        else:
            for n, p in m.named_parameters(): p.requires_grad_('embed_tokens' not in n and 'lm_head' not in n)
            params = [p for p in m.parameters() if p.requires_grad]; m.cuda()
            opt = torch.optim.AdamW(params, lr=1e-5, fused=True) if mode == 'full-adamw-fp32' else torch.optim.SGD(params, lr=1e-4)
        if ckpt: m.gradient_checkpointing_enable(); m.config.use_cache = False
        m.train(); r['trainable'] = sum(p.numel() for p in params)
        ids = torch.randint(100, 150000, (bs, length)).cuda(); att = torch.ones_like(ids); t0 = length * 3 // 4
        ts = []
        for i in range(10):
            torch.cuda.synchronize(); t = time.perf_counter()
            with torch.autocast('cuda', dtype=torch.bfloat16):
                h = m.model(input_ids=ids, attention_mask=att).last_hidden_state
                logits = m.lm_head(h[:, t0:-1]).float()
                loss = torch.nn.functional.cross_entropy(logits.flatten(0, 1), ids[:, t0 + 1:].flatten())
            loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
            torch.cuda.synchronize(); ts.append(time.perf_counter() - t)
        s = sum(ts[4:]) / 6
        r.update({'s_per_step': round(s, 4), 'rows_per_s': round(bs / s, 1), 'tokens_per_s': round(bs * length / s), 'peak_alloc_gib': round(torch.cuda.max_memory_allocated() / 2**30, 2),
                  'peak_reserved_gib': round(torch.cuda.max_memory_reserved() / 2**30, 2)})
    except torch.cuda.OutOfMemoryError:
        r['oom'] = True
    except Exception as e:
        r['error'] = str(e)[:300]
    finally:
        del m, opt; gc.collect(); torch.cuda.empty_cache()
    print(json.dumps(r), flush=True)


for bs, length in [(4, 256), (8, 256), (16, 256), (32, 256), (4, 512), (8, 512), (2, 1024)]:
    case('lora', bs, length, False)
for bs, length in [(32, 256), (16, 512), (8, 1024)]:
    case('lora', bs, length, True)
case('full-adamw-fp32', 4, 256, True)
case('full-sgd-bf16', 8, 256, True)
