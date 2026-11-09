# Independent quality verification

Evidence integrity PASS; registered campaign FAIL. The coordinator inspected the saved outputs and successful check fields. No completed source suites, model probes, fit commands, evaluation, public verdict or root-cause producer were rerun.

## Commands actually run by the independent verifier

Both commands used `CUDA_VISIBLE_DEVICES='' HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 PYTHONDONTWRITEBYTECODE=1 TOKENIZERS_PARALLELISM=false`.

```text
node /tmp/rare-quality-verify.VgJw1v/verify.mjs
node /tmp/rare-quality-verify.VgJw1v/records.mjs
```

Both exited 0 with empty stderr. First command: 3,416 assertions; 22 independent paired full/clean comparisons; 162 root-cause reconciliations; 120 unique hashes. Second: same-function saved-record scoring exactly reproduced ten views, 17 populations, 27 sidecars and 10,499 threshold decisions over 8,055 records. This is saved-artifact consistency, not new inference or an independently implemented scorer.

Nine adversarial probes passed: unavailable risk, missing interval, different gold denominators, one resampling group, threshold equality, one representable value below threshold, missing confidence, orphan dependency and zero executions.

All R1–R3 numbers and statuses agree with the public verdict. R0 and actual fit/raw inference are reused, with matching source/receipt identities. P3 passes; R0, both R1 rows, R2 and both R3 rows fail. Confirmation remains prohibited.

The root-cause analysis has no round-trip oracle and label categories are unmeasured (`null`); zero data/output-limitation categories do not prove those causes absent.

Named role: implementation-verifier High, fresh context, no spawn-time model override. Desktop base configuration selects `agents.default_subagent_model=gpt-6-astra`; actual subagent model is not exposed by the runtime. No Max/Ultra selected. Persistent scripts, stdout/stderr and complete reports are under `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09/verification/quality-v1/`, bound by `quality-verification-manifest.json`.
