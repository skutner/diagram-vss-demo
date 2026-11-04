# ModernBERT diagram reader — experimental

This is a task-trained `answerdotai/ModernBERT-base` reader with joint action,
legend-value, role/span and request-cut heads. The complete head layout is
`reader` in `config.json`. It uses the existing diagram formalizer and engine,
with its own model instance and confidence file at
`../../confidence/modernbert.json`.

**The first task-quality experiment failed.** On the fixed held-out 745-message
formalization test, 16 of 1,745 requested actions were accepted correctly,
0 incorrectly, 1,625 held for confirmation and 104 unread, with 0 extras.
Coverage is 0.92%, below the registered 20% criterion. Zero observed errors among
only 16 accepted actions does not establish general reliability. This prototype
is for comparison, not a recommended replacement for the existing readers.

- Base revision: `8949b909ec900327062f0ebf497f51aef5e6f0c8`.
- Training source: `0e25611ac35dcc4c3683c8389394f7018223c90f`.
- Training: ALL data, 24,698 messages / 54,584 request spans, one epoch, seed 0,
  FP32 CUDA on Apparatus's RTX 3060 Laptop, 3,412 updates, 77 minutes 33 seconds.
  Microbatch 1, accumulation 16, AdamW learning rate 3e-5, weight decay .01,
  6% warmup, clip 1. The shipped DistilBERT trained eight epochs.
- Checkpoint SHA256:
  `5581d9fd1760ac8fa33fcd697cae77f7a019b576cd5be7da14aebb81aa1c8099`.
- Export source: `baef6de8c8b4ab86c4c95d320a11ab3fbc5d943c`.
  `export_manifest.json` binds the checkpoint, graph, tokenizer, sources and actual
  Node/browser validation receipts. All 19 parity fixtures passed.
- Export mode: `weight-only-u8-fp32`. The `model_quantized.onnx` filename and
  Transformers.js `dtype: q8` identify 8-bit stored weights. Computation uses
  **FP32 arithmetic**, with explicit **Basic** graph optimization. Both settings
  are required. This does not provide int8 compute or int8 runtime-memory usage.
- Browser runtime validated: Transformers.js 3.8.1, Web ORT
  `1.22.0-dev.20250409-89f8206ba4`, single-thread WASM in Chrome 156.
  WebGPU has not been validated for this artifact.
- Tokenization: `wordwise-bpe-prefix-space-v1`, matching Python/JavaScript word
  offsets and token IDs. Whole-word limits are 128 request tokens and 512 cutter
  tokens. Partial or truncated spans are held.
- Confidence: fitted only on the 368-message calibration partition, five
  message-level folds and fold-local priors/percentiles. The frozen cost-10 gate
  is `0.9765597115495379`. No post-test threshold or weight tuning was performed.
- The original base weights use Apache-2.0, and these fine-tuned weights derive
  from them. Repository code uses AGPL-3.0. See the base model's license and this
  repository's `LICENSE`.

Full training, compatibility, quality and timing details:
[ModernBERT report](../../../../reports/modernbert.md).
