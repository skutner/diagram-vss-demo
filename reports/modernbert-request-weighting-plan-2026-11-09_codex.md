# Preregistration: ModernBERT whole-request class weighting

Date: 2026-11-09. Status: **plan and independent review only; implementation and execution are not authorized.** No code, tests, model loading, training, export, inference, calibration or evaluation may start from a passing plan review. All such work below is prospective and requires the owner's later instruction. No commit, push, publication or deployment.

## Question and fixed intervention

Test one new objective, **J-s0**: give every class target in a training request the same frozen rarity-derived multiplier. The hypothesis is that emphasizing the companion targets together can improve joint fill/outline learning without losing execution safety. Only the class-loss term changes. “Whole-request” here means all class heads of the request; action, token-tag and cut losses retain their existing definitions and coefficients.

The completed W experiment remains failed. Its selected-head statistic was not complete-command fit: among 89 outline-create observations, outline was correct 89/89, but all 52 classes were correct only 73/89 in float and 72/89 in production q8. On the 57 distinct requests specifying fill as well as outline, joint class fit was 41/57 and 40/57. Every failure copied the outline color into fill; action/tags were correct. On the separate 80-request clean evaluation population, F had fill/outline/joint counts 76/16/15, while W had 27/68/24. These saved-output observations motivate the hypothesis; they do not prove gradient competition is the sole cause.

J is a new experiment, not a continuation or rescue of R, F or W. Their results, artifacts, budgets and closed gates remain unchanged. **No C100-s1 evaluation, F-s1, W-s1, J-s1 or other confirmation is part of this plan, even if J-s0 passes.**

## Frozen inputs and identity

Repository: `/home/skutner/browserLLM/diagram-vss-demo`.

- Observed HEAD: `0ab687cc142e884ed16332925c6d7cd558e1b8fb`, intentionally dirty/untracked. Preserve all unrelated and Qwen work; no reset, checkout, stash or commit.
- W source candidate aggregate: `52a35fa7250204a1162ddd5d5ce9e3a22499637261881ec22a342b24c26c1b59`; its 15 files and 58 frozen dependencies remain unchanged during planning.
- Planning-start tracked binary-diff SHA-256: `c2e18be1dcd3f3bce422689e097a225ee038687991504a34f55aa4d55909f17a`. This is distinct from W's scoped candidate identity.
- F data directory: `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/data-v2/F`, used directly: **28,330 messages, 58,552 request rows, 52 class heads**.
- Prior W task root, here **TW**: `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09`.
- Proposed new root, here **TJ**: `/home/skutner/.cache/diagram-vss-modernbert/request-weighting-2026-11-09`, observed absent during planning. Do not create it now. A later authorized coordinator must assert absence or exact task ownership before any write.

| Frozen input | SHA-256 |
|---|---|
| F manifest | `d6250c7082e3eccd3788ed55c894f131c4d557f9fa60b327f635dc500e21d7c3` |
| F `train.jsonl` | `bfdb92373d8eecdc7902d23e309c68d29fc610ed63334ddad7f18213fb90c7ce` |
| F `reader.json` | `5abf1240d90852f26239ff8c7077bfcdeef44a6f6612112db8973fc213756046` |
| Forms frozen protocol | `61524cc13da0f20a0212def83b7f0855e6bad557fdfd99b3ceb3e36b857d2f39` |
| `TW/frozen/protocol.json` | `b15da300cb1817ad67e446c2de80aca54ba27cae523f4ba1bab0c1bd24e25738` |
| `TW/frozen/selections.json` | `7adde40a06ac6d630a291bf7f9d66fd7662c652f7cbe3b559e0e22eb8373c723` |
| Diagnostic label-membership audit | `8163b72b93e37bb93fe0746c01f89469ab01b50209f6def4184465414f32eb0b` |
| W float fit `rows.jsonl` | `3af4e39e320b27a1321aa1bf2c5b34719d368e849740730ddaecdc6f72d15f37` |
| W q8 fit `rows.jsonl` | `a677a1b48daac3c803232baeb821a0dff39dbad3f34d2ac8eb3eb44659bb846f` |
| W quality score | `fbff1a23eceb256df796bb1715da9503664bd324fba16dea1c6505079a1e7ab2` |
| W seed-zero verdict | `eb0b81633700a17eb04eba89ed00e1f281bf80ffeca232b404ec07fbe3a18f5c` |

