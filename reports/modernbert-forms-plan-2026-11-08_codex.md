# SPEC: ModernBERT form coverage from B and nonreserved r2

## Intent (1 paragraph)

Run a new, bounded experiment testing whether adding the existing nonreserved `synth_short_r2` whole messages to corrected control B improves missing diagram forms while preserving execution safety. The intervention is **F = B + nonreserved r2**, excluding the eight restored folders. It is a new hypothesis informed by the stopped campaign, not continuation of its R→S sequence or a claim that restoration fixed case handling. Keep the existing encoder, output contract, annotation overlays, calibration procedure, evaluation populations and numerical form/safety bars. Date: 2026-11-08. This document specifies proposed implementation and offline experiments; the architect inspected files and cached JSON but ran no tests, inference or training.

## Out of scope

- Reviving R, running the old S arm, changing the old C16 verdict, or rewriting prior plans, amendments, checkpoints or evidence.
- Case augmentation, capitalization repair, new data writing, data reweighting, recipe searches, new confidence features, per-form thresholds or hand-written language mappings.
- Reader, trainer, tokenizer, architecture, spelling, Rules, VSS-BERT or Qwen changes.
- Publication, deployment, commits, pushes, model-loader changes, Settings changes or claims of browser/release readiness.
- Downloads, installation, deleting prior campaign artifacts, or restarting unrelated sessions.

## Files to create

All repository paths are relative to `/home/skutner/browserLLM/diagram-vss-demo`.

- `training/neural/parity/modernbert_forms_protocol.json` — declarative campaign identity, inherited evidence references, exact F membership rule, fixed comparisons and budget.
- `training/neural/parity/modernbert_forms_data.py` — freeze, build and verify the new campaign while consuming the old split read-only.
- `training/neural/parity/modernbert_forms_measure.mjs` — diagnostic, evaluation and verdict adapter with new campaign identities and criterion names.
- `training/neural/parity/test_modernbert_forms_data.py` and `test_modernbert_forms_measure.mjs` — focused membership, identity, denominator, comparison and false-pass tests.
- `reports/modernbert-forms-implementation-checkpoint.md` — current ownership, exact candidate, commands, evidence reuse, run budget and stop state.
- `reports/evidence/modernbert-forms/` — compact manifests, diagnostics, reviews, comparisons, root causes and final verdict.
- `$TASK/bin/train_arm.sh` — task-owned runner derived from the existing runner, restricted to the three declared trajectories and their prerequisites.

Here, `$TASK` means `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08`; it was absent during planning. Assert absence before creation. Large data, models and records belong there. The uncommitted plan/review filenames use `_codex`; source, configuration and evidence files do not.

## Files to modify

- `training/neural/MODERNBERT_RUNLOG.md:842–850` — append the separately named forms campaign, observed results and disposition without altering the stopped campaign entry.

The old data, measurement and runtime tools remain unchanged. Their reusable functions already expose the necessary lower-level operations. Do not broadly generalize B/R/S handling to implement this experiment.

## Interfaces / contracts

**Evidence and identity.** Define `$OLD` as `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08`, read-only. Starting HEAD is `0ab687cc142e884ed16332925c6d7cd558e1b8fb`, with substantial existing dirty and untracked work. Before editing, capture the scoped binary diff and explicit included-untracked manifest with hashes; exclude unrelated Qwen ownership without deleting or reverting it.

The following identities were observed by read-only hashing:

| Input | SHA-256 |
|---|---|
| Old plan | `0ef29893509256a11f2859fb4b2fbfab45ca2ae448db26795315ceeab26c587b` |
| Old plan review | `c07121d2ccd10ddb84c735955957c755de86a63d47a0140d90d7a7b138c8b6c1` |
| Grouping amendment | `ff9a2eabf63e108dec65c0adc8e3499045568d203edbe6eb24a249eb1abd778b` |
| Amendment review | `b4fef95aa33948f65e28a268b72221340254930f3b363a4b6a25dc7a9e1aef6f` |
| `$OLD/protocol-v2/protocol.json` | `3999991890f1a92b811fbe0cde86ccdf35ca38e71606b45d0ec14ea5dc872e78` |
| `$OLD/views/manifest.json` | `df4abeeeec0e1948e3b8220d6c670d259cebe938e4765921d0f161ff0506cf5a` |

