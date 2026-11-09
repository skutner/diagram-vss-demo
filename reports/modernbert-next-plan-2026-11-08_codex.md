# SPEC: ModernBERT short-command improvement with truthful outputs

## Intent (1 paragraph)

Improve the existing optional ModernBERT tab on short diagram commands by first repairing its output and label contracts, then separately measuring restored realistic training data and r2 coverage. Keep the current encoder and training recipe, preserve whole messages, and judge useful coverage at the project's cost-10 threshold. The recommended campaign is bounded: CPU preparation, three seed-0 training arms, and two confirmation runs only if the earlier arms pass. Larger models, further natural-language rounds, novel confidence features and recipe sweeps are deferred. This document specifies future work; the currently authorized deliverables are the plan and its independent review. Date: 2026-11-08. Status: proposed plan, not implemented. Review record: `reports/modernbert-next-plan-review-2026-11-08_codex.md`.

## Out of scope

- Replacing SOP-BERT, changing VSS-BERT or the chat, or reopening ModernBERT's closed natural-language line.
- Altering the completed VSS-BERT short-command experiment or its F-C follow-up priority. Its evidence may be reused when the inputs and assumptions match.
- Reclassifying the rejected C100 calibration refit as successful. Its G3 **MISS** remains.
- Dropout, pooling, BF16, epoch selection, additional cut exposure, rejection-head training, distillation, larger encoders and drawing-input experiments.
- Hand-written language-to-legend mappings, including move-word fixes in the decoder, a word-count router, automatic capitalization of canvas names, and special thresholds for favorite examples.
- A shared spelling fix. Measure its effect separately; changing spelling during this campaign would change every reader's input.
- Deleting old models or cached arms. Removing obsolete hosted assets is separate housekeeping.
- Training, downloads, browser runs, deployment, commits or pushes during planning. Preserve concurrent `training/qwen/*` work.

## Files to create

All paths below are under `/home/skutner/browserLLM/diagram-vss-demo`. These are **proposed** files, not existing commands or completed changes.

- `training/neural/parity/modernbert_next_protocol.json` — frozen sources, group assignments, arms, seeds, scoring version and decision rules.
- `training/neural/parity/modernbert_next_data.py` — audit inputs, apply reviewed annotation overlays, reserve calibration groups, build arms and evaluation views.
- `training/neural/parity/LABEL_FIXES_SHORT.jsonl` — corrections with source identity, expected old annotation, replacement annotation and reason; never rewritten message text.
- `training/neural/parity/test_modernbert_next_data.py` — overlay identity, whole-message preservation, grouping, leakage and case-view alignment checks.
- `training/neural/parity/modernbert_next_measure.mjs` — manifest-driven adapter around existing collection, confidence, scoring and comparison functions; writes fixed verdict tables.
- `training/neural/parity/test_modernbert_next_measure.mjs` — wrong scale, omitted empty text, structural holds, overlaps and missing-evidence false-pass checks.
- `training/neural/parity/test_output_contract.py` and `test_output_contract.mjs` — converter-to-decoder and engine probes for text/reference states.
- `training/neural/parity/check_arm_browser.py` and `test_arm_browser.py` — Linux-capable arm receipt with exact process ownership and cleanup, reusing browser parity code.
- `reports/evidence/modernbert-next/` — immutable input manifest, audit, protocol, commands, receipts, comparisons, root causes and verdicts. Large records, training rows, checkpoints and exports stay outside git.
- Only after publication gates: `docs/model/neural/modernbert-next/` and `docs/model/confidence/modernbert-next.json` — selected seed-0 artifact and bound confidence.

This uncommitted plan uses `_codex`. Proposed source, configuration, data and committed evidence filenames receive no such suffix.

## Files to modify

Line ranges identify inspected starting points, not final line numbers.

