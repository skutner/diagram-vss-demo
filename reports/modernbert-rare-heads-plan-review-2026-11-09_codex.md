## Verdict
APPROVE — initial review of `reports/modernbert-rare-heads-plan-2026-11-09_codex.md`, SHA-256 `b11e15ef42c0ed19f93bfdf7583779993b63cbbc35a2f5d24a6963fb9d116be5`. No supported design defect found. The fixed objective, unchanged default path, provenance, controls, safety anchors, confirmation budget and stop rules form a coherent experiment. This is design approval; implementation and runtime evidence remain pending.

## Requirement coverage
Requirements below come from the supplied task brief and repository experiment rules.

| Requirement (quoted) | Covered by (plan section) | Status: covered / partial / missing / contradicted |
|---|---|---|
| “fixed all-head square-root presence frequency weighting” | One objective; Trainer API | covered |
| “normalized per head corpus mean” | Formula; P1; normalization probes | covered |
| “same F data/model/recipe/splits/gates” | Frozen basis; Recipe and exposure; R1–R4 | covered |
| “degenerate counts/literal none” | One objective; boundary probes | covered |
| “no minibatch renorm” | Explicit weighted arithmetic mean; normalization probes | covered |
| “opt-in legacy compatibility + source/resume identity” | Trainer API; Control compatibility; P2/P3 | covered |
| “cached F0 reuse vs new F1 control” | Control compatibility; R4 | covered |
| “B/C100 anchor safety/case guard not relaxed” | R1 benchmark; explicit R3 comparator matrix | covered |
| “training positive fit vs contextual gold conflicts” | R0; separately reported contextual labels and contradiction | covered |
| “robust actual evidence not old regex helper” | P3 execution receipts; false-pass probes | covered |
| “new W0/F1/W1 budget 3” | Review, verification and gates; R4 | covered |
| “prior failures remain” and “no new publication commit downloads” | Intent; Out of scope; P4 | covered |

## Findings (confidence ≥ 80)
None.

## Citation audit
Checked **17 distinct cited locations/ranges**, sampling across trainer, tests, export, evaluation, applicability and diagnostic execution. Both verbatim code quotations match.

| Cited location | Exists | Quote matches | Note |
|---|---|---|---|
| `finetune_modernbert_batched.py:121–131` | Yes | Yes | Current loss expression matches exactly |
| `finetune_modernbert_batched.py:298–312` | Yes | Yes | Optional settings pattern and source hashes |
| `finetune_modernbert_batched.py:370–423` | Yes | Yes | Preflight and independent overfit loss call |
| `finetune_modernbert_batched.py:426–459` | Yes | Yes | Data, metadata, resume and optimizer ordering |
| `finetune_modernbert_batched.py:515–550` | Yes | Yes | Request/cut backward passes and update state |
| `finetune_modernbert_batched.py:578–603` | Yes | Yes | Actual trainer argument definitions |
| `finetune_roles.py:73–89` | Yes | Yes | Absence at zero; literal `none` searched from one |
| `test_batched_trainer.py:66–70` | Yes | Yes | Test argument construction |
| `test_batched_trainer.py:133–160` | Yes | Yes | Existing exact recovery and refusal tests |
| `test_batched_trainer.py:354–363` | Yes | Yes | Existing eager/SDPA tolerances |
| `arm_export.py:116–139` | Yes | Yes | Completed-run, data and checkpoint binding |
| `modernbert_next_measure.mjs:624–633` | Yes | Yes | Identity-bound output recovery |
| `modernbert_next_measure.mjs:679–730` | Yes | Yes | Reusable evaluation entrypoint |
| `modernbert_forms_measure.mjs:369–397,481–540` | Yes | Yes | Outer identity/seal and applicability patterns |
| `modernbert_forms_measure.mjs:579–653` | Yes | Yes | Benefit, form, safety and confirmation calculations |
| `D/src/engine.py:38–89` | Yes | Yes | Actual checkpoint/q8 execution and layout validation |
| `test_output_contract.py:1–20` | Yes | Yes | Perfect-label fixture scope explicitly bounded |

Additional read-only inspection confirmed all seven input hashes in the plan. Standard-library JSON aggregation independently reproduced:

- 58,552 request rows, 52 heads, 14,640 updates and final batch size 24.
- Positive counts: `outline=186`, `desc:size=59`, `desc2:position=1`.
- Corresponding positive weights: `16.8211498`, `30.5481765`, `240.9813704`.
- Corpus-mean weights equal one to floating-point precision.
- F-s0 completion records epoch eight and update/total 14,640.

The traced flow was data/layout → target generation → request loss → ordinary/preflight/overfit callers → checkpoint identity → export binding → evaluation → numerical rows. Existing campaign wrappers are not W-aware; the plan correctly assigns new wrappers and explicit comparator mapping.

## Acceptance-criteria audit
| Criterion | Runnable / observable | Would fail if requirement unmet | Note |
|---|---|---|---|
| P1 preparation | Observable manifests; proposed freeze/verify commands | Yes | Counts, ordering, hashes, unknown values and normalization enforced |
| P2 source/harness | Existing trainer suite plus explicitly proposed suites | Yes | Default gradients, weighted gradients and exact recovery distinguish relevant failures |
| P3 completion/evidence | Completion metadata, execution receipts and actual tensor/decoding comparisons | Yes | Fixture scope cannot establish model accuracy; new numerical failures remain failures |
| R0 positive/absence fit | Fixed row-ordinal selections and explicit integer thresholds | Yes | Both float and production Node-q8 required; contextual labels separated |
| R1 benefit | Recomputed W/F and W/B paired comparisons | Yes | Requires executions, finite risk and supported intervals |
| R2 forms/counts | Frozen all-gold populations and fixed numerical bars | Yes | Learned counts and perfect-label oracle remain separate evidence |
| R3 safety/case | Explicit comparator matrix and numerical checks | Yes | B anchor prevents preserving F’s existing regressions from passing |
| R4 confirmation | Recomputed prerequisites and two-seed comparison | Yes | No confirmation after a seed-zero miss |
| P4 reporting | Reconciled root-cause artifacts and required tables | Yes | Includes wrongs, extras and held/unread outcomes |
| Budget/recovery/ownership | Ledger, locks and refusal probes | Yes | Three declared trajectories; identical recovery only |

The new commands are specified interfaces, not existing executable evidence. Their implementation and enforcement require the planned scoped reviews and checks.

## Decisions for the user
None.

## Risks / open questions (confidence < 80)
- Cached applicability is still pending; source inspection and matching pins do not establish complete runtime/environment applicability.
- Weighting can amplify noisy rare labels and alter shared gradients despite corpus-mean normalization. The fixed fit and execution gates appropriately make this a possible negative result.
- B-s0 is a fixed preservation anchor for both seeds. As explicitly disclosed, confirmation supports two-seed W/F evidence, not a seed-matched two-seed W/B conclusion.

## Not assessed
No files were edited. No tests, builds, inference, model loading, training, GPU work, exports, downloads, services, browser actions or Git mutations were run.

Review covered requirement mapping, cited source grounding, representative flow, contradictions, scoped integrity/resource boundaries, acceptance design, adversarial verification, independent review gates, sequencing and backward compatibility. New implementation correctness, complete cached applicability, resource behavior and experimental outcomes remain unverified. Prior implementation reviews and diagnostic runtime results were read as recorded evidence, not rerun.
