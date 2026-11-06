"""gpu_probe.py, a throughput probe: ModernBERT-base on this GPU, forward + backward + optimizer step on random token ids of a fixed length.
Measures how far training can get from the first run's regime (eager, gradient checkpointing, FP32, microbatch 1, 11.7 request+cut pairs/s).
No data, no checkpoint, nothing written. Each case runs 12 steps and reports the last 8."""
import gc, json, os, sys, time
import torch
from transformers import ModernBertModel, AutoConfig

BASE, REV = "answerdotai/ModernBERT-base", "8949b909ec900327062f0ebf497f51aef5e6f0c8"
CACHE = os.path.expanduser("~/.cache/diagram-vss-modernbert/hf")
torch.backends.cuda.matmul.allow_tf32 = True
print(json.dumps({"torch": torch.__version__, "bf16": torch.cuda.is_bf16_supported(), "gpu": torch.cuda.get_device_name(0)}), flush=True)


def case(bs, length, attn, dtype, ckpt):
    gc.collect(); torch.cuda.empty_cache(); torch.cuda.reset_peak_memory_stats()
    m = None
    try:
        m = ModernBertModel.from_pretrained(BASE, revision=REV, cache_dir=CACHE, attn_implementation=attn, reference_compile=False, local_files_only=True).cuda()
        if ckpt: m.gradient_checkpointing_enable()
        m.train()
        head = torch.nn.Linear(m.config.hidden_size, 3).cuda()
        opt = torch.optim.AdamW(list(m.parameters()) + list(head.parameters()), lr=1e-5, fused=True)
        scaler = torch.amp.GradScaler("cuda", enabled=dtype == "fp16")
        ids = torch.randint(100, 40000, (bs, length)).cuda()
        mask = torch.ones_like(ids)
        lab = torch.randint(0, 3, (bs, length)).cuda()
        ts = []
        for i in range(12):
            torch.cuda.synchronize(); t = time.perf_counter()
            with torch.amp.autocast("cuda", dtype={"fp16": torch.float16, "bf16": torch.bfloat16}.get(dtype, torch.float32), enabled=dtype != "fp32"):
                h = m(input_ids=ids, attention_mask=mask).last_hidden_state
                loss = torch.nn.functional.cross_entropy(head(h).flatten(0, 1), lab.flatten())
            scaler.scale(loss).backward(); scaler.step(opt); scaler.update(); opt.zero_grad(set_to_none=True)
            torch.cuda.synchronize(); ts.append(time.perf_counter() - t)
        s = sum(ts[4:]) / 8
        r = {"bs": bs, "len": length, "attn": attn, "dtype": dtype, "ckpt": ckpt, "s_per_step": round(s, 4), "ex_per_s": round(bs / s, 1), "tokens_per_s": round(bs * length / s), "peak_alloc_gb": round(torch.cuda.max_memory_allocated() / 2**30, 2), "peak_res_gb": round(torch.cuda.max_memory_reserved() / 2**30, 2)}
    except torch.cuda.OutOfMemoryError:
        r = {"bs": bs, "len": length, "attn": attn, "dtype": dtype, "ckpt": ckpt, "oom": True}
    except Exception as e:
        r = {"bs": bs, "len": length, "attn": attn, "dtype": dtype, "ckpt": ckpt, "error": str(e)[:300]}
    finally:
        del m
        gc.collect(); torch.cuda.empty_cache()
    print(json.dumps(r), flush=True)
    return r


# the first run's regime, as the reference
case(1, 64, "eager", "fp32", True)
# what the run could use instead
for attn, dtype, ckpt in [("sdpa", "fp32", False), ("sdpa", "bf16", False), ("sdpa", "fp16", False), ("eager", "bf16", False)]:
    case(16, 64, attn, dtype, ckpt)
# batch size and length against the 6 GB, on the best mixed-precision setting above
for bs, length in [(32, 64), (64, 64), (128, 64), (16, 128), (32, 128), (64, 128), (8, 256), (16, 256), (32, 256), (4, 512), (8, 512), (16, 512), (2, 1024), (4, 1024)]:
    case(bs, length, "sdpa", "bf16", False)
for bs, length in [(32, 256), (16, 512), (8, 1024)]:
    case(bs, length, "sdpa", "bf16", True)