| File and current lines | Change |
|---|---|
| `training/sketch/LABEL_CONVENTIONS.md:50–92,133–140` | Move, count, identity and empty-text decisions below. |
| `training/neural/make_roles.py:358–488,531–544` | Explicit frozen message input; schema-gated text/reference states; training-only action keys and values. |
| `training/neural/roles_roundtrip.py:34–56,137–195,212–227,275–299` | Separate exact capability, legitimate context, structural abstention and unrepresentable labels; check actual frozen rows. |
| `training/neural/roles_roundtrip.mjs:26–75,109–125` | Pinned ModernBERT tokenizer/preparation, nonempty context and structural holds. |
| `docs/js/neural.js:247–310,362–420,553–577,654–665` | New-schema decoding, structural holds and dependencies without substituted targets. |
| `docs/js/neural-confidence.js:61–81,196–249,266–295` | New state decisions in existing confidence statistics/explanations; structural eligibility and dependencies. |
| `training/neural/calibrate_modernbert.mjs:193–237` | Shared structural eligibility in offline decisions; legacy behavior when new fields are absent. |
| `training/neural/parity/calibrate_arm.mjs:19–74` | Explicit grouped protocol mode, new outcome definition and complete OOF level statistics; reproducible legacy invocation. |
| `training/neural/parity/arm_lib.mjs:108–129,220–257` | Structural metadata/raw arguments and scale-aware outcome view. |
| `training/neural/parity/collect_set.mjs:60–77,118–128,139–140` | Explicit manifest input views; full-span overlap and structural eligibility. |
| `training/neural/parity/score_arm.mjs:32–75,199–225` | Versioned view, old views retained; distinguish proposals, structural holds and confidence holds. |
| `training/neural/parity/root_causes.mjs:63–82,254–285` | Reconcile new counts; do not call a written description value an unwritten reference. |
| `training/neural/parity/shipped_decode_check.mjs:16–39,47–65` | Explicit model/confidence paths and actual ModernBERT gate; current modernbert option selects obsolete first model. |
| `training/neural/parity/arm_export.py:87–110,220–234,294–326` | Bind contract/protocol/browser evidence without weakening numerical checks. |
| `docs/js/ui.js:2324–2335` | At publication, actual artifact and defined OOF level metrics. |
| `docs/js/neural.js:678–680` | Only at publication, optional tab points to modernbert-next. |
| `training/neural/MODERNBERT_RUNLOG.md:781–836` | Append actual campaign commands, outcomes and stop decision; retain rejected refit. |
| `training/neural/MODERNBERT_PARITY_PLAN.md:1–4` | Replace stale status with historical reference. |
| Existing adjacent focused tests | Regression cases for meaningful behavior and pass/fail changes; preserve historical assertions. |

The trainer, encoder, tokenizer policy, shared Rules reader and completed VSS-BERT tooling require no design change.

## Interfaces / contracts

### 1. Evidence and candidate identity

**Observed source behavior:** empty text has no tagged span:

```python
# make_roles.py:451
for p in ([str(args[k])] if str(args[k]) else []) if LEG[k]["kind"] == "text" else parts(args[k]):
```

Without a span, decoding returns null:

```javascript
// neural.js:270–271
} else if (!sp.length) return kind === 'number' ? implied() : out;
else if (kind === 'name' || kind === 'text') out.value = sp[0].text;
```

Compound descriptions trained as context get actual last-shape substitution:

```javascript
// neural.js:293–295
if (fill === 'context') {
  const v = c.last.length === 1 ? c.last[0] : c.last.length ? c.last.slice() : null;
  return { q, span: '', score: f.score, value: v, source: 'context (last shape created or named)', fill };
}
```

The existing fit uses message-index folds and the old scoring convention:

```javascript
// calibrate_arm.mjs:22,32
const { items } = itemsOf(cal, 'primary', 'today');
const fit = fitModel(train.filter(x => x.mi % 5 !== fold), lam);
```

**Recorded/delegated evidence:** C100 has 26,913 messages, 57,135 requests and eight epochs (`arms/C100-s0/run/complete.json`). Both reviews confirm empty-label and missing outline-question/undo-count supervision. An independent data check reproduced 421/1,793 t1 spans shared with r2, including 134/166 creates; whole-message dedup does not establish request independence. The lower-case gap is substantial, but a simple independent predicate found 134 requests rather than the review's 133. Neither becomes an acceptance population. M2n's restored folders correlate with better short3 reading; these arms do not identify one causal folder or establish transfer to other drawings.

Freeze HEAD `0ab687cc142e884ed16332925c6d7cd558e1b8fb`, the scoped tracked diff (including current run log and `parity/sets.mjs` / `test_score_tools.mjs` changes), and all consumed untracked reviews, status/prompt, recalibration plan/handoff/tools/evidence and completed VSS-BERT plan/tools/evidence. Exclude unrelated `training/qwen/*` changes from ownership and candidate diff.

