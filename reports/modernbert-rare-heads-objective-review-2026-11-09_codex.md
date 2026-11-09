# Rare-head objective and freeze source review

Independent reviewer `rare_objective_review`, code-reviewer Sol XHigh. Initial six-file candidate `T/objective-dev/candidate.json`, SHA-256 `f7bae6a804b5eeb5bbd653470b8ac9015b7a726129942f24d0473c5d02485541`; tracked diff `45e1faad841cb6d6d0d84cbc47da9bec60b693fb1e56f5e2dfcfd12fc0e16ff5`; base `0ab687cc142e884ed16332925c6d7cd558e1b8fb` plus preserved initial dirty snapshot. T = `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09`. All six live files matched their snapshots through review completion.

**Outcome: BLOCKING FINDINGS for the freeze inventory.** No identified blocker in the loss, default path, propagation or recovery changes.

## Independent arithmetic probe

The reviewer ran a locked, CPU-only read-only probe using actual `Layout`: 58,552 rows, 52 heads, all positive/absence counts and formula values matched. Maximum corpus-mean weight error was `2.22e-16`. Required R0 population sizes matched, and observation indices preserve repeated IDs. No model inference or full suites were run.

## Blocking finding: executed export dependencies omitted

Confidence 100. `modernbert_rare_heads.py:209–217` constructs expected sources solely from the protocol's `source_paths`, then compares them and input inventories with the freeze. Four directly executed/read files were absent from those maps, inherited pins and inventory roots:

- `training/neural/export_modernbert.py`
- `training/neural/modernbert_weight_only.py`
- `training/neural/modernbert_parity.mjs`
- `training/neural/fixtures/modernbert_alignment.json`

`arm_export.py` imports the first two at lines 40/45, calls conversion/packing at 315–319, reads the alignment fixture at 278 and invokes Node parity at 357. Exporter provenance covers training sources, not these helpers. A read-only coverage probe returned `bound_by_freeze=False` for each. Thus changing these consumed files after freezing would evade the approved source-change refusal. No existing refusal test covered the omission.

Required fix: register this direct dependency closure, inspect remaining directly consumed export helpers, and add focused mutation-refusal coverage. No algorithm or acceptance threshold changes are needed. Production freeze waits for corrected candidate review.

## Remaining gates

Canonical P2 suites, production freeze/verify, training/export and actual-model measurements remain pending. Author logs include a cap-fixture failure followed by a focused correction; they do not establish a full passing suite. Fit and measurement received interface inspection only and retain separate review gates. No other supported finding or speculative blocker was reported.

Coordinator returned this exact finding to the original writer for a bounded fix and subsequent delta review. Historical caches and unrelated work remain unchanged.

## V2 delta review — no blocking findings

Same independent reviewer verified candidate manifest `890d7a6a7b01379811b3588511cdf73129e0dc163a7f699911f70bf009806f1e`, fix diff `3d498dfdc89b2d547a8dc58520fa54f93ec28a018d8eedeff4d098ca10cd4c7f`, and all six live/snapshot hashes. Only protocol and protocol tests changed. Prior trainer/objective review remains applicable.

**A1 is closed.** The three executed export helpers are now source-bound and the alignment fixture is input-pinned. Their inspected direct dependencies are already source-bound or covered by the protocol's package versions. The new isolated test exercises real freeze/inventory/storage/verification: changing each helper or the fixture must fail, and restoring bytes must verify again. Corpus/objective arithmetic is explicitly stubbed, so that fixture claims only inventory behavior.

Reviewer inspected preserved baseline failure and the author log with 10 tests OK; no suite or model rerun. No supported delta finding or open risk. This approves the planned offline validation step, not experiment success or release readiness. Production freeze/verify, canonical P2 evidence and actual-model execution remain pending.
