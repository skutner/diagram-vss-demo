# ModernBERT first browser prototype

Measured 2026-11-04 in the personal fork `skutner/diagram-vss-demo`.
Training source: `0e25611ac35dcc4c3683c8389394f7018223c90f`.
Export, reader and calibration source:
`baef6de8c8b4ab86c4c95d320a11ab3fbc5d943c`.

**Training and browser compatibility succeeded. Task quality failed the registered
criterion.** The frozen confidence gate accepts only 16 of 1,745 held-out requested
actions correctly, or 0.92%. Keep this model experimental and retain the existing
readers. The [direct five-reader Pages comparison](diagram-e2e-five.md) is complete:
ModernBERT answered one path question and held all nine drawing commands,
leaving its starter canvas unchanged. Independent live grading remains pending.

## What was trained on Apparatus

The user rebooted Apparatus. The expected NVIDIA RTX 3060 Laptop GPU, UUID
`GPU-905b8484-3b1e-30f6-defd-05d44f00f692`, subsequently reported recovery action
`None` and passed the actual native CUDA forward/backward, masking, RNG and
checkpoint tests. The isolated environment used Python 3.12.16, Torch
2.15.0+cu132, Transformers 4.57.6 and tokenizers 0.22.2. The driver was 595.99.02.

The base is `answerdotai/ModernBERT-base` at revision
`8949b909ec900327062f0ebf497f51aef5e6f0c8`. Joint heads read the action, legend
values, written spans, reference roles and cuts. The ALL training data has
24,698 messages and 54,584 annotated requests. See
[the fixed training plan](../training/neural/MODERNBERT_PLAN.md) and
[the completed run metadata](evidence/modernbert/training-complete-0e25611.json).

| Setting or outcome | Value |
|---|---|
| Epochs / seed | 1 / 0 |
| Arithmetic | FP32, eager, gradient checkpointing, no TF32 or AMP |
| Optimizer | AdamW, learning rate 3e-5, weight decay .01, 6% warmup, clip 1 |
| Microbatch / accumulation | 1 / 16, one cut microbatch per request |
| Completed request/cut pairs | 54,584 |
| Optimizer updates | 3,412 |
| Training time | 4,652.95 seconds, 77 minutes 33 seconds |
| Training truncations | 0 requests, 0 messages |

The initial eight-update CUDA feasibility pilot passed, then the same checkpoint
continued through the fixed epoch. Independent closed-checkpoint verification
found all logged losses and floating tensors finite, matching source/data hashes,
and no remaining compute job or held GPU lease. The checkpoint SHA256 is
`5581d9fd1760ac8fa33fcd697cae77f7a019b576cd5be7da14aebb81aa1c8099`.
The earlier Mac MPS attempt stopped at 17 pairs under the unchanged 2 GiB
available-memory guard. Its [failure evidence](evidence/mps-pilot-62a5b8d/stopped.json)
and checkpoint remain preserved.

This is a comparison of trained products and pipelines. The shipped SOP-BERT
DistilBERT trained eight epochs with different optimization settings. This
one-epoch result cannot establish which encoder architecture is intrinsically
better, or prove that more training would fix it.

## Export compatibility and actual browser runtime

The first dynamic-activation q8 graph failed strict cross-runtime parity.
Python ORT 1.21 matched native Node ORT 1.21, while Python ORT 1.29 and browser
Web ORT produced differences large enough to change some decoded actions and
cuts. Identical token IDs and graph hashes excluded input and stale-cache errors.
Tiny floating-point differences were amplified by dynamic activation quantization.
The failed artifact and diagnostic evidence remain in the task cache.

The [separately registered export repair](../training/neural/MODERNBERT_EXPORT_PLAN.md)
retains the exact compressed weight/scales/zero-point bytes and replaces dynamic
activation quantization/integer matrix multiplication with dequantized weights
and FP32 matrix multiplication. Explicit **Basic** optimization prevents runtime
fusion from changing that arithmetic. The accepted policy is:

```json
{"graph_optimization":"basic","arithmetic":"float32","weight_storage":"uint8"}
```

This is `weight-only-u8-fp32`: 8-bit weight storage, FP32 computation and larger
runtime memory than the download size. The q8 filename does not imply int8 compute.
No training data, weights, training settings or quality thresholds were changed
for this compatibility conversion. The original failed export is superseded for
publication and retained as failure evidence.

The accepted [manifest](../docs/model/neural/modernbert/export_manifest.json)
binds its graph, tokenizer, sources and
[Node](../docs/model/neural/modernbert/node-receipt.json) and
[browser](../docs/model/neural/modernbert/browser-receipt.json) receipts. All 19
fixtures passed, including 17 singles and two padded batches: exact input IDs,
decoded actions/values/roles/spans, cuts, truncation information and `readMany`.
Raw output checks used the fixed 1e-3 absolute plus relative tolerance. Browser
maximum absolute differences by head were 0.000735, 0.0000233 and 0.000533.

The browser check loaded the real Transformers.js 3.8.1 CDN and Web ORT
`1.22.0-dev.20250409-89f8206ba4` in Chrome 156, using single-thread WASM.
The production reader uses this WASM path. **WebGPU execution and performance
have not been validated for this artifact.** Python used ORT 1.29 and Node used
ORT 1.21. The accepted graph SHA256 is
`d5c943cd2fdcfbe4481cf99d56927efde3cb7dd8fcfa64bf6714604743408773`.
External weight shards are 93,974,180 and 56,133,888 bytes, each below the
100 MiB GitHub file limit. Their hashes are recorded in the manifest.

