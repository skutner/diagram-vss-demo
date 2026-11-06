"""qwen_lib.py: what the Qwen fine-tuning scripts share.

- load_gguf_weights(gguf): the shipped GGUF's weights as Hugging Face Qwen3 tensors in FP32 (Q8_0 dequantized: q * d is exact in FP32;
  the F32 norms as they are; the tied embedding once). Training starts from these, so an untrained model is the shipped reader
  (requant_roundtrip.py: every Q8_0 block re-quantizes to the same bytes).
- build_model(config, weights): transformers Qwen3ForCausalLM with these weights (tied lm_head).
- LoRA on the attention and MLP projections (never the embedding): add_lora(model, r, alpha), lora_state(model), merge_lora(model).
- render(system, user, target): the chat text exactly as the GGUF's template renders it with thinking off, and the token ids, with a loss
  mask on the target and the closing <|im_end|> only.
"""
import json
import math
import numpy as np
import torch
from torch import nn
from weights_match import read_gguf, hf_name, deq_q8_0, GGML

IM_END = 151645


def load_gguf_weights(path):
    f, version, kv, tensors, base = read_gguf(path)
    out = {}
    for name, dims, typ, off in tensors:
        tname, bsz, bel = GGML[typ]
        n = int(np.prod(dims)); f.seek(base + off); raw = f.read(n // bel * bsz)
        if tname == 'Q8_0': x = deq_q8_0(raw)
        elif tname == 'F32': x = np.frombuffer(raw, dtype=np.float32)
        else: raise ValueError(f'{name}: {tname} not handled')
        out[hf_name(name)] = torch.from_numpy(np.array(x, dtype=np.float32).reshape(list(reversed(dims))))
    return out, kv


def build_model(config_path, weights, dtype=torch.float32):
    from transformers import Qwen3Config, Qwen3ForCausalLM
    cfg = Qwen3Config.from_dict(json.load(open(config_path)))
    cfg.torch_dtype = dtype
    model = Qwen3ForCausalLM(cfg).to(dtype)
    sd = dict(weights); sd['lm_head.weight'] = sd['model.embed_tokens.weight']
    model.load_state_dict({k: v.to(dtype) for k, v in sd.items()}, strict=True)
    model.tie_weights()
    return model


class LoRALinear(nn.Module):
    def __init__(self, base, r, alpha):
        super().__init__()
        self.base, self.r, self.scale = base, r, alpha / r
        for p in self.base.parameters(): p.requires_grad_(False)
        self.A = nn.Parameter(torch.empty(r, base.in_features, dtype=torch.float32))
        self.B = nn.Parameter(torch.zeros(base.out_features, r, dtype=torch.float32))
        nn.init.kaiming_uniform_(self.A, a=math.sqrt(5))

    def forward(self, x):
        return self.base(x) + (x.to(self.A.dtype) @ self.A.t() @ self.B.t()).to(x.dtype) * self.scale


TARGETS = ('q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj')


def add_lora(model, r=16, alpha=32):
    for p in model.parameters(): p.requires_grad_(False)
    n = 0
    for layer in model.model.layers:
        for parent in (layer.self_attn, layer.mlp):
            for name in TARGETS:
                if hasattr(parent, name):
                    setattr(parent, name, LoRALinear(getattr(parent, name), r, alpha)); n += 1
    return n


def lora_params(model):
    return [p for n, p in model.named_parameters() if p.requires_grad]


@torch.no_grad()
def merge_lora(model):
    """fold every LoRA delta into its base weight (FP32) and put the plain Linear back"""
    for layer in model.model.layers:
        for parent in (layer.self_attn, layer.mlp):
            for name in TARGETS:
                m = getattr(parent, name, None)
                if isinstance(m, LoRALinear):
                    m.base.weight += (m.B @ m.A * m.scale).to(m.base.weight.dtype)
                    setattr(parent, name, m.base)


def render(system, user, target=None):
    head = f'<|im_start|>system\n{system}<|im_end|>\n<|im_start|>user\n{user}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n'
    return head if target is None else (head, target + '<|im_end|>')


class Tok:
    def __init__(self, path):
        from tokenizers import Tokenizer
        self.t = Tokenizer.from_file(path)

    def ids(self, s):
        return self.t.encode(s, add_special_tokens=False).ids

    def example(self, system, user, target):
        head, tail = render(system, user, target)
        a, b = self.ids(head), self.ids(tail)
        return a + b, [0] * len(a) + [1] * len(b)

    def decode(self, ids):
        return self.t.decode(ids, skip_special_tokens=False)
