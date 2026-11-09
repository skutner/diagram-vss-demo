# Review of the ModernBERT next-step plan

Date: 2026-11-08. Plan: [modernbert-next-plan-2026-11-08_codex.md](/home/skutner/browserLLM/diagram-vss-demo/reports/modernbert-next-plan-2026-11-08_codex.md).

The architect and independent reviewer were launched in separate fresh contexts with explicit `model=gpt-6-astra`, `reasoning_effort=max`. They followed the repository's plan-architect and plan-reviewer contracts. The built-in named profiles fix Sol, so the launches used the default agent type with explicit model/effort overrides. These are confirmed launch settings; independent effective-model introspection was unavailable.

This record consolidates the independent review and its targeted follow-up. No implementation or runtime result is claimed.

## Verdict

**APPROVE — final delta review.** Reviewed plan SHA-256:

```text
0ef29893509256a11f2859fb4b2fbfab45ca2ae448db26795315ceeab26c587b
```

The reviewer verified this hash directly. Its final verdict was:

> The prior Major finding is closed. The additional clarifications address the earlier denominator, confirmation-scope, artifact-identity and regression-evidence concerns without expanding the campaign. No new material contradiction found. Approval concerns the design; implementation and runtime evidence remain pending.

The initial review was **APPROVE WITH CHANGES**, with one Major and no Blocking finding, against SHA-256 `1ccb6d994715c23e81e32b084315bc7072f3b7e22b7ef252f6b1ded88bf265b6`. The architect supplied the targeted resolution; the coordinator applied it and the reviewer checked the resulting delta. Unchanged source evidence was reused.

## Requirement coverage

| Requirement | Coverage | Status |
|---|---|---|
| Plan the best next approach | Truthful outputs, frozen protocol, separate realistic-data/r2 arms, bounded confirmation | Covered |
| Astra Max architect and reviewer | Separate explicit launches and role contracts as recorded above | Covered at configured level |
| Planning, not implementation | Scope, proposed commands, future authorization and publication gates | Covered |
| Preserve completed VSS-BERT experiment/F-C | No changes to that protocol or reader; evidence reused only where applicable | Covered |
| Whole messages and learned mappings | Overlays preserve text; new outputs derive from annotations | Covered |
| Prioritize confident mistakes | Cost-10 rule, risk/coverage and source-specific guards | Covered |
| Fixed experiments and stop rules | Frozen populations/bars; no post-miss rescue or extra runs | Covered |
| Model-unseen calibration and meaningful evaluation | Complete-span grouping, reservations, support checks and exposure reporting | Covered |

## Findings (confidence ≥ 80)

**None remaining.**

### Closed Major: diagnostic stratum also vetoed an arm

The initial plan's Interfaces §4 called `data_attested_word_names` “Diagnostic only,” while criterion 16 required that stratum's paired `CI_low > 0`. Since R stops on a deciding miss, two implementations could produce different campaign verdicts. The reviewer assigned confidence 100 and re-opened both passages with surrounding context before reporting it.

**Resolution:** the stratum is now strictly diagnostic: no veto or campaign stop. Counts/right share are reported for a nonempty population. An interval requires at least 40 requests and ten independent groups; otherwise it is unavailable. No predicate enlargement is allowed to manufacture support. R's primary lower-case populations, guard and risk bars remain unchanged. The delta reviewer confirmed this closes the finding.

### Other clarifications accepted in the delta

- Criteria 16/18 explicitly divide by all frozen gold requested actions, including structural holds/unread requests. A proposed fixture with one correct output and nine held requests must score 10%, not 100%.
- R-s1 is the matched control for S-s1. Without B-s1, the plan does not claim a two-seed R−B case benefit or automatically add a sixth run.
- Browser receipts and later evidence stay outside the frozen export directory. Adding a receipt/README inside it after collection changes the directory hash and invalidates affected evidence.
- `regress.sh` requires inspection of its actual failures/warnings and table; its exit status alone is insufficient.

These were nonblocking clarifications or risks in the initial review, not additional demonstrated runtime defects.

## Citation audit

The independent reviewer opened a sample of **16 cited source locations**, plus related UI/trainer/tests and the completed VSS-BERT result. All sampled locations existed and supported their quoted/cited behavior. This is delegated source-review evidence, not newly executed runtime validation.