Keep data bytes/order/duplicates, layout, memberships, grouped folds, views, overlays, exposure definitions, model/tokenizer assets and inference dependencies unchanged. No annotation repairs, augmentation, swapped-color examples, new diagnostic populations, resampling or extra exposure. The old 24 contextual size labels and the “dashed” contradiction remain in training and reporting.

Before later implementation, capture a J starting manifest with HEAD, scoped binary dirty diff, current shared-file bytes/hashes and explicitly included untracked files. Freeze J's final source candidate and plan/review/protocol hashes separately before execution. A changed implementation is never identified solely by HEAD or by W's old candidate hash.

## Exact objective: `request-max-positive-sqrt-v1`

Use targets from the real `Layout.class_targets` in `training/neural/finetune_roles.py`. Index zero is absence; populated literal values such as `outline="none"` and `arrow="none"` are searched from index one and count as positive. Unknown populated values must fail validation rather than silently becoming absence.

For each head h over **all N = 58,552 training rows**, let

\[
P_h=\sum_{i=1}^{N}\mathbf1[y_{ih}>0],\qquad A_h=N-P_h.
\]

Define the head's positive rarity coefficient once:

\[
a_h=\begin{cases}
\dfrac{N}{\sqrt{P_h}(\sqrt{P_h}+\sqrt{A_h})},&0<P_h<N,\\
1,&P_h=0\text{ or }P_h=N.
\end{cases}
\]

For each training row i, define

\[
r_i=\max\left(\{1\}\cup\{a_h:y_{ih}>0\}\right),\qquad
\mu=\frac{1}{N}\sum_{i=1}^{N}r_i,\qquad q_i=\frac{r_i}{\mu}.
\]

For a minibatch of B requests and H = 52 heads, replace **only** the class term with

\[
L_{\rm class}=\frac1B\sum_{i=1}^{B}q_i\left[\frac1H\sum_{h=1}^{H}\operatorname{CE}(z_{ih},y_{ih})\right].
\]

The request loss remains `existing action loss + J class loss + existing word-tag loss`; the separate cut loss is unchanged. Every head in a row, including absent targets, receives the same q. The rule applies to all heads without outline/color exceptions. The max is over positive targets, with raw floor one; multiple rare heads do not add or multiply their weights. An all-absent row receives q = 1/μ.

There is **no** batch weight-sum normalization, per-head normalization after computing q, clipping, smoothing, coefficient search, adaptive update, W/J weight stacking or altered sampling. μ and a are never recomputed on an overfit or minibatch subset. J changes the distribution and scale of class supervision relative to both F and W; it does not isolate every individual effect of W's weighting.

Use deterministic binary64 arithmetic with `math.fsum` for the corpus sum. The objective manifest must bind the formula, ordered head/value layout, integer counts, all a values, μ, arithmetic/normalization definitions, data hashes and ordered row-weight digest. A row-weight artifact must retain ordinal, row identity, raw/normalized weight and maximizing heads. IDs are not unique keys. Minibatch weights are derived from actual targets and these frozen coefficients; conversion to the model loss dtype is recorded and tested.

Reject empty corpus/layout, duplicate heads, malformed counts, changed order, unknown populated values, nonfinite weights and any canonical manifest mismatch before model construction or optimization. Zero-positive and all-positive heads are valid and use coefficient one; they are not empty-corpus errors.

Read-only planning arithmetic, independently checkable before future training:

| Quantity | Fixed-data reference |
|---|---:|
| Sum of raw weights | 219424.52847050782 |
| μ | 3.747515515618729 |
| Mean q | 1.0 |
| Minimum / maximum q | 0.26684345824113187 / 64.3043022406042 |
| Nearest-rank median / p90 | 0.6041502951051457 / 1.6813559579264168 |
| Nearest-rank p95 / p99 | 2.665262057691674 / 5.525854059149545 |
| q for each selected two-color request | 4.4886137801464265 |
| Rows with no populated class | 2,900 |