The input manifest lists every consumed file with SHA-256, tracked/untracked status, symlink target if applicable, the hash of the scoped binary git diff, and reused cache manifests. “HEAD plus dirty tree” is insufficient. Every later changed candidate gets a new manifest; affected evidence is invalidated, never overwritten.

| Review anchor | SHA-256 |
|---|---|
| Codex review | `b9cd00104df2d339ad7d7dc88b2b9ead5a1d7b7dfbb219ed8e71ce60fabf5528` |
| Claude review | `4015e5db21555acc15e88c8eb5f232abeb68be0b2ba7c82d2c444d6cfc86c1ad` |

### 2. Annotation contract

Corrections use reviewed overlays, never rewritten message text or inference rules:

```text
{source_file, source_sha256, id, wire_index, expected_span,
 expected_args, replacement_args, reason}
```

All preconditions must match. Duplicate/unknown wires, changed sources, invalid legend values or inconsistently already-applied corrections exit nonzero. Record every changed key and affected evaluation label.

| Meaning | Recommended annotation |
|---|---|
| Bare displacement: “move Fan3 left”, “move Keeper to the left”, no edge or anchor qualification | direction=left; preserve explicit distance |
| Explicit canvas location: “to the far left”, “to the left edge/side of the canvas” | position=left |
| “to the left of Goal” | position=leftOf, anchor=Goal |
| Verbless “Start left” | Retain position=left convention |
| Undo/redo “twice”, “three times”, “3 times” | Expressed count; omitted count means existing default |
| Existing canvas identity, including lower case | Reference canonical names identity |
| Explicit label/says/text wording | Label semantics, including one-word labels |
| Explicit text removal | Key present with empty string; distinct from absent key |

“Far left” is a recommended annotation decision, not a claim about current Rules correctness. Keep Rules disagreements visible; do not relabel realistic text to match a generator defect. Review all matching conflicts, not only the known Fan3/six undo cases. Genuine ambiguity remains documented; never manufacture certainty. Freeze overlays before reading candidate results.

### 3. Model output contract

New configurations explicitly declare `reader.output_contract = "diagram-reader-v2"` and `reader.text_state_keys`. Legacy configurations retain exact decoding/confidence behavior.

**Text state:** an ordinary data-derived `text:<key>` class head for each applicable legend text key, with absent/empty/written states. Index zero uses the existing absence convention; positive classes derive from training annotations, not word lists.

- Absent: omit argument. Empty: emit own property with value `""`. Written: emit tagged text exactly.
- Written without a usable span, empty with contradictory nonempty span, malformed output or other inconsistent state: **structural hold** of the whole request.
- Never turn malformed state into empty text, an omitted argument, a canvas default or context fallback.
- Existing value/none confidence statistics include state probability/margin; written text also contributes tag confidence.
- Literal strings “none” and “empty” remain ordinary text. Whitespace is not silently converted to empty.

**Unsupported explicit references:** append unresolved to the v2 `fill:<role>` vocabulary. Derive from annotation structures that cannot be expressed completely: mixed names/descriptions, multiple descriptions in a role, exceeded described-role capacity.

- Context still means a legitimate reference not written in this request.
- Unresolved supplies no target and causes a structural hold with request/role-specific reason.
- Never replace the explicit compound target with its first mention or last shape.
- Keep blocked units in the analysis/dependency graph. A subsequent contextual reference remains blocked even if an unrelated last shape existed; an independent explicit request may execute.
- A nonexecuting reference to the blocked unit may serve as a contextual barrier, but must never reach the engine.
- Structural holds apply at every level, including Execute all and “do it anyway.”
- `formalizeJoint`, `gateReader`, records and offline `decisions` must share eligibility semantics.

Proposed record additions: `blocked: boolean` and `block_reasons: [{kind,key,source_span}]`. Absent fields in old records retain old behavior.

**Guarantee boundary:** perfect-label tests prove representation/decoder behavior, not that a trained model recognizes every empty/unresolved case. Learned mistakes remain subject to quality/risk gates.

### 4. Data, calibration and evaluation

Proposed `modernbert_next_data.py` commands: `audit --protocol FILE --out DIR`, `freeze --protocol FILE --out DIR`, `build --protocol FILE --arm B|R|S --out DIR`, `verify --protocol FILE --data DIR`. Inputs are whole-message annotations, overlays and immutable manifest; outputs record IDs, request indices, hashes, inclusion/reservation reasons, coverage and overlap.

