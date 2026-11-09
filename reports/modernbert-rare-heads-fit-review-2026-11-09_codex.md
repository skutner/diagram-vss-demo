# Rare-head fit source review

Reviewer: independent `rare_fit_review`, code-reviewer, Sol XHigh. Initial review of base `0ab687cc142e884ed16332925c6d7cd558e1b8fb`, four new fit files in `T/fit-dev/candidate.json`, aggregate `5f57e7897655b72f0f304944a7403c8360d5ff112674ab5ae78c2cce4781d528`. T is `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09`.

**Outcome: BLOCKING FINDINGS.** All four candidate hashes and approved plan/review hashes matched before and after review.

## Blocking finding: permitted export differences rejected

`training/neural/parity/modernbert_rare_heads_fit.py:107–115` requires `arm_receipt.passed is True` in `load_context`, rejecting both float and ort fit commands with `ValueError("missing finalized export")` when a finalized export has `passed=false`.

Confidence 100. The reviewer inspected `arm_export.py:365–379`, neighboring handling at `modernbert_forms_measure.mjs:699–705`, and the rare runner's acceptance of export exit two. Exporter `passed` measures float/PyTorch versus q8 categorical agreement; exit two is a finalized export with reported quantization changes. The approved plan allows these differences as reported results while retaining separate strict Python-ORT versus Node-q8 parity. A focused read-only `python3 -B` mocked `load_context` probe reproduced the rejection for both runtimes without model loading or file writes.

Fix required: validate finalized export structure, weights, files, provenance and runtime evidence independently of float/q8 categorical agreement. Preserve/report that agreement result. Add regressions through the context loader for both runtimes, retaining strict Python/Node q8 failure handling and all binding checks.

## Coverage and remaining work

No other supported finding at confidence 80 or above. Peer freeze/measurement interfaces are dependencies outside this four-file review. Actual checkpoint loading, inference, sidecars, resource enforcement and learned R0 outcomes remain pending. Nine Python and five Node author tests were observed in logs as delegated fixture evidence; the reviewer did not repeat the suites. Historical B numerical failure remains unchanged. No project files changed during review.

Coordinator sent this exact finding to the original fit writer for a bounded fix and regression, followed by delta review. No training has started.

## V2 delta review — no blocking findings

Same independent reviewer, exact four-file aggregate `d7dcb4343719ba1cf02fac8dafe9b7873b639451cea65b29dcfc64596352742e`. Patch SHA-256 `d92cf2a5ccf262ba62455ba49386088a9a7885a4c4a837fa3abe7c2af5df50a5` was reproduced byte-for-byte from hash-verified preserved v1 files. All v2 hashes matched; both Node files are unchanged, so their earlier review is reused.

The export-verdict finding is **closed**. Finalized `passed=false` exports are accepted while runtime evidence, policy, inventory and shards are validated. Checkpoint, completion, provenance and file-hash bindings remain intact. Float/q8 diagnostics reach context, summary and receipt. Strict Python/Node q8 numeric parity, including padding, and categorical comparisons are unchanged.

Reviewer personally called `validate_finalized_export()` on the historical F-s0 receipt/config read-only: accepted `passed=False` without loading weights or models. Delegated evidence logs show baseline rejection for both runtimes and v2 11 tests OK, including 26 invalid-export variants; reviewer did not repeat suites. No new supported finding or delta risk was reported.

This approves the scoped source only. Actual inference, resource enforcement, learned fit, peer integration and release readiness remain pending. No project files changed during review.

## Producer v3 initialization delta — no blocking findings

Independent reviewer checked all four hashes in `T/evidence-validator-dev/producer-v3-candidate.json`, aggregate `8230d424f33eaf2b28452d5110b534eead0b7998f05c9d11ba8e7bff7fe88698`. Both Python files remain identical to approved v2. Only Node initialization and its focused test changed.

Integration testing reproduced `ReferenceError: SOPKit is not defined` when the standalone producer loaded neural.js. New `loadProductionReader()` initializes `globalThis.SOPKit` from logic.js before requiring neural.js, matching existing export/diagnostic patterns; `execute()` uses the helper. A fresh-process regression avoids module-cache or existing-global masking and checks initialization plus Unicode word splitting without inference. Tensor comparisons, decoding, receipts and strict q8 parity are unchanged.

Reviewer inspected delegated baseline failure and six-test success logs without repeating the suite. No supported finding or delta risk. New consumer-validator work is excluded from this producer review and remains subject to measurement review. Actual model/runtime and release gates remain pending.