Nearest-rank percentile p uses sorted index `ceil(p*N)-1`. Require normalized mean within 1e-12 of one, other table statistics within 1e-12 absolute, and raw sum within 1e-8. Then require exact canonical manifest agreement with its deterministic recomputation. These are arithmetic checks, not learned-model results.

The maximum-weight row is ordinal 20770, ID `p2-22-007`, “Lower bench nearer the pear”, driven by `desc2:position` coefficient 240.98137036770044. The concentration at 64.30× and downweighting of ordinary/all-absent rows are explicit risks accepted for this proposed formula. **Do not modify the formula in response to model outcomes.**

## Fixed recipe and controls

J-s0 starts from base revision `8949b909ec900327062f0ebf497f51aef5e6f0c8`, seed 0. Keep eight epochs, **14,640 updates**, `max_updates=0`, LR/head LR 6e-5, request/cut batch sizes 32/8, weight decay .01, warm-up .06, gradient clip 1, FP32 weights/BF16 autocast, SDPA and 128/512 request/message caps. No extra drawing pass or gradient checkpointing. Keep shuffle/RNG streams and once-per-epoch row exposure unchanged, including the final 24-row request batch.

| Cached model | Role |
|---|---|
| F-s0 | Matched ordinary-CE objective control |
| W-s0 | Explanatory per-head-weighting comparator; never a successful safety baseline |
| B-s0 | Fixed preservation/safety anchor |
| C100-s0 under the common protocol | Additional Guard G safety anchor |

Reuse sealed artifacts and completed checks only after explicit source/input/environment applicability. Do not rerun historical inference or refit historical confidence. New J model claims always require new J model evidence.

A later trainer edit makes W's historical whole-source validator inappropriate if it insists the current trainer equal the old trainer. J's applicability adapter must check original training completion/objective/source provenance against preserved historical receipts, while requiring exact current inference/preparation/decoding/calibration/scoring dependencies and artifact identities. No blanket source-hash exemption, rewritten historical receipt, renamed model subject or relabeling W evidence as J is permitted. If applicability cannot be demonstrated, the affected comparison is unavailable and cannot pass; it does not authorize changing cached controls.

Retain `truthful_v1`, all-gold denominators, structural/dependency holds, risk `(wrong+extras)/executed`, and cost `100*(right-10*(wrong+extras))/requested`. J gets its own confidence fit using the unchanged five frozen group folds, features, L2 grid [.01,.1,1,10], selection-OOF AUROC selection, cost-10 OOF threshold argmax, ask-all option and higher-threshold ties. Keep 1,000 connected-group paired resamples, seed 20261105 and minimum ten groups. Risk at zero execution and missing intervals remain unavailable, never zero/pass.

## Exact joint-fit population and gates

Use the **existing 89 `outline_create` observation indexes** in the frozen selection file. Split solely by gold `color` target index: `>0` gives 57 observations/57 distinct requests; `==0` gives 32 observations/28 distinct requests. Preserve all duplicates and observation/ordinal order; the total is 89 observations/85 distinct requests. Freeze full target vectors, action, word tags, request/observation indexes and text hashes before training.

The 57 have distinct texts and different specified fill/outline value strings; verify those as observed properties, not extra selection filters. They cover 55 ordered color pairs in a single simple construction ordering. No new examples or population substitutions are allowed.

**J0 is representation-level joint fit**, not an assertion that perfect class vectors alone establish end-to-end formalization. Require, separately in actual float and production Node q8:

| Population | Required joint result |
|---|---|
| 57 requests specifying fill and outline | **57/57** with all 52 class targets, action and complete word-tag sequence correct together |
| 32 outline-create observations without specified fill | **32/32** with all 52 class targets, action and complete word-tag sequence correct together |

A correct outline with wrong fill, a spurious otherwise-absent class, wrong action or wrong tag fails J0. Publish complete class vectors and all component counts; do not replace the predicate with an average over heads. The 32-observation action/tag requirement is explicit, not merely descriptive. No requirement of perfect complete commands on all 1,699 observations is introduced.

