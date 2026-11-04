# ModernBERT integration checkpoint

Updated 2026-11-04. Fork: https://github.com/skutner/diagram-vss-demo.
Demo: https://skutner.github.io/diagram-vss-demo/.

Training and strict export validation are complete. **The task-quality experiment
failed:** the frozen gate accepts only 16 of 1,745 requested actions correctly
(0.92%). The model remains experimental. See the [full report](modernbert.md).

## Completed

- Apparatus recovered after Daniel's reboot. The expected RTX 3060 Laptop GPU
  reported recovery action `None` and passed the native CUDA probe.
- One fixed seed-0 FP32 epoch completed: 54,584 request/cut pairs, 3,412 optimizer
  updates, 4,652.95 seconds (77 minutes 33 seconds). The closed checkpoint and
  source/data hashes were independently checked. The GPU job exited and released
  its lease.
- The initial dynamic-activation q8 export failed cross-runtime numeric and
  decoded-output parity. Its failure evidence is retained. The separately
  registered compatibility conversion preserves its compressed weight bytes and
  uses FP32 arithmetic with Basic graph optimization.
- The accepted full-sized artifact passed all 19 fixtures, including padded
  batches, on Python ORT, native Node and actual Chrome WASM. Exact token IDs and
  decoded actions, values, roles and cuts agreed, with the fixed numeric tolerance.
- Collection completed all 1,113 eligible fresh2+short3 messages. Calibration used
  368 messages only. The remaining 745 messages contain 1,745 requested actions.
  Independent verification reproduced the negative result and checked provenance
  and dependency guards. No thresholds or weights were changed after this result.
- The closed model and confidence files are installed locally for publication.
  Model version `663a4edb5b` and confidence version `97aa94d96f` are stamped.
  All five readers loaded together locally. The publication regression reproduced
  the baseline Rules/VSS table, all 359 operation checks and all history checks.
  [Regression evidence](evidence/modernbert/publication-regress/invocation.txt).
  Direct five-reader Pages evidence remains pending.

## Existing evidence retained

The [MPS pilot](evidence/mps-pilot-62a5b8d/stopped.json) stopped after 17 pairs at
the host-memory guard. It was superseded by the fresh CUDA run, not resumed on a
different device. The earlier [four-reader live baseline](diagram-e2e-baseline.md)
remains a separate result. The native SOP-BERT confidence teardown fix and its
[positive](evidence/native-confidence-cleanup/native-confidence.txt),
[negative](evidence/native-confidence-cleanup/native-confidence-negative.txt) and
[cleanup rejection](evidence/native-confidence-cleanup/footer-probe.json) evidence
also remain separate from the ModernBERT quality test.

## Remaining gates

1. Publish the experimental artifact and frozen confidence gate to this fork's
   Pages site, then confirm the deployed commit and all five ready readers.
2. Run the frozen eleven-message scenario directly on Pages, inspect each
   reader's intent, holds, executed actions and drawing, and report requested
   actions right/wrong/asked/not done plus extras.

The validated browser backend is WASM with FP32 arithmetic. WebGPU execution and
performance have not been established for this artifact. The live comparison is
pending and must not be inferred from export parity or offline formalization.