Freeze full hashes for groups, memberships, overlays, addendum, sources, model artifacts, runtime dependencies and imported bundles in the new manifest. Preserve every old file/hash; a new campaign reference never rewrites an old receipt.

**Observed basis for the choice.** The saved R verdict fails C16: other-drawing lowercase gain `2.0606` points against ten, nl_a cost difference `−10.2041` against `−5`, and additional wrong/extras `1.27551/100` against one. The familiar-drawing lowercase gain and short3 cost improvement remain positive historical findings, not grounds to disregard the failure. No old S or confirmation run occurred.

B’s saved clean-form ungated counts are outline question `0/66`, outline create `3/80`, outline set `26/80`, description size `3/64`, label removal `78/78`, and bare move `143/148`. Its gates execute label removal `77` right/zero wrong and bare move `99` right/zero wrong. These observed counts motivate adding missing-form data while preserving already working behavior.

**Frozen data.** F contains exactly the union of the old `membership/B.ids` and `membership/r2_nonreserved.ids`: expected `26,913 + 1,417 = 28,330` distinct whole messages. All `580` reserved r2 messages remain reserved. Keep the old connected groups, folds, calibration membership, conservative clean populations and case views unchanged, including exclusions attributable to restored folders. Do not recompute a more favorable split merely because F’s training universe is smaller.

The existing builder is explicitly tied to the old experiment:

```python
# training/neural/parity/modernbert_next_data.py:479–481
b = [i for i, m in enumerate(msgs) if "train_c100" in m["roles"]]
r = b + [i for i, m in enumerate(msgs) if "train_restored" in m["roles"]]
r2 = [i for i, m in enumerate(msgs) if "r2" in m["roles"]]
```

The new builder must therefore declare F directly. Its deterministic source order is `C100_OLD + C100_FIRST + [R2_DIR] + C100_NL + C100_SAMPLE`, using the existing constants and file/line ordering. Apply the frozen overlays with their existing preconditions. Preserve every selected message’s text and annotations; build the layout, number associations and trigger inventory from F training messages only. Never reuse S’s layout or borrow a value from reserved labels. Trainer heldout files remain empty.

Keep intact-group support requirements: at least 100 request-bearing calibration groups, ten per fold, the three required source families, `t1_clean` at least 500 requests/100 groups, each deciding form at least 20 requests/ten groups, and clean-create at least ten groups. Group size alone is diagnostic; inability to satisfy reservation, separation or required support stops before training.

Required r2 cells retain presence checks and thin-coverage reporting. In particular, `desc:size huge` has nine nonreserved requests/nine groups. This is thin training coverage, not a reason to reduce the description-size bar or create an undeclared data round.

**Proposed command interfaces.**

- `modernbert_forms_data.py freeze --protocol FILE --out DIR`: validate immutable parent references and campaign rules; write the new frozen manifest, F membership and audit.
- `modernbert_forms_data.py build --protocol FILE --arm F --out DIR`: produce whole-message input, training rows, layout, coverage and a trainer-compatible manifest.
- `modernbert_forms_data.py verify --protocol FILE --data DIR`: independently check source identity, exact membership, text preservation, training-only vocabulary, counts and separation.
- `modernbert_forms_measure.mjs diagnose --protocol FILE --out DIR`: read existing records and produce the diagnostics below.
- `modernbert_forms_measure.mjs evaluate --protocol FILE --arm B|F|C100 --seed 0|1 --model DIR --train-data DIR --out DIR`: validate the registered arm/seed, invoke unchanged evaluation primitives and write a campaign-bound bundle.
- `modernbert_forms_measure.mjs verdict --protocol FILE --stage seed0|control1|confirmation --bundle NAME=DIR ... --out DIR`: validate required bundles and emit new criterion rows plus a stage decision.