**Inherited R0 also remains mandatory in each runtime:** outline create ≥85/89; colored-outline create ≥71/74; outline set ≥93/97; added r2 description size ≥34/35; canonical-word r2 subset ≥20/21; direct size/count 14/14; deterministic absent controls **1,440/1,440**. Publish all 259 positive and 1,440 absent observations, action/tags and per-head counts. The old 24 contextual positives and “dashed” contradiction remain unchanged and separately reported; neither permits weakening a gate.

Strict Python-ORT/production Node q8 parity must meet registered atol=rtol=0.001 on every fit batch, including padding, and match action/class/tag/word decoding. Export exit 2 remains a separate float/q8 diagnostic and is not a parity pass. Keep historical B's padding-logit failure recorded.

## Quality acceptance and interpretation

The sole seed-zero verdict reports J0, inherited R0, R1–R3, provenance and evidence integrity separately. **Overall acceptance requires every required gate to pass.** A diagnostic improvement may be reported alongside an overall failure, but cannot unlock another trajectory.

- **R1:** Separate J−F and J−B rows require clean-t1 gated cost gain ≥5, paired CI lower endpoint >0, nonincreasing executed-error risk with executions in both arms, and clean-create gated-cost CI lower endpoint >0. The clean-create subset has 29 requests and is distinct from the 80 outline-create requests.
- **R2:** Ungated correct/all-gold: outline question, outline create, outline set and label removal ≥90%; description size ≥80%; bare move ≥95%; undo/redo count ≥90% on the unchanged finite-grammar population. Outline creation therefore requires **at least 72/80 complete-command correct**. Report fill/outline/joint counts on this exact shared population beside F 76/16/15 and W 27/68/24; these diagnostics never replace complete-command scoring.
- **R3:** Guard G against **each of F-s0, B-s0 and C100-s0**, separately on full fresh2 test, short3 test and nl_a development: cost difference ≥−5, paired CI upper endpoint ≥0 and additional wrong/extras ≤1 per 100 requests. Report clean subsets too. Against both F and B, clean label-setting share may fall ≤2 points; `lowercase_other_affected` and `short3_lowercase` may each fall ≤2 points and add ≤1 confident mistake per 100 requests. J clean-t1 risk must not exceed either F or B. Across views, gated empty-label-on-nonempty-gold and executed requests without raw arguments must both be zero. Report data-attested names, original-case controls and all label errors.

A measured J0/R0 miss still requires the second fit runtime and the single registered quality evaluation, root causes, verdict and report. It does not authorize a retry. Incomplete training, missing receipts, identity changes or resource/tool errors are not measured accuracy failures and cannot pass; preserve and report the specific blocker.

Quality reporting must include confident-error share, right/requested, cost, wrong/extras, asked/held/unread, risk/coverage, AUROC, exposure and seen/unseen triggers, plus all gate rows. Root causes must reconcile scorer counts, distinguish data/labels, output representation, cuts, actions, values/roles, preprocessing and calibration, and label unmeasured causes honestly. `oracle=none` and `labels=null` do not prove the absence of output/label problems. Do not rerun an already sealed/reconciled root-cause producer.

## Prospective run budget and stop rules

**Exactly one eligible new trajectory: J-s0. No confirmation budget.** Budget is reserved before model work under exclusive task/trajectory ownership; it cannot be borrowed from failed campaigns.

| Phase | Maximum authorized by this proposed design, after later execution authorization |
|---|---|
| Overfit | **One invocation**, existing fixed 200-row selection, batch 16, ≤400 updates and ≤300 seconds; unchanged existing 99% per-head/action/tag conditions |
| Full training | **One initial invocation plus at most one identity-identical durable-checkpoint resume**; ≤2 invocations total; aggregate supervised training elapsed ≤10,800 seconds; fixed full schedule 14,640 updates/8 epochs |
| Float fit | One registered invocation, ≤1,800 seconds |
| Python/Node q8 fit | One registered invocation, ≤1,800 seconds |
| Quality evaluation including its automatic root-cause stage | One registered invocation, ≤7,200 seconds overall |
| Seed-zero public verdict | One registered invocation, ≤900 seconds |