**Grouping:** connected groups join session, paraphrase group, mechanical-variant origin, identical normalized whole text, and identical complete annotated request spans. Span normalization is lower case plus collapsed whitespace; no substring/bag-of-words/delexicalized match. This is provenance grouping, not model-input normalization.

**Reservation before B training:**

1. Maximum training universe: C100 sources, eight restored folders below, r2.
2. Begin with existing fresh2/short3/nl_a calibration portions.
3. Any calibration group touching a C100/restored training message/span is ineligible. Preserve it as historical/overlap evidence, not model-unseen data.
4. Reserve r2 groups with `SHA256(group_key) % 3 == 0` only if they touch neither C100/restored training nor established guard evaluation groups. All messages in such groups stay out of every arm.
5. Calibration/evaluation groups cannot cross. Remove the entire conflict from the new calibration population before freezing.
6. Build layouts, number-word associations and trigger inventories from training only; reserved labels cannot supply missing class values.
7. Trainer heldout files remain empty as its contract requires; calibration lives outside the training folder.

Preserve realistic training data; reservation means not optimized into this candidate, not secret. Before training require at least 100 independent calibration groups, at least ten in each of five deterministic hash folds, and older-long, realistic-short and synthetic-short source families. Publish message/request/produced-row counts. A giant group or insufficient support stops the campaign before training; do not split groups or add an undeclared data round.

**Frozen evaluation views:**

- Full canonical fresh2 test, short3 test, nl_a development with overlap flags; common clean subsets excluding groups touching any campaign training/calibration pool.
- `t1_clean`: whole t1 messages whose request-span groups touch neither maximum training universe nor calibration. Full t1 remains familiar-generator regression evidence.
- Existing raw, bare and spelling-corrected VSS-BERT views reused by hash, never modified.
- `lowercase_other`: fresh2 test on drawings other than Start/Process/Check/Done; lower only aligned annotated existing-name role occurrences. Preserve labels, ordinary verbs, quoted prose, canonical names, setups, whole structure and meaning.
- `short3_lowercase`: frozen annotation-based list of lower-case written-name requests, not the unexplained 133/134 predicate.
- Reported `data_attested_word_names`: names whose lowercase spelling appears as a non-name token in baseline training annotations. Diagnostic only: no veto, campaign stop or inference rule. Report counts/right share for any nonempty population; report a paired interval only with at least 40 requested actions and ten independent groups, otherwise mark the interval unavailable for insufficient support. Do not enlarge the population or change its predicate to obtain an interval.

Record each case-view replacement/offset. Omit ambiguous mechanical variants with a reason; retain their original realistic messages.

Support before candidate inference: `lowercase_other` at least 40 affected requests/ten groups; the diagnostic word-name stratum has only the reporting support rule above. `t1_clean` at least 500 requests/100 groups. Each deciding outline/size/move/label-removal form at least 20 requests/ten groups. Clean create cost subset at least ten groups.

Undo/redo/count vocabularies are finite. Report familiar complete-span cases as a finite-grammar regression population with exposure status, not a generalization test. Do not pad it with narration to manufacture independent examples. Missing support stops the claimed comparison before training, never a zero-test pass or undeclared replacement set.

### 5. Confidence and metric

One confidence function/default threshold per reader. Existing feature set and L2 grid `[.01,.1,1,10]`; no novelty features or per-kind router.

- Five folds by frozen connected-group IDs. Priors/percentiles fitted within each training fold.
- Existing OOF AUROC L2 selection and deterministic ties; call results **selection OOF**, not unbiased post-selection estimates.
- Final coefficients fitted on reserved calibration; thresholds only by OOF cost argmax, ask-all available, higher-threshold ties.
- Fit unit is eligible produced request, not message. Structurally blocked outputs are excluded from fitting, remain requested/not-done denominators.
- Zero executions cannot pass a required improvement/share criterion; missing confidence fails closed.

Cost = `100*(right-10*(wrong+extras))/requested`; confidently wrong share = `(wrong+extras)/(right+wrong+extras)`.

New versioned `truthful_v1` adds to canonical comparison: resize direction; explicit numeric scale with absolute tolerance `1e-6`; text-key presence/exact value including empty; structural/dependency eligibility. For gold omitting scale, use frozen overlay or reported direction-only interpretation. Missing raw arguments/direction makes the new measure unavailable, not correct. Retain historical today/direction outputs and rejected-refit outcome.

