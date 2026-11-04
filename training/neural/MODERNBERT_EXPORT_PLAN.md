# ModernBERT export compatibility repair

Registered 2026-11-04 before compatibility conversion or quality evaluation.
Completed training source is `0e25611ac35dcc4c3683c8389394f7018223c90f`.
The checkpoint, dataset, tokenizer, learned heads and calibration protocol are fixed.

## Observed failure and selected repair

Float ONNX agrees with PyTorch within 1e-3, with maximum errors around 1.24e-5.
The initial dynamic-q8 graph differs across Python ORT 1.29, Node ORT 1.21 and
the actual Transformers.js 3.8.1 browser WASM build
`1.22.0-dev.20250409-89f8206ba4`. Actions and cuts change as well as logits.
Python ORT 1.21 matches Node 1.21 exactly, but the actual browser differs from
both native versions. A reference-runtime substitution therefore fails the
compatibility criterion.

Instrumented graphs show a small floating-point normalization difference before
a later dynamic activation quantizer changes an integer by one level. The float
graph remains numerically and semantically consistent across native versions.
The hypothesis is that removing activation quantization discontinuities will
restore strict deployment parity while retaining compressed weight storage.

Select `weight-only-u8-fp32`. Use eight-bit weight storage and float32 arithmetic.
Keep the original failed dynamic artifact and references intact. This is an
export repair before diagram-quality evaluation, without retraining or threshold
tuning. Browser and existing-reader runtimes are preserved.

## Exact conversion

Starting from the identified dynamic graph, validate all 93 integer multiplication
blocks and 91 activation quantizers. Every supported block has the form
`DynamicQuantizeLinear(A) -> MatMulInteger(Aq, Bq, Az, Bz) -> Cast -> Mul`, with
the output scale formed from activation and constant weight scales.

Require constant uint8 `Bq[K,N]`, compatible float32 channel scales and uint8
zero points. Replace each entire block with standard ONNX
`DequantizeLinear(Bq, Bs, Bz, axis=1)` and `MatMul(A, Bfloat)`. Preserve the exact
weight, scale and zero-point bytes, final multiplication output name, downstream
bias and activation operations, and the existing embedding Gather/dequantization.

Shared activation quantizers are allowed only when every consumer belongs to a
fully validated converted block. Integer-output casts and rescaling intermediates
must have no unaccounted consumers. Remove activation quantizers only after all
consumers are converted. Unsupported patterns fail closed. Require zero remaining
DynamicQuantizeLinear, MatMulInteger, QLinearMatMul or activation QuantizeLinear
operators. Preserve opset 17 and whole-tensor packing in files at most 90 MiB,
with every published file below 100 MiB.

## Explicit execution policy

A tiny analytic test found that ORT 1.29's Extended/All optimization rewrites
the standard weight-dequantization and float multiplication into MatMulNBits,
changing the expected 19.25 result to approximately 19.5945. Basic optimization
preserves the expected arithmetic. Enforce Basic optimization for ModernBERT in
Python references and every Node, browser and collection session. Transformers.js
3.8.1 forwards the per-model `session_options.graphOptimizationLevel` option;
the existing readers retain their current options. No global backend setting is
changed. Tiny Node and actual-WASM analytic checks remain required before the
full-model checks.

Bind the exact execution policy in configuration, candidate, references, receipts
and collection provenance as `graph_optimization: basic`, `arithmetic: float32`,
and `weight_storage: uint8`. Assert equality throughout validation. This controls
an optimizer rewrite that would defeat the selected arithmetic. It introduces
no alternate quantization recipe, training change or threshold change.

## References, receipts and acceptance

Use a fresh artifact directory and new versioned reference envelope. Bind the
checkpoint, float graph, selected graph, every shard, prepared input arrays and
all conversion/reference/checker sources by hash. Record the selected mode and
actual Python, Node and browser runtime identities. Add unequal-length padded
batches to all sixteen existing single fixtures. No fixture is removed.

Acceptance requires all three output heads to meet the unchanged tolerance
`1e-3 + 1e-3 * abs(reference)` across Python ORT 1.29, the existing Node runtime
and actual pinned browser WASM. Actions, classes, tags, roles, cuts and final
cutInfo must match exactly for the tested cases. Exercise multi-request batches,
Unicode, padding and both token caps. Never infer browser parity from Node parity.

The structural report must account for all 93 converted blocks, unchanged
quantized initializer hashes and output interfaces, and zero forbidden operators.
Tests include non-square weights, channel/scalar broadcasting where supported,
shared activation producers, downstream bias, zero channels, missing tensors,
unexpected consumers and applying conversion twice.

Finalize a complete export receipt only after float, Node and actual-browser
checks succeed on the bound artifact/reference. Collection must reject missing
browser evidence, wrong runtime, changed references or changed model files.
Its provenance records the actual execution runtime and export mode. Existing
dataset completeness, split, fitting and quality thresholds remain in force.

Describe the model as "8-bit weights, float32 arithmetic" in its metadata and
documentation. Measure actual browser load time, warm inference and available
process/heap memory indicators; report limitations. Compressed download size does
not establish inference RAM. If this selected repair fails strict compatibility,
stop and report the result without choosing another recipe in this experiment.

Independent plan and source reviews precede conversion and acceptance. Preserve
previous reviews for unchanged training and inference decoding. Publication still
requires the canonical regression, coordinator commit and direct five-reader
live test. A successful export supplies no diagram-quality claim by itself.