The overfit model is discarded and full training starts from the pinned base, as in the existing recipe. A failed, interrupted or incomplete overfit invocation stops the experiment; it may not be repeated. A completed successful gate is reused on a full-training recovery. Full-training resume requires a durable checkpoint and unchanged data, source, objective, optimizer/scheduler and RNG provenance. No from-base restart, replacement seed, extra epochs, third training invocation, checkpoint selection by quality or optimizer continuation after a measured miss.

Aggregate training time is the sum of supervised elapsed time of all full-training invocations, including failed/interrupted attempts. Each invocation's deadline is bounded by the remaining aggregate allowance and the explicit finite wall deadline. Persist attempt reservation and time accounting before/after execution so coordinator restarts cannot reset counters. If reliable accounting or checkpoint identity is unavailable, refuse recovery.

No automatic fit/evaluation/export retry is granted. A tool defect requires preserved failure, a regression test, scoped review and explicit disposition of remaining authorization before any further execution. Completed checks/probes are reused when identities and assumptions still match. Bounded fixture/tiny-model source tests are distinct from experiment trajectories; they cannot be used to tune J or run additional base-model overfits.

Export only a completed trajectory, once, with its inherited finite supervised CPU deadline fixed in the registered protocol before execution (≤3,600 seconds). Independent verification of J's actual final checkpoint/q8 requires one representative padded fit batch per runtime, no fitting or training, within one serial supervised verification phase ≤300 seconds. Complete fit/quality arithmetic is checked from saved outputs. These checks are mandatory evidence, not extra training trajectories or an opportunity for model selection.

Preserve shared GPU UUID, work, budget and trajectory locks; task-local CPU ownership; 5-GiB allocator cap; 90°C, slowdown and nonfinite stops; GPU-phase host RSS/available-memory limits 8/2 GiB; CPU-phase limits 12/4 GiB. CPU-heavy work is serial, two computation threads, offline/local-only. Public commands own their locks internally; do not double-wrap them in flock. Every process chain needs finite deadlines and signal/resource receipts. Release task processes/locks after completion and preserve review/recovery evidence.

## Prospective implementation and evidence contracts

These files are **not created or modified during this planning task**:

- Create `training/neural/modernbert_request_class_loss.py` for deterministic manifest arithmetic; create J-specific `modernbert_request_weight_{protocol.json,fit.py,fit.mjs,fit_evidence.mjs,measure.mjs,train.sh}` and `modernbert_request_weight.py` under `training/neural/parity/`, with corresponding tests.
- Modify only the opt-in objective integration/provenance in `training/neural/finetune_modernbert_batched.py` and its relevant tests. Add `--request-class-loss-manifest`, mutually exclusive with existing `--class-loss-manifest`; reject stacking even for direct function callers. Append an optional request-class objective argument while preserving existing ordinary-CE settings/loss/gradients and W semantics.
- The same full-corpus coefficients/μ must reach `request_loss`, preflight, the one overfit gate and full training. Extend source inventory and checkpoint metadata with the distinct formula and manifest hash; changed objective/data/source must refuse resume.
- Later write `reports/modernbert-request-weighting-implementation-checkpoint.md`, final report/evidence and append the run-log only with observed outcomes. Historical campaign tools/protocols/reports and all cached artifacts remain read-only; shared production measurement primitives remain unchanged.

Grounding: `finetune_modernbert_batched.py` has `request_loss` at lines 121–138 and objective/metadata/overfit/training propagation at approximately 305–329, 387–454 and 535–570. `finetune_roles.py:83–89` defines actual targets. `modernbert_class_loss.py:22–66` provides count/manifest validation patterns. Existing `modernbert_rare_heads_fit.py:193–248` computes selected-head correctness, so J needs a new explicit full-vector predicate and evidence consumer. `modernbert_next_measure.mjs:679–731` supplies unchanged quality measurement, and `modernbert_forms_measure.mjs:485–540,579–624` supplies applicability/acceptance patterns. New J adapters must bind their own root, schemas and ownership; importing a helper with a hardcoded W root does not authorize bypassing its context checks.

Proposed public interfaces are new `.py freeze|verify|fit`, `.mjs applicability|evidence|evaluate|verdict --stage seed0`, and `modernbert_request_weight_train.sh J 0`. Register exact output paths beneath TJ, refuse other arms/seeds/stages and foreign/symlink outputs, and require inherited lock/resource context for internal workers. A verdict file alone cannot authorize anything beyond the one budgeted trajectory.