Report right/wrong/held/unread/extras, risk with Wilson interval, cost/right share/risk-coverage, selection/evaluation AUROC separately, populated/absent classes, seen/unseen triggers, per-form/case strata, eligible ungated proposals versus structural holds. Keep formalization scores separate from actual engine effects: engine-refused incomplete labels are not wrong physical canvas changes.

### 6. Fixed experiment sequence

Every run starts from pinned base revision `8949b909ec900327062f0ebf497f51aef5e6f0c8`. Recipe: eight epochs; encoder/head LR 6e-5; request/cut batches 32/8; weight decay .01; warm-up .06; clip 1; FP32 weights/BF16 autocast; SDPA; caps 128/512; no checkpointing/extra drawing pass.

| Arm | Declared intervention | Decision |
|---|---|---|
| B-s0 | Repaired output/annotation contract on C100 source membership | Corrected control; oracle and guards pass. Necessary contract bundle, no isolated repair attribution. |
| R-s0 | B plus restored realistic folders | Lower-case/realistic-short hypothesis against B; stop on miss. |
| S-s0 | R plus nonreserved r2 whole messages | Missing-form hypothesis against R; stop on any deciding miss. |
| R-s1, S-s1 | Seed-1 confirmation of identical definitions | Only after S-s0 passes. No seed/data/recipe selection; S-s0 predetermined publication artifact. |

Exactly these restored folders form one intervention:

```text
llm_train/scenes_r3
llm_train/scenes_r3b
llm_train/opus_r3_gaps
llm_train/opus_tgt_1
llm_train/opus_tgt_2
llm_train/ops_groups
llm_train/ops_positions
llm_train/opus_short_r2
```

Their earlier natural-language misses remain. Do not add draw data merely because one example is held; publish coverage first. Required r2 coverage includes outline questions, fill+outline colours, outline gold, desc:size huge, undo counts and bare moves. Missing cells are pre-training findings, not decoder exceptions. No mandatory new broad writing round; unsupported capability requires a separate data declaration.

### 7. Product comparison and publication contract

Maintain two tables: (1) own-reader, identical raw messages/contexts, own cuts/reads/confidences and common reserved protocol, no imported Rules votes; (2) product-path, identical typed messages, actual spelling, loaded models, dependencies, names, UI holds and engine refusal. SOP/VSS voted tabs and VSS-BERT remain product comparisons.

Reuse VSS-BERT evidence only within its covered path. Its omitted UI behavior prevents claiming full browser parity on all rows. For the winning model, capture actual local ModernBERT tab decisions against offline records, covering affected forms and spelling failures. Chat remains VSS-BERT; publication scope is the optional tab only.

## Data flow

1. Data freeze reads whole messages/overlays, groups them, emits immutable membership.
2. `make_roles.py:397` builds training-only layout/tags/action keys; whole-message cut rows at `:539`.
3. Unchanged trainer consumes rows; arm exporter exports completed weights; quality collection uses exported artifact.
4. `formalizeJoint` at `neural.js:362` cuts and batches request reads; `jointRole` decodes state/eligibility.
5. Grouped calibrator fits reserved outputs; `gateReader`/offline decisions share structural/dependency mask and OOF threshold.
6. Scorer/root causes emit fixed verdicts; only final passing candidate proceeds to browser/resources/publication evidence.

## Reused patterns

- `make_roles.py:440–488,533–536`: annotation-derived heads, as implied:scale.
- `parity/test_label_arms.mjs:19–74`: perfect scripted heads through real decoder/engine and legacy controls.
- `parity/sets.mjs:53–65`: connected groups, extended to spans/origins.
- `parity/collect_set.mjs:80–114`: manifest-bound resumable collection and owned disposal.
- `calibrate_modernbert.mjs:205–213`: finite ask-all, cost argmax, high-threshold ties.
- `parity/compare_arms.mjs:21–36`: paired bootstrap and no interval below ten groups; established 1,000 resamples, seed 20261105.
- `neural.js:654–665`: hard holds remain at Execute all.
- `check_modernbert_browser.mjs:11–45`: actual pinned WASM, production decoder, observed assets/disposal. Correct the Python wrapper's macOS-only ownership limitation; never inherit a Linux false pass.

## Acceptance criteria (MUST be measurable)

Commands are **planned**, run from repository root. New filenames require implementation first.

### A. Provenance, data and compatibility

