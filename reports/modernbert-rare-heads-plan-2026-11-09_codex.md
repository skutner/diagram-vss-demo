# SPEC: ModernBERT rare-head loss experiment

## Intent (1 paragraph)

Test whether a fixed, data-derived increase in supervision for populated class targets improves ModernBERT’s rare-head learning. Train **W**, using the existing F data and recipe with one changed objective: square-root inverse-frequency weighting of positive versus absent targets, normalized separately for every class head. Compare W-s0 with the completed ordinary-CE F-s0 control; confirm only after all seed-0 gates pass. Loss imbalance is a hypothesis, not an established cause. Training fit is necessary diagnostic evidence; the existing execution-risk, form, label and case requirements still govern success. This is a new, authorized offline experiment, not continuation of either stopped campaign.

## Out of scope

- Data edits, label repairs, augmentation, resampling, cue tables, head-specific exceptions or weight searches.
- Encoder, architecture, tokenizer, decoder, confidence features, calibration method or split changes.
- Resuming R/F campaigns, replacing their verdicts, or treating their unused budgets as available.
- Downloads, installations, Claude-session creation, publication, deployment, commits or pushes.
- Browser/product/resource/Settings release validation.

## Files to create

Repository paths are relative to `/home/skutner/browserLLM/diagram-vss-demo`.

- `training/neural/parity/modernbert_rare_heads_protocol.json` — fixed objective, comparator matrix, budgets, inherited protocol references and acceptance rules.
- `training/neural/parity/modernbert_rare_heads.py` — freeze/verify inputs and objective manifest; run source-bound training-fit measurements.
- `training/neural/parity/modernbert_rare_heads_measure.mjs` — campaign-bound applicability, evaluation, execution receipts and verdict commands using existing measurement primitives.
- `training/neural/parity/modernbert_rare_heads_train.sh` — restricted trajectory runner retaining existing locks, limits and completion checks.
- `training/neural/parity/test_modernbert_rare_heads.py` — objective-manifest, frozen selection and identity tests.
- `training/neural/parity/test_modernbert_rare_heads_measure.mjs` — comparator mapping, evidence, verdict, prerequisite and runner refusal tests.
- `reports/modernbert-rare-heads-implementation-checkpoint.md` — ownership, immutable candidate references, commands, budget and outstanding gates.
- `reports/modernbert-rare-heads-2026-11-09.md` and `reports/evidence/modernbert-rare-heads/` — completed experiment report and compact evidence.

Large outputs belong under **T = `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09`**, absent during inspection. Assert absence before claiming ownership. Plan/review files kept outside Git use `_codex`; source and evidence filenames do not.

## Files to modify

- `training/neural/finetune_modernbert_batched.py:121–131,298–312,370–423,433–459,522–550,578–603` — add the opt-in objective, propagate it through training/preflight/overfit, and bind it into provenance and resume identity.
- `training/neural/parity/test_batched_trainer.py:66–70,133–160,393–419` — cover default-path equivalence, weighted-loss gradients, objective recovery and refusal conditions.
- `training/neural/MODERNBERT_RUNLOG.md:852–874` — append the separate experiment’s observed disposition without rewriting prior results.

Do not modify historical campaign tools, runtime readers or cached inputs.

## Interfaces / contracts

**Frozen basis.** Define:

- **FROOT** = `~/.cache/diagram-vss-modernbert/forms-2026-11-08`.
- **OLD** = `~/.cache/diagram-vss-modernbert/next-2026-11-08`.
- **D** = `~/.cache/diagram-vss-modernbert/diagnostics-2026-11-09`.

All three remain read-only. Reuse `FROOT/data-v2/F` directly: **28,330 messages, 58,552 requests and 52 class heads**. Do not rebuild, reorder or add files inside it.

Observed identity pins:

| Input | SHA-256 |
|---|---|
| Diagnostic report | `99dbed6096f6eb432ee2e5377ec812b64c51708584eeeac1a0e852b38a2eb20e` |
| F manifest | `d6250c7082e3eccd3788ed55c894f131c4d557f9fa60b327f635dc500e21d7c3` |
| F `train.jsonl` | `bfdb92373d8eecdc7902d23e309c68d29fc610ed63334ddad7f18213fb90c7ce` |
| F `reader.json` | `5abf1240d90852f26239ff8c7077bfcdeef44a6f6612112db8973fc213756046` |
| Forms frozen protocol | `61524cc13da0f20a0212def83b7f0855e6bad557fdfd99b3ceb3e36b857d2f39` |
| D training selections | `7adde40a06ac6d630a291bf7f9d66fd7662c652f7cbe3b559e0e22eb8373c723` |
| D label-membership audit | `8163b72b93e37bb93fe0746c01f89469ab01b50209f6def4184465414f32eb0b` |

Freeze full identities for inherited memberships, groups, folds, views, addendum, overlays, data files, tokenizer, models, dependency versions, scripts, plan and review. Preserve prior overlap/exposure findings and conservative clean populations.

**One objective.** The present class-loss expression is:

```python
# training/neural/finetune_modernbert_batched.py:129
loss = loss + sum(ce(sl[:, s:s + c], yc[:, i]) for i, (s, c) in enumerate(zip(layout.offsets[:-1], layout.class_sizes))) / len(layout.class_sizes)
```

For head \(h\), count targets using the actual `Layout.class_targets` implementation over **all N training rows**, before training:

- \(P_h=\#(y_h>0)\), \(A_h=\#(y_h=0)\), \(N=P_h+A_h\).
- When both counts are nonzero:

\[
w_{h,+}=\frac{N}{\sqrt{P_h}(\sqrt{P_h}+\sqrt{A_h})},\qquad
w_{h,0}=\frac{N}{\sqrt{A_h}(\sqrt{P_h}+\sqrt{A_h})}.
\]

- When either count is zero, use both weights equal to one and record the missing population.

For minibatch size \(B\), replace only the class term with:

\[
\frac1H\sum_h\frac1B\sum_i w_{h,\mathbf1[y_{ih}>0]}\operatorname{CE}(z_{ih},y_{ih}).
\]

Use unreduced CE followed by weighted arithmetic mean. **Do not use minibatch weight-sum normalization**: a batch containing one rare positive must retain its increased contribution. No clipping, smoothing, adaptive normalization or later coefficient adjustment.

The corpus-average weight for each head is one. Observed F counts imply approximately `outline` positive/absent weights `16.821/0.950`, `desc:size` `30.548/0.970`, and the one-positive `desc2:position` `240.981/0.996`. This fixed tempering avoids the corresponding full inverse-frequency maximum of 29,276.

Apply the same rule to every class head, including fill and text-state heads. Index zero means absence; **literal `outline="none"` and `arrow="none"` remain positive classes**. `Layout.class_targets` explicitly searches populated values from index one:

```python
# training/neural/finetune_roles.py:87–88
v = row["classes"].get(k)
out.append(vals.index(v, 1) if v is not None and v in vals[1:] else 0)
```

No action, tag or cut loss changes. Keep existing action weighting, including the overfit gate’s existing omission of action weights.

**Trainer API.** Add `--class-loss-manifest FILE`, default absent. The manifest records formula version `sqrt-positive-absent-v1`, data/layout hashes, ordered head/value layouts, integer counts, weights and normalization. The trainer recomputes and validates it; unknown values, wrong ordering, changed counts or nonfinite weights fail before optimization.

Add an optional final `class_weights=None` argument to `request_loss`. With `None`, preserve the existing calculation and default settings shape. W supplies the same full-corpus weights to training, preflight and overfit. Record objective identity in W’s settings/checkpoints, overfit receipt, environment and completion metadata. Default control provenance explicitly identifies ordinary CE in the outer campaign receipt.

**Recipe and exposure.** Every new trajectory starts from pinned base revision `8949b909ec900327062f0ebf497f51aef5e6f0c8`: eight epochs; LR/head LR `6e-5`; request/cut batches `32/8`; weight decay `.01`; warm-up `.06`; clip `1`; FP32 weights/BF16 autocast; SDPA; caps `128/512`; no extra drawing pass or checkpointing. Keep shuffle/RNG streams and all 14,640 updates unchanged. Every request appears once per epoch, including the final 24-row batch. Weighting increases contribution, not exposure: rare rows do not appear in additional batches.

**Commands.**

- `modernbert_rare_heads.py freeze --protocol FILE --out DIR`: write immutable inputs, loss manifest, diagnostic selections and compatibility audit.
- `... verify --protocol FROZEN_FILE`: recheck all consumed identities and objective arithmetic.
- `... fit --protocol FROZEN_FILE --name W-s0|F-s1|W-s1 --runtime float|ort --out DIR`: measure the frozen own-training selections using the actual completed checkpoint or finalized q8 artifact.
- `modernbert_rare_heads_measure.mjs applicability --protocol FILE --name F-s0|B-s0|C100-s0 --out DIR`: validate historical evidence without modifying it.
- `... evaluate --protocol FILE --name NAME --model DIR --training DIR --out DIR`: validate registered identity and call unchanged `evaluateArm`.
- `... evidence --protocol FILE --out DIR`: execute fixed fixture commands and record their actual scope.
- `... verdict --protocol FILE --stage seed0|control1|confirmation --out DIR`: load registered artifacts and recompute all required rows.
- `... check-pass --protocol FILE --stage STAGE --verdict FILE`: recompute prerequisites from their underlying evidence.
- `STOP_AT="YYYY-MM-DD HH:MM" modernbert_rare_heads_train.sh W 0|F 1|W 1`: run only the declared trajectory.

Successful commands exit zero; failed/missing identities or gates exit nonzero. A verdict file alone never unlocks a trajectory. Outputs are new task-owned paths or identity-identical resumptions; changed identities and existing foreign/export directories are refused.

**Control compatibility.** Reuse F-s0 at `FROOT/F-s0/bundle`, including its sealed `eval` subdirectory; do not refit its confidence. Validate its completed schedule, original trainer identity, weights/export relationship and current inference dependencies. F-s0’s observed artifact identity is `c6d554be58a87928af3e9ad378a051f5cea9eb280c3c8f518abded2e03518efd`.

A trainer-source change prevents historical checkpoint resumption but does not itself invalidate immutable q8 readings. Distinguish training-source provenance from inference-source applicability. No blanket source-hash exemption is permitted. Prove the new default path’s loss/gradient equivalence; F-s1 uses that default path. Recipe comparisons remove only seed and the explicitly declared W objective fields. All remaining fields must match.

**Calibration.** Retain `truthful_v1`, full-gold denominators, structural/dependency holds, cost `100*(right−10*(wrong+extras))/requested`, and executed-error risk. Use the same five frozen group folds, features, L2 grid `[.01,.1,1,10]`, selection-OOF AUROC selection, cost-10 OOF threshold argmax, ask-all option and higher-threshold ties. New models receive new fits by that unchanged method. Paired intervals retain 1,000 connected-group resamples, seed `20261105`, minimum ten groups.

## Data flow

1. `freeze` verifies F data and inherited selections, then calculates weights through `Layout.class_targets` (`finetune_roles.py:73–89`).
2. The runner validates prerequisites and objective identity; `run` loads rows and constructs metadata (`finetune_modernbert_batched.py:426–459`).
3. `request_loss` applies the optional class term during ordinary updates and preflight (`:370–390,515–550`); existing checkpoint/stop behavior remains.
4. After full completion, `fit` measures fixed training targets; `arm_export.py:116–139` binds final weights and data to the export.
5. The new adapter calls `evaluateArm` (`modernbert_next_measure.mjs:679–730`); unchanged collection/calibration/scoring produces actual-model records.
6. Verdict and root-cause analysis consume sealed bundles and execution receipts; only a passing recomputed stage enables confirmation.

## Reused patterns

- Follows `finetune_modernbert_batched.py:298–312` — optional settings and hashed metadata.
- Follows `test_batched_trainer.py:133–160` — exact interrupted/resumed equality and changed-identity refusal.
- Follows `modernbert_next_measure.mjs:624–633` — identity-bound output recovery.
- Follows `modernbert_forms_measure.mjs:369–397,481–540` — outer identities, sealed bundles and current applicability checks.
- Follows `modernbert_forms_measure.mjs:579–653` — numerical benefit/form/safety/confirmation calculations; new comparator names must be explicit.
- Follows D’s inspected `src/engine.py:38–89` — actual layout/preparation validation, completed-checkpoint loading, CPU inference and execution-bound outputs. Adapt under T; do not invoke its hardcoded historical identities against changed source.
- Follows `test_output_contract.py:1–20` — perfect-label fixtures establish converter/decoder capability, not learned-model accuracy.

## Acceptance criteria (MUST be measurable)

All commands below are planned. Missing, skipped, cancelled or zero-test evidence cannot pass.

**P1 — Immutable preparation.** `freeze` and `verify` exit zero. Their artifacts show identical F data/layout/tokenizer, unchanged memberships/folds/views and existing support checks, recomputed counts for all 52 heads, corpus-mean weight one within `1e-12`, and zero changes to historical inputs. Unknown populated values fail.

**P2 — Source and harness.** These commands exit zero with nonzero tests/checks:

```text
~/.cache/diagram-vss-modernbert/venv/bin/python -B training/neural/parity/test_batched_trainer.py
python3 -B training/neural/parity/test_modernbert_rare_heads.py
node training/neural/parity/test_modernbert_rare_heads_measure.mjs
```

Tests compare default loss and parameter gradients with the original expression, verify hand-calculated weighted losses/gradients, and prove weighted interrupted/resumed equality.

Reuse unchanged A1–8/B9–14 evidence only with explicit source/input/environment applicability. Retain the F corpus round-trip result on identical data and code: `--messages`, `diagram-reader-v2`, ModernBERT preparation, `--compare-rows --gate 95 1`, with exact-only percentage displayed. Perfect-label fixtures retain 100% exactness on newly claimed representable cases.

**P3 — Honest model/evidence completion.** Each new accepted trajectory has `complete=true`, `full_schedule=true`, `max_updates=0`, epoch eight and update/total 14,640, with matching data/objective/source identities and export weights. Partial runs do not pass.

Replace the old evidence-stamping path. Receipts contain executed argv, cwd, start/end, exit status/signal, input/source hashes before and after, output hashes and check counts. Reused receipts retain original subjects and scope. Do not infer success from PASS text or stamp a caller-supplied model hash onto fixture logs.

Model claims require actual checkpoint/q8 execution. Preserve eager/SDPA tolerances from `test_batched_trainer.py:354–363`; compare Python/Node q8 outputs on identical frozen fit inputs using `atol=rtol=1e-3`, including padding, and production categorical decoding. New W failures stay failures. Historical B’s padding-logit failure remains recorded; its categorical evidence does not become general numerical/confidence equivalence. Export exit two reports float/q8 changes, not parity success.

**R0 — Explicit-positive fit and absence.** Freeze selections before training from D’s F observations, preserving row ordinals and duplicate IDs. The actual float and production Node-q8 summaries must each show:

| Training target population | Required correct |
|---|---:|
| Outline create, including populated literal `none` | ≥85/89 |
| Coloured outline create | ≥71/74 |
| Outline set | ≥93/97 |
| All added r2 description-size targets | ≥34/35 |
| Canonical-word subset of those r2 targets | ≥20/21 |
| Direct size/count targets | 14/14 |
| Existing deterministic absent controls | 1,440/1,440 |

These are necessary diagnostic conditions, never substitutes for R1–R3. Publish all 259 positive observations, action/tag results and per-head counts. Keep the old 24 description-size labels and the single “dashed” contradiction group in training and report them separately; they do not define explicit-text fit success.

Complete W-s0’s registered quality measurement even if R0 misses, then stop confirmation.

**R1 — Seed-0 benefit.** `verdict --stage seed0` contains passing numerical rows for W-s0 versus F-s0: `t1_clean` gated cost gain ≥5, paired `CI_low>0`, nonincreasing executed-error risk with executions in both arms, and clean-create gated cost `CI_low>0`.

Also retain the former F1 benchmark as **W-s0 versus B-s0** with the same numerical bars. This prevents accepting F’s existing risk regression as the new safety standard.

**R2 — Form capability.** W’s ungated right/all-gold shares meet unchanged clean-form bars: outline question/create/set and label removal ≥90%; description size ≥80%; bare move ≥95%. Undo/redo counts ≥90% on the same frozen finite-grammar population, exposure displayed. Retain the independently scoped absent/count perfect-label oracle and actual learned-model count results separately.

**R3 — Safety, labels and case.** Comparator matrix:

| Candidate | Matched objective control | Additional safety anchors |
|---|---|---|
| W-s0 | F-s0 | B-s0, common-protocol C100-s0 |
| W-s1 | F-s1 | B-s0, common-protocol C100-s1 |

Against every listed comparator, Guard G passes separately on full fresh2 test, short3 test and nl_a development: cost difference ≥−5, paired interval upper endpoint ≥0, additional wrong/extras ≤1 per 100 requests. Report clean subsets.

Against matched F and fixed B-s0, label-setting ungated share drops ≤2 points; each supported lowercase population drops ≤2 points and adds ≤1 confident mistake per 100 requests. W’s `t1_clean` risk must not exceed either matched F or B-s0. Across evaluated views, gated empty-label outputs against nonempty-label gold equal zero; raw-argument completeness is required. Report original-case controls and all label errors.

**R4 — Confirmation.** Only a complete seed-0 pass permits cached C100-s1 evaluation, then F-s1 training. F-s1 must have valid completion/contracts and pass G versus C100-s1 before W-s1 starts; its known case limitations are reported rather than disguised as control success. W-s1 meets R0/R2/R3 and has positive `t1_clean` cost difference versus F-s1. The two fixed W−F differences are positive and the seed-averaged paired interval has `CI_low>0`.

**P4 — Report.** Every evaluation has reconciled root-cause artifacts covering scorer wrongs, extras and unread/held requests, with data/labels, representation, cuts, actions, values/roles, preprocessing and calibration distinguished. Final tables report confidently wrong share, right/requested, wrong/extras, asked/unread, risk/coverage, AUROC, exposure and seen/unseen triggers. R and F failures remain unchanged.

## Adversarial probes the implementer MUST run

- **Boundary:** zero positives, zero absents, one positive, all-positive head, balanced counts, one-row/final-short minibatches, literal `none`, text-state index zero, Unicode and 128/512-piece fixtures.
- **Normalization:** an absent-only batch retains its frozen absence weight; one-positive batches retain positive amplification. Splitting a fixed batch preserves the row-count-weighted loss. A batch-normalized implementation must fail a test.
- **Idempotency:** resume an interrupted weighted tiny-model run and compare subsequent losses/tensors exactly. Reject changed objective, source, data or manifest.
- **Orphan/error injection:** wrong head order, unknown value, wrong seed/model/layout, missing shard/sidecar, changed fold or truncated fit output fails.
- **Concurrency:** occupied synthetic GPU/budget/run locks prevent training; duplicate launches cannot consume or overwrite the same trajectory. Never kill the holder.
- **False pass:** PASS followed by FAIL/exit one, zero checks, fixture logs relabeled as learned-model evidence, stale artifacts and handwritten/dir-less prerequisite records all fail.
- **Comparator loophole:** fixtures where W preserves F but remains >2 points below B on lowercase, or exceeds B’s execution risk, must fail seed zero.
- **Denominator:** one right plus nine held requests is 10%; extras affect cost/risk; missing intervals, zero executions or unsupported required populations cannot pass.

## Review, verification and gates

The parent saves this text verbatim and obtains independent **plan-reviewer, Sol XHigh** review. No further human approval is needed for the already authorized implementation and offline experiment.

Freeze HEAD `0ab687cc142e884ed16332925c6d7cd558e1b8fb`, scoped binary dirty diff and explicitly included untracked files with hashes. Preserve unrelated/Qwen edits. Use one writer per source scope. Review the trainer/objective and runner/evidence/verdict slices independently with a code-reviewer. A test-runner executes assigned suites; an implementation-verifier independently checks counts/formula, actual model identities, absence/fit results, threshold/count reconciliation and decisive comparisons on the exact candidate.

Budget: **three new full trajectories maximum: W-s0, F-s1, W-s1**. Each includes the existing bounded overfit gate: 200 selected rows, batch 16, at most 400 updates/300 seconds and existing 99% per-head conditions. A completed gate is not repeated for identical recovery. No replacement seed or fresh restart after a quality miss.

Keep the existing shared GPU UUID lock, work locks, 5-GiB allocator ceiling, 90°C/slowdown/nonfinite guards and host-memory stops. Record finite invocation deadlines. Resource interruption permits only identity-identical recovery; incomplete checks remain pending. CPU-heavy work is serial with two computation threads, offline/local-only loading and the existing diagnostic memory safeguards.

Source approval unlocks these authorized offline checks. A measured miss stops the experiment after evidence/root causes/report, without tuning or rescue branches. A demonstrated tool defect requires preserved failing evidence, a regression test, scoped review and fresh affected-output paths.

Prior C17/C20/C21 map to R1/R3 with the explicit comparator matrix; C18/C19 remain R2; C22 becomes W/F confirmation; D24/D25 and exact-q8 measurement apply now. C16 remains failed. C23 and browser/product/resource/Settings portions of D26–30 remain pending release requirements; D31 applies before a future relevant commit. No publication or commit is authorized.

## Open questions / risks

- No material user decision remains unresolved.
- Weighting may improve fit while increasing false positives or damaging shared representations; the fixed safety gates can legitimately stop this experiment.
- Rare appearance frequency is unchanged. A negative result does not distinguish insufficient exposure from other optimization limitations.
- Old contextual labels and contradictions remain in the objective and may limit attainable fit outside the explicit subsets.
- Fixed B-s0 is a preservation anchor, not a seed-matched B control. Confirmation establishes two-seed W/F evidence, not a two-seed W/B claim.
- Full cached applicability and runtime outcomes remain unverified. The architect inspected source and JSON and performed read-only arithmetic; no tests, inference, training, GPU work, downloads or writes were performed.

## Implementation order (build sequence)

1. Save/review the plan; freeze the starting candidate, historical inputs and objective manifest. Checkpoint: `freeze`/`verify` artifacts and independently reproduced counts/weights.
2. Implement the opt-in loss and provenance. Checkpoint: default equivalence, weighted arithmetic and exact recovery tests pass; independent source review closes supported findings.
3. Implement the registered runner, evidence/applicability and verdict adapter. Checkpoint: nonzero suites and adversarial prerequisite/comparator/false-pass probes pass; independent review authorizes offline execution.
4. Train W-s0, measure fixed fit, export, evaluate, reconcile root causes and independently verify the verdict. Checkpoint: complete seed-0 result; any miss ends confirmation.
5. Only after success, evaluate cached C100-s1, train/check F-s1, then train/evaluate W-s1. Checkpoint: independently verified confirmation verdict or documented stop.
6. Finish report, run-log append and checkpoint with actual evidence, resource quiescence and remaining release gates. Checkpoint: completed offline experiment report, including a negative result when applicable.
