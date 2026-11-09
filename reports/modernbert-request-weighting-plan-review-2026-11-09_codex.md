# Independent review: ModernBERT whole-request class weighting

## Verdict

APPROVE — **PASS for design readiness only.** Initial review of `reports/modernbert-request-weighting-plan-2026-11-09_codex.md`, SHA-256 `6c459736f0353040265ff6f39d905404706036febd5982dfab67ad4af9d63cfc`. No supported material defect found. The objective, joint-fit predicate, cached-evidence boundary, controls and finite budget are sufficiently specified. Implementation and experiment execution remain unauthorized.

Observed HEAD is `0ab687cc142e884ed16332925c6d7cd558e1b8fb`; `git diff --binary | sha256sum` matches supplied identity `c2e18be1dcd3f3bce422689e097a225ee038687991504a34f55aa4d55909f17a`. Repository: `/home/skutner/browserLLM/diagram-vss-demo`.

This review uses the parent's supplied current-task requirements. The named role is plan-reviewer, XHigh. The inspected desktop configuration specifies `agents.default_subagent_model = "gpt-6-astra"`; actual runtime model identity is not exposed.

## Requirement coverage

| Requirement (quoted) | Covered by (plan section) | Status |
|---|---|---|
| “plan plus independent review only” | Opening boundary; Review, authorization boundary | covered |
| “exact request-class weighting max-positive-rarity formula/global normalization” | Exact objective, lines 42–97 | covered |
| “inherited controls and appetite/safety gates” | Fixed recipe and controls; R1–R3 | covered |
| “full-vector J0 57/57+32/32 with action/tags in both runtimes” | Exact joint-fit population and gates, lines 118–133 | covered |
| “trainer changes cannot blanket-exempt inference” | Historical applicability contract, line 112 | covered |
| “one-overfit/one-trajectory/max-two-training-invocation/10800s aggregate recovery” | Budget and stop rules, lines 149–164 | covered |
| “finite downstream budgets” | Phase table; export and independent verification limits | covered |
| “honest evidence” | Raw-output reconstruction, provenance, completion and reporting contracts | covered |
| “old W/R/F stopped and no confirmation budgets reopened” | Fixed intervention; final interpretation | covered |

## Findings (confidence ≥80%)

None.

## Citation audit

Checked **all ten explicit source-location ranges** in the plan's grounding paragraph. Descriptive claims match the inspected code; these are not verbatim code quotations.

| Cited location | Exists | Quote matches | Note |
|---|---|---|---|
| `finetune_modernbert_batched.py:121–138` | Yes | Description matches | Existing CE/W request-loss paths |
| `finetune_modernbert_batched.py:305–329` | Yes | Description matches | Settings, metadata and objective loader |
| `finetune_modernbert_batched.py:387–454` | Yes | Description matches | Preflight, independent overfit and training setup |
| `finetune_modernbert_batched.py:535–570` | Yes | Description matches | Request/cut losses, updates and preflight propagation |
| `finetune_roles.py:83–89` | Yes | Description matches | Absence zero; literal `none` searched from index one |
| `modernbert_class_loss.py:22–66` | Yes | Description matches | Counts, unknown-value rejection and canonical recomputation |
| `modernbert_rare_heads_fit.py:193–248` | Yes | Description matches | Existing correctness predicate measures selected head |
| `modernbert_next_measure.mjs:679–731` | Yes | Description matches | Collection, grouped calibration and truthful scoring |
| `modernbert_forms_measure.mjs:485–540` | Yes | Description matches | Cached source/input/runtime applicability |
| `modernbert_forms_measure.mjs:579–624` | Yes | Description matches | Benefit, capability and preservation checks |

The representative flow traced was corpus/layout → target generation → request loss → preflight/overfit/full training → checkpoint identity → export binding → raw fit evidence → quality scoring and verdict. Neighboring trainer, fit-consumer and measurement tests were inspected, not executed.

**Observed arithmetic:** one source-free standard-library pass with `python3 -B` reproduced every published weighting statistic exactly: 58,552 rows, 52 heads, raw sum `219424.52847050782`, μ `3.747515515618729`, mean q `1.0`, all percentiles/extrema, 2,900 all-absent rows and the identified maximum-weight row. It also reproduced 28,330 messages, 14,640 updates and final batch size 24.