1. Data verify exits zero only if all source, overlay, view and arm manifests match.
2. Reproduce 421 overlapping requests/239 distinct spans for current t1/r2, or stop before proceeding with source/predicate mismatch explained.
3. Zero train/calibration and calibration/deciding-evaluation group intersections; no reserved message in any arm's request/cut rows.
4. Original message texts byte-identical to source except named secondary evaluation variants.
5. No silent omission due to inability to encode a real annotation; count exact limitations.
6. `python3 -B training/neural/parity/test_modernbert_next_data.py` and `node training/neural/parity/test_modernbert_next_measure.mjs` exit zero with nonzero executed checks.
7. `node training/neural/parity/test_score_tools.mjs` retains historical assertions/invocation; no rewritten old scores.
8. Updated shipped decode check with explicit SOP/C100 model+confidence paths reports zero differences against frozen base over fresh2/short3.

### B. Output contract before GPU

9. `python3 -B training/neural/parity/test_output_contract.py` and `node training/neural/parity/test_output_contract.mjs` exit zero.
10. Perfect labels produce exact absent/empty/written text, undo/redo counts, newly claimed outline/description values, relative/absolute moves.
11. Unsupported explicit compound fixtures held with unrelated nonempty context at cost and Execute all; canvas unchanged.
12. Contextual dependents held; independent explicit later requests execute.
13. Existing corpus round-trip gates stay at least 95% exact/reference/asked, at most 1% silent wrong. Publish exact-only percentage and 100% on newly claimed representable fixtures; reference/ask cannot pass an exact capability.
14. Oracle uses pinned ModernBERT preparation, including Python/JS Unicode and 128/512-piece boundaries; SOP tokenizer alone insufficient.

### C. Fixed quality bars

Paired cost differences use frozen groups and truthful_v1. Missing interval/population/metric or null required share is not a pass.

**Guard G**, separately on fresh2 test, short3 test, nl_a development: cost difference at each reader's cost-10 threshold at least -5 points; paired interval upper endpoint at least zero; wrong+extras per 100 requested increases at most 1.0. Apply to full canonical populations and report clean populations. Operational guard, not statistical noninferiority proof.

15. B-s0 passes G versus C100-s0 under common new calibration and all output-contract conditions. No isolated repair attribution.
16. R-s0 versus B-s0: lowercase_other ungated right share rises at least ten points and paired cost CI_low>0; short3_lowercase right share rises at least twenty points. G passes; each of these two lower-case populations adds at most one confident mistake per 100 requests. Right share is correct eligible outputs divided by **all frozen gold requested actions**, including structurally held and unread requests; eligibility restricts execution, not the denominator. The word-name stratum is reported separately with no acceptance threshold.
17. S-s0 versus R-s0: t1_clean gated cost rises at least five points, CI_low>0, confidently wrong share does not increase. Clean create subset gated cost CI_low>0.
18. Supported clean per-form ungated right shares, each divided by **all frozen gold requested actions of that form**, including structural holds/unread requests: outline question/create/set at least 90% each; label removal at least 90%; description size at least 80%; bare move at least 95%.
19. Undo/redo counts at least 90% on frozen finite-grammar regression with exposure displayed; absent/count distinction independently in oracle.
20. Label-setting right share falls no more than two points versus R; zero gated wrong empty-label outputs on nonempty-label gold. Report all label errors.
21. S passes G against R and common-protocol C100; no more than two points below R on either supported lower-case population.
22. Confirmation R-s1/S-s1 identical definitions/recipe: S-R t1_clean gated cost positive in each seed and CI_low>0 after averaging fixed seeds within resampled group. Both S seeds pass G versus corresponding C100 seed and meet per-form bars. Interval describes group variation conditional on two seeds, not full seed distribution. R-s1 is the matched S-s1 control; without B-s1 this campaign does not establish a two-seed R-B case benefit. Report that limitation; do not add another run automatically.
23. Final product-path S-s0 passes G versus shipped C100 policy and positive paired gated t1_clean cost. No requirement to replace/beat VSS-BERT.

After every evaluation, root-cause totals equal scorer wrong, unread/held and extras. Separate data, labels, output limitations, cuts, actions, values/roles, calibration and preprocessing.

### D. Export, resources and publication evidence