## Browser timing and memory

These are private local-HTTP Chrome measurements of the actual artifact, before
live Pages testing. They exclude network delivery from GitHub Pages and do not
measure the whole diagram interaction.

| Measurement | Observed |
|---|---:|
| Initial artifact load in parity run | 1,177.9 ms |
| Empty input, warm, parity fixture | 212.0 ms |
| Batch: `draw a circle`, `connect A to B.`, empty input | 315.4 ms |
| 512-token cutter call | 3,368.2 ms |
| Nonempty request `draw a red circle.`, warm p50 | 251.6 ms |
| Same request, warm p95 | 253.3 ms |
| Loaded JavaScript heap | 171,283,316 bytes |
| Largest sampled individual Chrome process RSS | 1,060,112 KiB |
| Largest sampled sum of owned Chrome process RSS | 1,756,528 KiB |

The nonempty request benchmark had one excluded 357.8 ms warmup followed by five
calls: 252.9, 251.6, 253.4, 249.1 and 250.3 ms. Its p95 uses linear interpolation
on five samples. This is a small timing sample. The original receipt's
`short_ms` is the empty-input fixture and must not be presented as a nonempty
command. See the [supplemental benchmark](evidence/modernbert/browser-short-benchmark-baef6de.json).

JavaScript heap excludes WASM allocations. Process RSS can count shared pages
more than once, so the sum is not total physical RAM. GPU memory is unavailable
and no GPU-memory measurement is claimed. The browser model, owned Chrome session
and HTTP server were disposed and closed after the checks.

## Frozen quality evaluation: negative result

Collection covered all 1,113 eligible messages in the four `fresh2/opus_*`
folders and `short3`, with 17 pending-annotation exclusions under the existing
protocol. Message IDs were disjoint from the training inventory. The
[collection manifest](evidence/modernbert/collection-manifest-baef6de.json)
binds source, inputs, runtime, artifacts and completed records.

The predeclared SHA256(ID) partition uses 368 calibration messages with 808
requested actions and 745 test messages with 1,745 requested actions. Five
message-level calibration folds use fold-local priors and percentile tables,
L2 selection and the cost-10 objective. The final threshold is
`0.9765597115495379`. No test result was used to lower it.

| Fixed-gate test outcome | Count or value |
|---|---:|
| Requested actions done right | 16 |
| Requested actions done wrong | 0 |
| Asked / held | 1,625 |
| Unread / no paired request | 104 |
| Extras executed | 0 |
| Share of requests done right | 0.9169% |
| Observed wrong share of executions | 0 of 16 |
| Cost score per 100 requested actions | 0.9169 |
| Confidence AUROC | 0.888655 |

The registered success conditions were positive cost score, at least 20% of
requests right and at most 5% wrong executions. The 20% requirement failed.
Zero wrong among only 16 executions does not establish general 100% precision.
All 16 accepted requests were questions: seven `connected` and nine `path`.
No drawing command was accepted in this formalization test.

Seen triggers: 1,560 requests, 15 right, 1,467 asked, 78 unread. Unseen triggers:
185 requests, one right, 158 asked, 26 unread. Both groups had zero executed
wrong requests and zero extras. Full per-action tables and the diagnostic
risk-coverage curve are in the [quality report](evidence/modernbert/quality-report-baef6de.json).
The deployed gate remains the calibration-selected gate.

These counts score formalized requests and confidence/dependency decisions from
collected model outputs. They are **not 1,745 actions actually drawn on a live
canvas**. The separate live E2E scenario must inspect the engine and drawings.

## First causes and decision

Across the test partition, first mechanical causes total 844 downstream-head
cases and 445 cutter cases, covering 1,185 wrong/extra proposals and 104 unread
requests. These categories are not proof that every contextual reference
mismatch is a defective encoder head. Before the gate, the test
proposals contain 693 right, 948 wrong and 237 extras. The fixed gate holds all
1,185 wrong/extra proposals and 677 right proposals, leaving the 16 right above.

For example, `put a gray hexagon called Switch between Fw1 and Lan` yields action
`create` with probability 0.999517, but shape `circle` and no gray. Its calibrated
confidence is 0.182095, well below 0.976560, so it is held. `add a small red diamond
called Dlq below Clean` also proposes a circle and omits red, and is held.
The supplemental `draw a red circle.` benchmark proposes a red star on all five
calls. The original trained float graph makes the same star prediction, so this
error predates the weight-only compatibility conversion.

The [independent audit](evidence/modernbert/quality-verification-baef6de.json)
recomputed held-out outcomes, AUROC, pairing and dependency decisions, checked
calibration-only tables/priors, provenance and adversarial dependency guards.
It reused the closed source-bound OOF coefficient fit without refitting it.
It confirmed the negative experiment and found no provenance or metric blocker.

Stop this quality experiment at its fixed result. Do not loosen the gate or
retrain to improve the reported number. The artifact is now published as an
experimental reader. The [frozen eleven-message E2E run](diagram-e2e-five.md)
completed directly on Pages at `101edd92599c2bcae995082d037b7683637b1633`, with
all five readers ready. Manual grading found ModernBERT held all nine drawing
commands, correctly answered the path question and left the starter drawing
unchanged. Some held proposals were correct, while others contained wrong colors,
shapes or references. No wrong execution or extra action was observed. Independent
live grading confirmed all 50 requested-action outcomes and all five unsupported
controls. This adds actual canvas evidence to the separate
formalization evaluation. Any later training hypothesis requires a separately
declared run.