Before any later model work, require frozen-source/data/objective checks, nonzero source tests and independent source review. Commands registered in J's future evidence manifest include the affected `test_batched_trainer.py`, new objective/fit Python tests and new fit/consumer/measurement Node tests. Preserve actual argv, cwd, environment, start/end/deadline, exit/signal/error, before/after identities, output hashes and nonzero check counts. Never stamp fixture evidence with a model identity to manufacture learned accuracy.

Required focused coverage:

1. Ordinary CE and W retain their previous losses/gradients/settings; J class-logit gradient equals `q_i*(softmax-onehot)/(B*52)`. Action/tag/cut coefficients remain unchanged.
2. Zero/all-positive heads, all-absent rows, literal `none`, multiple rare heads, unknown values, duplicate IDs, Unicode/caps, singleton and final-short batches. Max versus sum/product and full-corpus versus batch/subset normalization must be distinguishable by tests.
3. Row-count-weighted splitting preserves the class loss; identical rows receive identical q regardless of ID/order in a batch. The frozen row-weight inventory must still preserve corpus order and duplicates.
4. Exact tiny-model interrupted/resumed losses/tensors; changed metadata refuses resume. Second overfit, third training invocation, aggregate-time exhaustion and unregistered seed/stage refuse before model work.
5. Correct-outline/wrong-fill, spurious absent class, wrong action/tag and duplicate/substituted observation cannot pass J0. Reconstruct all predicates from complete raw outputs, never trust a summary boolean.
6. Forged/partial receipts, missing outputs/sidecars, wrong model/checkpoint, changed inference dependency and summary-only/fixture-only model claims refuse. Historical training-source differences require explicit original provenance, not removal of source checks.
7. Isolated synthetic lock/deadline/foreign-path probes preserve real resources; missing internal context refuses. Comparator fixtures must fail F-relative improvements that still regress against B; unsupported populations, missing intervals and zero execution never pass by default.

Accepted J completion must be `complete=true`, `full_schedule=true`, `max_updates=0`, epoch 8, update/total 14,640, with unchanged identities and export tied to the final checkpoint. Reuse applicable prior reviews, converter/round-trip evidence and checks about their original subjects; rerun affected trainer/new-adapter checks after implementation. Preserve the F corpus round-trip exact-only result 94.0326547% and original 95/1 gate pass without confusing it with J accuracy.

## Review, authorization boundary and final interpretation

The coordinator writes this plan. A separate **plan-reviewer, XHigh** reviews its exact saved SHA-256, including formula arithmetic, selection identity, cached applicability, joint false-pass cases and budget/recovery boundaries. Use the configured fleet with fresh context and no spawn-time model override; preserve named efforts, no Max/Ultra. Desktop base configuration currently specifies `agents.default_subagent_model=gpt-6-astra`; the subagent runtime does not expose the actual model. Old repository Sol/Terra recommendations do not override the owner's newer fleet instruction.

Any supported plan finding is resolved and the material delta independently re-reviewed. Passing plan review establishes design readiness only. **Current work stops with the plan and review: no implementation or experiment execution.** After later authorization, named code-reviewers cover objective/trainer/provenance and runner/fit-consumer/verdict changes; a test-runner executes assigned checks and an implementation-verifier independently checks new J actual-model evidence and decisive arithmetic. Prior completed evidence is reused only while its exact applicability holds.

The run, if later authorized, ends after the single seed-zero report regardless of pass/fail. Joint training fit without quality/safety success is a failed experiment, not grounds to tune. A complete pass supports one bounded seed comparison, not multi-seed robustness or deployment. R4/confirmation is not scheduled, measured or passed. Historical R/F/W failures and release/browser/Settings gates remain unchanged.

Planning observations are limited to source inspection, saved-artifact counts and corpus arithmetic. J implementation, operational safeguards and learned outcomes remain untested. The formula's broad changes to supervision, its 64.30× contextual outlier, known annotation contradictions, and the selected two-color examples' narrow word order are explicit limitations.