24. Completed training requires checked complete.json complete=true/full_schedule=true and expected identities; zero exit alone insufficient.
25. Retain FP32/eager/SDPA tolerances and Python ORT/Node checks. Export exit 2 records quantized decode differences, not parity success.
26. Quality decisions use exact quantized artifact; enumerate float/quantized changes. Browser requires identical decoded outputs/gate decisions to Node on frozen fixtures; no near-tie exception.
27. New browser check exits zero only after observing owned browser processes, binding model/reference/source/runtime hashes, completing all fixtures, disposing models, and verifying owned browser/server shutdown. Write browser receipts and later evidence outside the frozen export directory. Finalize every file inside that directory before collection/calibration; adding a receipt or README afterward changes the collection's directory hash and invalidates affected evidence. External receipts bind the unchanged export manifest and runtime-file hashes.
28. Measure C100, S-s0, SOP on same host/frozen messages: loaded-model state, cold bytes/load time, warm median/p95, incremental RSS and sampling method.
29. Optional-tab candidate: no extra encoder call/session; bytes at most110% C100, warm median at most125%, incremental peak RSS at most125% C100 plus128MiB. Matched serial runs, at least20warm measurements per class. Historical537ms/renderer observation is not baseline.
30. Settings values reproduce OOF counts/denominators; browser capture shows numbers and artifact identity.
31. Before coordinator commit touching readers/models, `bash training/sketch/regress.sh` completes; its actual table appears in commit message. Inspect the underlying failures/warnings as well as the table: the wrapper's exit status alone is insufficient. Failed/skipped checks remain pending.

## Adversarial probes the implementer MUST run

- Boundary: absent/empty/whitespace label, literal none/empty, multiword/Unicode labels, repeated names, just below/above128/512pieces.
- Contradictory outputs: written/no span, empty/nonempty tags, absent/contradictory tags, missing v2 state head, unknown schema.
- Reference: multiple descriptions; mixed name/description; compound from/to/anchor; unrelated/empty context; blocked request then “make it red”; independent explicit request afterward.
- Labels: bare left, far left, left of Y, X left, distances, digit/spelled counts and missing counts.
- Case: common-word names beside real verbs, quoted labels, multiword/repeated/Unicode names; preserve action words.
- Groups: shared full span, transitive session/paraphrase membership, case/spell variants, zero-produced-request calibration messages.
- Metrics: shrink/growth; right direction/wrong explicit scale; wrong empty text; extras; structural holds under all; dependencies; ask-all/null precision. A fixture with one correct output and nine structurally held gold requests must score 10% right, not 100%, and fail a 90% capability bar.
- Replay: occupied output refuses overwrite; identical collection resume accepts completed records; changed identities refuse resume. Diagram commands need not be idempotent.
- Orphans: missing overlay wire, referenced output, browser/model file or manifest fails closed.
- Concurrency: preserve competing GPU job/lock; collision-free task outputs; cleanup preserves unrelated browser/profile.
- Injection: interrupted export, timeout/cancellation during browser startup, disposal failure, unavailable process enumeration produce incomplete/failed evidence; observing no processes cannot prove cleanup.

## Review, verification and gates

Only plan writing/review is authorized now. A later instruction to implement this concrete plan can accept its schema and offline sequence without repeated confirmation. Publication remains distinct unless that instruction includes it.

Review coherent slices: (1) annotations/groups/scoring, (2) converter/decoder/confidence/holds, (3) arm/browser receipt/ownership, (4) exact release candidate if authorized. Independent code review precedes each dependent deciding run. Later runtime evidence stays pending until its producing validation step, not a reason to prohibit that step.

Independent verifier probes empty text, compound targets, dependencies, scale scoring and Linux cleanup on exact candidate. Test runner executes assigned checks and reports counts/results. Agents do not commit/push; coordinator owns reviewed direct-to-main publication.

Proposed command spine:

```bash
python3 -B training/neural/parity/modernbert_next_data.py audit \
  --protocol training/neural/parity/modernbert_next_protocol.json --out "$TASK/audit"
python3 -B training/neural/parity/modernbert_next_data.py freeze \
  --protocol training/neural/parity/modernbert_next_protocol.json --out "$TASK/protocol"
node training/neural/parity/modernbert_next_measure.mjs reproduce \
  --protocol "$TASK/protocol/protocol.json" --out "$TASK/reproduction"
python3 -B training/neural/parity/modernbert_next_data.py build \
  --protocol "$TASK/protocol/protocol.json" --arm B --out "$TASK/data/B"
```

TASK is a new task-owned directory outside git, e.g. `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08`; never overwrite existing arms. Per authorized arm/seed:

```bash
CUDA_VISIBLE_DEVICES="$GPU_UUID" "$PY" -B training/neural/finetune_modernbert_batched.py \
  --data "$TASK/data/$ARM" --work "$TASK/$ARM-s$SEED/run" \
  --seed "$SEED" --gpu-uuid "$GPU_UUID" --stop-at "$STOP_AT" \
  --expect-manifest "$TASK/data/$ARM.manifest.json" \
  --epochs 8 --lr 6e-5 --head-lr 6e-5 --batch 32 --cut-batch 8 --gpu-limit-gib 5
"$PY" -B training/neural/parity/arm_export.py \
  --work "$TASK/$ARM-s$SEED/run" --data "$TASK/data/$ARM" \
  --out "$TASK/$ARM-s$SEED/export"
node training/neural/parity/modernbert_next_measure.mjs evaluate \
  --protocol "$TASK/protocol/protocol.json" --arm "$ARM" --seed "$SEED" \
  --model "$TASK/$ARM-s$SEED/export" --out "$TASK/$ARM-s$SEED/eval"
```

Future checkpoint records verified physical UUID, permitted stop time, executable/venv and task quota restrictions. Reuse trainer locks, atomic checkpoints/resume identity,90C/hardware-slowdown stops,5GiB allocator,8GiB RSS and2GiB available-memory floor. Never kill competing jobs or invent another lock arrangement. One heavy CPU collection at a time, initially THREADS=2; check actual shared resources before concurrent heavy work. No installation/download is part of these commands.

**Stop rules:** measured miss stops campaign with table/root causes; no changed thresholds, weights, form definitions, seeds or extra arms. A demonstrated tool defect preserves failure evidence, receives adversarial test plus delta review, and reruns affected step into a fresh path. Interrupted training resumes only under identical identities and needs full completion. Post-miss hypotheses require new preregistration, not automatic rescue branches.

**Publication:** predetermined S-s0; preserve C100 rollback; copy finalized hash-verified files and artifact-bound confidence only. Current Node/WASM/product evidence, independent review and regress.sh on exact candidate. Rollback restores loader/version/confidence entries without deleting evidence. Preserve first-model receipts. If Computer Use is employed, release this session's access immediately and verify release; JS reset is not sufficient.

## Open questions / risks

- Grouping may reduce support; preflight exposes this before GPU work without silently relaxing rules.
- Restored examples may memorize the familiar drawing; other-drawing view decides R.
- Two seeds/small natural-language execution counts do not establish broad calibration guarantees.
- An unresolved state guarantees its meaning when predicted, not recognition of all unsupported requests.
- Closed description label/anchor vocabularies remain; audit rather than redesign all extraction.
- Exact numeric scales must reflect message precision, not illustrative conventional factors.
- Finite undo grammar may offer regression-only evidence, not independent-span generalization.
- Historical C100 training was about2,110seconds; new durations unknown. Five runs is a cap, not a forecast.
- Novelty features, cut diagnostics and epoch/dropout checks are deferred, not automatic post-miss branches.
- Astra Max was requested/configured at launch; independent effective-model introspection is unavailable.
- No implementation/test/inference/training/browser result claimed. Grounding and plan review are read-only; the separate review record identifies the reviewed candidate and remaining gates.

## Implementation order (build sequence)

1. Freeze/reproduce sources and historical scores; audit overlaps, overlays and membership. Checkpoint: audit/freeze/legacy reproduction pass or stop.
2. Implement schema-gated output, confidence, structural/dependency holds and reviewed overlays. Checkpoint: oracle tests, corpus round trip, zero-difference legacy decoding.
3. Implement grouped calibration, scale-aware view and case/manifest scoring while preserving historical invocation. Checkpoint: adversarial tests, support/leakage checks and common-protocol C100 baseline.
4. Run B-s0 then R-s0 sequentially; export/evaluate/root causes/fixed verdict before advancing. Checkpoint: B guards and R case/short-language results.
5. Only after R passes, run S-s0 with nonreserved r2. Checkpoint: clean-span cost/risk/create gates, per-form capability and guards.
6. Only after S-s0 passes, run R-s1/S-s1 unchanged. Checkpoint: two-seed confirmation table including any miss.
7. If publication authorized, verify current WASM/product/resources/Settings, independent review and required regression. Checkpoint: bound optional-tab release+rollback or stopped outcome, nothing published.