Reject unknown identities, missing or changed artifacts, duplicate membership, unsupported required populations and nonfinite required metrics. Commands exit nonzero on failure; verdict commands also exit nonzero unless that stage passes. Writes stay in fresh task-owned paths. Resume requires identical identities. No command writes to `$OLD`.

The new evaluation adapter may call exported `evaluateArm` at `modernbert_next_measure.mjs:679` with the **unchanged parent evaluation protocol/addendum/views**, because those define the common measurement basis. Bind the new campaign separately in an outer identity containing campaign/plan hash, arm, seed, membership, model, training data and tool/runtime hashes. Do not relabel F as S or B as R to satisfy the old CLI/verdict.

**Calibration and measurement.** Retain `truthful_v1`, full-gold denominators, structural/dependency holds, cost `100*(right−10*(wrong+extras))/requested`, and risk `(wrong+extras)/(right+wrong+extras)`. Retain five frozen group folds, existing features, L2 grid `[.01,.1,1,10]`, fold-local fitting, selection-OOF AUROC selection, and OOF cost-10 threshold selection with ask-all and higher-threshold ties. No diagnostic changes these rules.

New collections use `THREADS=2`. Paired intervals retain 1,000 connected-group resamples, seed `20261105`, and minimum ten groups. Report ungated eligibility, gated outcomes, holds/unread, risk/coverage, confidence discrimination, exposure and seen/unseen triggers separately.

**Cheap diagnostics before F training.** Use cached B/R/C100 records to compare original case and lowercase on the same frozen affected request indices, retaining `origin_id`, group and replacement alignment. Report case gaps and error transitions. For nl_a, join wrong B/R proposals by message, span and raw formalization, then show each arm’s own confidence and gate. The parent reported that five of R’s nine executed mistakes were identical wrong readings B held; independently check that table. This supports investigating confidence behavior, not a conclusion that the numeric threshold alone caused the regression. Diagnostics have no acceptance threshold and authorize no case-training or calibration branch.

## Data flow

1. `freeze` consumes the old protocol through the validation patterns in `modernbert_next_data.py:1488–1506`, preserves parent membership and emits F’s exact union.
2. `build` uses the frozen overlays and whole-message preparation patterns at `modernbert_next_data.py:1515–1582`, then invokes unchanged `make_roles.py` with explicit messages and `diagram-reader-v2`.
3. The task runner verifies data, runs the existing bounded overfit check and trainer, checks completion, and invokes `arm_export.py:247–258` on the declared trajectory.
4. The forms adapter calls `evaluateArm`; collection, grouped calibration and truthful scoring remain the path at `modernbert_next_measure.mjs:679–730`.
5. New verdicts compare F with matched B and common-protocol C100; `root_causes.mjs:478–506` analyzes each evaluation before advancement.

## Reused patterns

- `modernbert_next_data.py:1690–1764,1768–1859` — manifests beside training data, exact row/text checks and source verification.
- `modernbert_next_measure.mjs:624–633` — refuse reuse of an output directory with changed identity.
- `calibrate_arm.mjs:103–144` — unchanged grouped fitting and held-request accounting.
- `compare_arms.mjs:15–36,75–88` — deterministic paired group intervals.
- `test_modernbert_next_measure.mjs:557–580,598–643` — raw empty-label errors, whole-message extras and incompatible-bundle refusal.

## Acceptance criteria (MUST be measurable)

All commands below are planned. An unavailable, pending, skipped or zero-test result is not a pass.

**P1 — Immutable preparation.** The new freeze/verify commands exit zero and publish exact hashes, expected F membership, zero restored-only members, zero reserved/calibration leakage by ID/group/normalized complete span, byte-identical selected texts and all support checks. Preserve the earlier overlap finding and grouping amendment rather than recomputing them into a different population.

**P2 — Working harness and contracts.** These commands exit zero with nonzero checks:

```text
python3 -B training/neural/parity/test_modernbert_forms_data.py
node training/neural/parity/test_modernbert_forms_measure.mjs
```

Retain applicable prior A1–8/B9–14 evidence only when candidate, command, inputs and environment match. Run affected checks when they do not. New F layout must pass the actual corpus round trip using `--messages`, `--output-contract diagram-reader-v2 --prep modernbert --compare-rows` and `--gate 95 1`. Publish exact-only results; newly claimed representable fixtures require 100% exact output. Context/abstention credit cannot prove exact capability. Include text states, unsupported references/dependencies, outline/description/count values, Unicode and tokenizer boundaries.

**P3 — Safe control.** Reuse B-s0’s C15 only after identity applicability checks. B-s1 must independently pass the same output-contract conditions and Guard G against common-protocol C100-s1 before F-s1 starts. C100-s1’s cached completed run/export exists; validate it and collect/calibrate under the inherited protocol without retraining it.

**Guard G**, separately on full canonical fresh2 test, short3 test and nl_a development: candidate-minus-comparator gated cost at least `−5`; paired interval upper endpoint at least zero; additional wrong-plus-extras per 100 requests at most `1`. Report clean subsets alongside. This remains an operational guard, not proof of statistical noninferiority.

**F1 — Primary seed-0 benefit.** F-s0 versus B-s0 has `t1_clean` gated cost gain at least five points, paired `CI_low > 0`, and no increase in confidently wrong share, with executions in both arms. Clean-create paired gated cost also has `CI_low > 0`.

**F2 — Fixed form capability.**

| Frozen clean population | Minimum ungated right/all-gold share |
|---|---:|
| Outline question | 90% |
| Outline create | 90% |
| Outline set | 90% |
| Label removal | 90% |
| Description size | 80% |
| Bare move | 95% |

Undo/redo counts remain at least 90% on the frozen finite-grammar regression population, with exposure displayed and independent absent/count oracle evidence.

**F3 — Safety and retained capability.** F passes G against both matched B and corresponding common-protocol C100. Versus B, label-setting ungated right share falls at most two points; gated empty-label outputs against nonempty-label gold equal zero across evaluated views. Report all label errors. Each supported lowercase population loses at most two ungated right-share points and adds at most one confident mistake per 100 requests.

**F4 — Fixed confirmation.** Only after all seed-0 criteria pass, run B-s1 and then F-s1. F−B `t1_clean` gated cost must be positive in each seed, and the paired interval after averaging the two fixed seeds inside each resampled group must have `CI_low > 0`. Both F seeds meet F2/F3 and contract requirements. This preserves the former confirmation cost rule: seed 0 needs the five-point improvement; seed 1 needs positive improvement. The interval describes group variation conditional on two seeds.

**P4 — Honest completion and export.** Every accepted training run has matching `complete=true`, `full_schedule=true`, seed, recipe, data and update identities. Preserve existing float/eager/SDPA tolerances and Python-ORT/Node checks. Export exit 2 records float/quantized decode differences, not parity success. Quality decisions use the exact finalized quantized artifact; later receipts stay outside its directory.

**Gate correspondence.** Prior C17/C20/C21 are newly preregistered as F-versus-B comparisons with their numerical bars retained; C18/C19 remain unchanged; C22 becomes matched B/F confirmation. Old C16 remains **failed and not claimed**: its restoration-specific `+10/+20` case-improvement claims are not this experiment’s hypothesis. Retain its lowercase mistake guard through F3. C23 and browser/product/resource/Settings portions of D26–30 remain unperformed release requirements. D24–25 and quantized-artifact measurement apply now. D31 remains required before a future relevant commit; no commit is authorized here.

## Adversarial probes the implementer MUST run