| Cited source | Checked behavior |
|---|---|
| `training/neural/make_roles.py:397` | Training-only layout values/action keys |
| `training/neural/make_roles.py:451` | Empty text produces no tagged value |
| `training/neural/make_roles.py:533` | Data-derived implied heads and whole-message cuts |
| `training/neural/roles_roundtrip.py:212` | Row regeneration and exact training-row comparison |
| `training/neural/roles_roundtrip.mjs:26` | Existing SOP default requires ModernBERT preparation adaptation |
| `docs/js/neural.js:270` | Missing text span returns null |
| `docs/js/neural.js:293` | Context substitutes last shape |
| `docs/js/neural.js:362` | Actual cut/read/decode/context flow |
| `docs/js/neural.js:553` | ModernBERT preparation and token caps |
| `docs/js/neural.js:654` | Hard holds, dependencies and execution filtering |
| `training/neural/parity/calibrate_arm.mjs:19` | Existing today labels/index-modulo folds |
| `training/neural/calibrate_modernbert.mjs:205` | Ask-all, cost maximization and threshold ties |
| `training/neural/parity/sets.mjs:53` | Connected session/group pattern |
| `training/neural/parity/compare_arms.mjs:21` | Paired resampling; caller's minimum-unit gate |
| `training/neural/parity/arm_export.py:220` | Command flags, direct export-root layout, exit-2 meaning |
| `training/neural/check_modernbert_browser.mjs:11` | Pinned WASM, production decoder, observed assets and disposal |

Additional checks confirmed the existing UI rejects `h.blocked` and disables the held-request override (`ui.js:1276,1573`); trainer flags and empty-heldout requirement match (`finetune_modernbert_batched.py:82,578`); the VSS-BERT result records C=true and A/B/D=false with F-C next (`VSSBERT_SHORT_COMMANDS_PLAN.md:438`). Both prior-review hashes matched the plan anchors.

The delta review re-used those source checks and inspected revised plan lines 186, 190, 293, 295, 299, 309, 313 and 323, covering the diagnostic status, denominators, confirmation scope, external receipts, regression evidence and partial-hold fixture.

## Acceptance-criteria audit

| Criteria | Assessment | Remaining execution |
|---|---|---|
| A1–8: provenance, separation, preservation, legacy behavior | Concrete artifacts and explicitly proposed tools; historical assertions preserved | Implement and execute |
| B9–14: states and contextual holds | Real decoder/engine oracle probes; old round-trip concessions cannot pass new exact capability | Implement and execute |
| C15–16: control/R case improvement | Fixed primary populations; diagnostic contradiction closed | Establish support and run arms |
| C17–21: r2, forms, label safety, guards | Observable scores; all-gold denominators now explicit | Run exact candidates |
| C22: confirmation | Supports stated S−R/S−C100 claims, not two-seed R−B | Run only if prior stages pass |
| C23/D24–30: product, export, resources, Settings | Exact artifacts/current browser evidence required; exit 2 is not parity success | Future candidate verification |
| D31: repository regression | Existing command; inspect underlying output, not exit alone | Required before relevant commit |
| Adversarial probes/review gates | Relevant boundaries, invalid states, overlaps, ownership and failure cases specified | Future scoped reviews/checks |

## Decisions for the user

No decision is needed to complete this planning task. The agreed diagnostic correction introduced no new user question.

A future implementation instruction can accept the concrete annotation/schema decisions and offline experiment sequence. Publication of the optional tab remains a distinct scope unless that instruction also authorizes it. Design approval is not implementation approval, a successful experiment or release readiness.

## Risks / open questions (confidence < 80)

- Connected grouping may leave inadequate support. The plan stops before training instead of relaxing the rule or claiming an empty comparison passed.
- Actual recognition of empty/unresolved outputs remains unmeasured. Oracle tests establish output semantics, not learned accuracy.
- Lower-case transfer beyond the familiar drawing is still a hypothesis.
- Two fixed seeds do not establish the full distribution of training outcomes; confirmation scope is explicit.
- Current browser latency, memory, parity and ownership cleanup remain unverified.

No new material risk was identified by the delta review.

## Not assessed

Neither plan-review pass wrote files or ran tests, builds, model inference, training, exports, browser sessions, downloads, services or Git mutations. The reviewer used read-only source inspection and hashing. Numerical historical results remain recorded/delegated evidence, not fresh reproductions.

The coordinator wrote only this review record and the plan during this planning task. Source, data, model and configuration changes remain future work.