The frozen population contains 57 observations/57 distinct requests with specified fill and 32 observations/28 distinct requests without fill. The first group has 55 ordered color pairs and uniform q `4.4886137801464265`. Saved W outputs independently reproduce complete-class counts 73/89 float and 72/89 q8, with 41/57 and 40/57 on the two-color group; action/tags are correct throughout these populations.

All **11 frozen input/artifact hashes** listed in the plan were checked and match. TJ was absent. The initial `python` command failed before executing because that alias is unavailable; `python3 -B` performed the single arithmetic pass successfully.

## Acceptance-criteria audit

| Criterion | Runnable / observable | Would fail if requirement unmet | Note |
|---|---|---|---|
| Frozen formula, counts, order and normalized weights | Observable manifests; proposed freeze/verify commands | Yes | Exact recomputation plus numerical references |
| Ordinary CE/W preservation and J gradient | Existing trainer suite plus proposed tests | Yes | Requires losses, gradients and settings; prohibits stacking |
| Full-corpus propagation | Proposed caller and boundary tests | Yes | Covers preflight, overfit and full training |
| J0 | Complete raw/decoded outputs and explicit integer predicates | Yes | All classes, action and tags jointly required in both runtimes |
| R0 and strict q8 parity | Existing populations and raw batch tensors | Yes | Includes absent controls, padding and decoding |
| R1–R3 | Frozen scores and paired sidecars | Yes | Separate F/B comparisons and F/B/C100 safety anchors |
| Recovery and budget | Durable ledger, receipts and refusal probes | Yes | One overfit; at most two training invocations; aggregate cap |
| Completion/export | Completion metadata and final-checkpoint identity | Yes | Partial schedule and unrelated export cannot qualify |
| Evidence integrity | Raw reconstruction and adversarial receipt tests | Yes | Fixture-only, partial and changed-dependency claims refuse |
| Final reporting and independent review | Review records and reconciled report artifacts | Yes | Measured failure remains failure; no confirmation follows |

New J commands are explicitly proposed interfaces, not currently executable evidence. Exact output registration, implementation checks and independent source review precede authorized model work.

No material recovery-accounting ambiguity remains: line 162 counts supervised elapsed time from **all** training attempts and refuses recovery without reliable accounting. The trainer's checkpoint elapsed value alone would not satisfy that requirement.

The public acceptance rule is also clear: line 137 requires every gate; lines 143 and 192 prevent missing or invalid evidence from becoming a measured pass. A fit miss still leads to the registered quality measurement and failure report.

## Decisions for the user

None.

## Risks / open questions (confidence <80%)

- **Nonblocking implementation refinement:** make the verdict's validation of the complete attempt ledger explicit. Existing W `completionChecks` selects the last receipt per phase (`modernbert_rare_heads_measure.mjs:113–120`); copying that alone would not establish J's aggregate accounting. The plan already requires complete accounting and evidence integrity, so this is an implementation-review focus, not a design blocker.
- Cached applicability remains a future gate. This review inspected the separation between historical training provenance and current inference dependencies; it did not certify every cached runtime dependency.
- The 64.30× outlier, ordinary-row downweighting, annotation contradictions and narrow two-color construction remain disclosed experimental limitations.

## Not assessed

No files were written by the reviewer. No tests, model loading, training, inference, export, calibration, evaluation, downloads, services, browser actions or Git mutations were performed.

Historical reviews and runtime reports were reused as recorded evidence; their prior passing checks were not rerun or relabeled as J evidence. The 80-request F/W fill/outline diagnostic counts were not independently recalculated in this review.

Requirement coverage, grounding, representative flow, contradictions, ownership/resource boundaries, acceptance, verification design, review gates, sequencing and compatibility were assessed. Actual J implementation, resource enforcement, full cached applicability and learned outcomes remain unverified.

No additional plan-review round is needed unless a material design decision changes. Later implementation requires the already specified scoped source reviews, checks and independent runtime verification.

---

Coordinator record: saved the independent reviewer response with formatting adjustments only. The reviewed plan was not changed after review. The parent also personally counted the 80-request F/W diagnostic populations from saved records in the preceding explanatory turn; those results are distinct from this reviewer's independently reproduced checks. Plan and review are uncommitted documents; no experiment root was created.