- **Boundary:** one correct proposal plus nine held/unread gold requests scores 10%; zero executions, null risk, missing intervals or unsupported forms cannot pass.
- **Membership/error injection:** insert a reserved r2 message or restored-only message, alter an overlay/source hash, or move a group between folds; freeze/verify fails before training.
- **Orphan:** unknown message/request index, missing model shard, missing sidecar or wrong seed/control identity is rejected.
- **Idempotency/recovery:** identical evaluation resume preserves completed records; changed campaign/model/data/code refuses the old path. Existing exports are never overwritten.
- **False-pass:** an unrelated extra in a whole-message population affects cost/risk; one executed empty label against nonempty gold fails label safety; missing confirmation bundles cannot produce confirmation success.
- **Runner ownership:** synthetic prerequisite/budget failures prevent spawning a trainer; an occupied shared GPU lock is respected without killing its holder.

## Review, verification and gates

Have the independently requested **Astra Max** reviewer assess this exact document. Save the architect text verbatim; handle material corrections as an explicit reviewed delta.

After approval, start a **fresh Claude Code coordinator with Opus 5.5 Medium**, as explicitly requested. Verify actual model/effort, effective permission mode and Remote Control URL/state. Request the standing bypass preference through the supported interface; if the platform rejects it, record the rejection/effective mode without bypassing it through another route. Use Claude usage events only; no scheduled or independent usage polling. The old stopped session is not resumed.

Assign one writer to the new adapters/tests/runner. Repository-appropriate pipeline, data and experiment work uses Sonnet Medium; independent consequential review uses Opus High. Review the data/runner and measurement/verdict slices independently. An implementation verifier probes reservation, mismatched identities and false-pass paths; a test runner executes assigned checks. Review packets bind HEAD, scoped dirty diff, included untracked files and hashes. Reuse valid prior evidence without duplicating broad reviews.

The new budget is at most **three full arm trajectories: F-s0, B-s1, F-s1**, each with its existing bounded overfit gate. Old B/R remain the stopped campaign’s two runs; its unused allowance is not transferred or revived. Resume only the identical interrupted trajectory. No fresh-seed replacement, extra arm or restart to improve a result.

Use the unchanged shared GPU UUID lock, trainer resource/thermal protections and per-run locks. Record a finite operational deadline before each invocation; resource interruption permits identical recovery, not recipe changes or acceptance of partial training. Never kill unrelated/Qwen work.

A measured miss stops this campaign after completing its report/root causes. A demonstrated tool defect requires preserved failing evidence, an adversarial regression test, scoped review and a fresh affected-output path. It does not justify changing the hypothesis or bars. Source approval unlocks the authorized offline checks; successful offline results do not unlock publication.

## Open questions / risks

- No unresolved user decision is required to begin implementation after the requested plan review.
- Nine huge-description training requests may be insufficient; the fixed experiment may fail.
- F changes training-row count and therefore update count/schedule length under eight epochs. Report these consequences; do not compensate by tuning.
- Known synthetic populations support the stated comparison, not an untouched-holdout or broad language-generalization claim.
- Current B evaluation dependency hashes matched during planning. Full artifact/runtime applicability and C100-s1 evaluation remain implementation checks.
- Prior contract reviews/tests are recorded evidence, not newly executed verification by this architect. Browser, product and resource readiness remain unverified.

## Implementation order (build sequence)

1. Freeze the dirty starting candidate and parent identities; run cached-record diagnostics. Checkpoint: immutable manifests and aligned diagnostic tables.
2. Implement F data preparation and focused tests; build/verify F and run its layout round trip. Checkpoint: reviewed preparation with all support/contract gates satisfied.
3. Implement campaign-bound evaluation/verdict and the restricted runner. Checkpoint: focused tests/adversarial probes and independent review; old R failure remains unchanged.
4. Train/export/evaluate F-s0, generate reconciled root causes and seed-0 verdict. Checkpoint: all deciding criteria pass or the campaign stops.
5. If eligible, evaluate cached C100-s1, train/evaluate B-s1 and check its control gate, then train/evaluate F-s1. Checkpoint: fixed confirmation verdict.
6. Complete exact-candidate review and evidence report. Checkpoint: either a documented stopped experiment or confirmed offline F-s0 candidate with release gates explicitly pending; no automatic further experiment or publication.
