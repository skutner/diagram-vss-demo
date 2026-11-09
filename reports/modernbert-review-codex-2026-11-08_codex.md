# Independent review of the ModernBERT diagram reader

Date: 2026-11-08. Reviewer: Codex, with independent training/calibration reviews and a separate data inspection. Scope: the prompt in `reports/modernbert-review-prompt.md`. No implementation or publication is proposed by this report itself.

## 1. Verdict in five lines

1. The status document is largely accurate numerically; several causal explanations and capability claims need qualification.
2. Adding Rules-covering short-command data is the right next training direction, but label removal needs a representable output before more examples can help.
3. First change: audit and repair labels/output representation, then separately measure training with `synth_short_r2` and missing cue/construction coverage.
4. Second change: preserve genuinely held-out calibration data, group related messages within calibration folds, and retain the rejected refit's **MISS**.
5. Third change: compare the actual reader paths on identical commands and require current browser evidence before making ModernBERT the default; larger models are not the first remedy.

## 2. Verification table

**Evidence convention.** **Observed** means I inspected the cited file or performed the stated read-only computation. Saved scores and receipts are observations of recorded evidence, not fresh model or browser runs. **Inferred** marks a conclusion from those observations. **Proposed** marks a future experiment or acceptance rule, not a measured result. **Not verified** means the evidence does not establish the claim.

Paths below are relative to `/home/skutner/browserLLM/diagram-vss-demo`, except **A**, which means `/home/skutner/.cache/diagram-vss-modernbert/arms`. **S** means `reports/modernbert-status-2026-11-08.md`; **R** means `training/neural/MODERNBERT_RUNLOG.md`; **E** means `reports/evidence/modernbert-c100-recal`. JSON paths identify fields directly, including where a file is too large for a useful line citation. Percentages below are rounded from the cited counts or fields.

| Status claim | Primary source and observed value | Verdict |
|---|---|---|
| §3.1: first run has 24,698 messages and 54,584 requests | `reports/modernbert.md:24-37`; `reports/evidence/modernbert/training-complete-0e25611.json` records the completed run | Confirmed |
| §3.1: 3,412 updates; 77 min 33 s | Same report, training table: 3,412 and 4,652.95 seconds | Confirmed |
| §3.1: 16/1,745 right, no wrong or extras; 1,625 held and 104 unread | `reports/modernbert.md:139-154`, frozen quality table | Confirmed; only the right-share condition failed |
| §3.2: M1 reaches colour 208/208, shape 178/178 and size 82/82 | `R:87`, supported by `reports/evidence/modernbert-parity-baseline/arms/M1-s0/fit.jsonl` | Confirmed for the sampled training rows, not the entire training corpus |
| §3.2: M1 has 13,648 updates, eight epochs, lr 6e-5, request batch 32 and cut batch 8 | `A/M1-s0/run/complete.json`, `state` and `metadata.settings` | Confirmed; training elapsed 2,201.11 seconds, consistent with the log's roughly 40 minutes including export |
| §3.3: C100 has 26,913 messages, 57,135 requests and 14,288 updates | `A/C100-s0/run/complete.json`, `metadata.data` and `state` | Confirmed |
| §3.3: 2,215 additional natural-language messages | Difference between C100 and M1 message counts; independently counted 701 `tr-` and 1,514 `p2-` IDs in `A/data/C100/cut_train.jsonl` | Confirmed |
| §3.3: C100 14.1%; C100−C50 +0.1 points | `reports/evidence/modernbert-parity-baseline/curve/curve_summary.json`: `.points.C100.right_share=.1412`, difference `.0013`, interval `[-.0088,.0111]` | Confirmed; all `nl_a`, every request executed, mean across the saved seeds |
| §3.3: C100−C0 on `nl_b` +3.7 points | `curve/nlb_by_writer.json`, `.all`: `.0371`, interval `[.0218,.053]` | Confirmed |
| §3.4: C100 at the threshold: 735 right, 10 wrong, 3 extras, 931 asked; cost 34.7 | `A/C100-s0/eval/cal-fresh2-short3-nl_a.score.json`, `.sets["fresh2+short3"].test.views.gold.today.at_threshold`: cost `34.670487`, also 69 unread | Confirmed |
| §3.4: C100 threshold .9228 and OOF AUROC .940 | `docs/model/confidence/modernbert-c100.json`: `.levels_out_of_fold.cost.threshold=.9228085704698455`, `.calibration.oof_auroc=.940427114150379` | Confirmed; OOF interpretation needs the grouping caveat below |
| §3.4: export runtime fixtures 41/41; PyTorch/Node act 19/20, tags 1,952/1,956, cuts 18/20 | `A/C100-s0/export/modernbert-C100-s0/arm_receipt.json`, `.python_ort_vs_node` and `.torch_vs_node.counts` | Confirmed; top-level `passed` is **false** under the separate strict decode rule |
| §3.5: refit cost gain +30.1 points, 8/794 wrong versus 39/595 | `E/summary.md:26`, `E/compare.json`: gain `30.1171`, interval `[22.2841,37.7327]` | Confirmed |
| §3.5: G3 −6.9, below −5; four confident mistakes | `E/summary.md:30`; `E/compare.json`: `-6.8878`, interval `[-17.8667,.5764]` | Confirmed; point floor fails although the other G3 conditions pass |
| §4: SOP-BERT 77.8%, M1 77.8%, C100 78.5% with every request executed | Respective `A/baseline/sop.cal-fresh2-short3-nl_a.score.json`, `A/M1-s0/eval/...score.json`, `A/C100-s0/eval/...score.json`, fresh2+short3/test/right_share: `.778223`, `.777650`, `.784527` | Confirmed for the `today` scoring convention |
| §4: SOP cost 23.0 versus M1 35.0 and C100 34.7 | Same score blocks: `23.037249`, `35.014327`, `34.670487` | Confirmed |
| §4: M1−SOP +12.0, interval [+4.9,+18.5] | `reports/evidence/modernbert-parity-baseline/arms/M1-s0/summary.txt:43`, paired comparison JSON beside it | Confirmed; each fit includes the same calibration sources |
| §4: C100 `nl_a` development cost −0.8/−2.8 | C100-s0/s1 score files, `.sets.nl_a.development.views.opus.today.at_threshold.cost_score`: `-.765306`, `-2.806122` | Confirmed |
| §4: 537 ms versus 71 ms | `reports/diagram-e2e-five.md:152-170` | Confirmed as historical medians for the first ModernBERT over 11 messages; not a current C100 benchmark |
| §6.1: no outline questions; one property=outline training row is equalize | Read-only count of `A/data/C100/train.jsonl`: the only such gold row is line 15372, `ops-0522`, act `equalize` | Confirmed |
| §6.1: 146 empty-label requests, zero undo/redo counts, six conflicting count wordings | Same audit: 146 `gold.label==""`; zero undo/redo rows with a gold count; six rows matching `twice` or `3 times`, listed below | Confirmed; the label-removal explanation is incomplete |
| §6.1: zero outline questions right on short sets | `E/summary.md:53,81`: 0/52 on r2 test and 0/69 on t1; publish scratch output `synth_short_r2.C100-s0.txt:15` gives 0/73 on full r2 | Confirmed; these are distinct sets/protocols |
| §6.1: 12 of the refit's 13 short-command confident mistakes are moves | `E/summary.md:94-98`, independently joined to `.f_short_executed_wrong` in `summary.json`: eight t1 moves, four r2-test moves, one r2-test undo-count | Confirmed across the two sets combined; t1 alone has eight mistakes |
| §6.2: 678 calibration messages, 46% natural language, create prior .327 | Published confidence `.calibration`: 310/678 = 45.72%; `.act_prior.create=.32685052102048145` | Confirmed as message counts, not fitting-row weights |
| §6.5: Settings table reads missing fields | `docs/js/ui.js:2327-2328` reads `heldout_oof_*`; `parity/calibrate_arm.mjs:42-43,64-73` writes threshold/score/executed without those fields | Confirmed by static inspection |
| §8: “dropout 0 against SOP-BERT's 0.1” as a whole-model comparison | ModernBERT config has encoder dropout 0, but `finetune_modernbert.py:171-177` uses .1 in its custom heads. SOP's sequence head uses its config's .2, token/encoder .1 (`finetune_roles.py:46-50`; SOP config) | Wrong if read as whole-model dropout; correct only for the encoder comparison |

**A provenance gap can be closed.** S:150-151 says which nine natural-language messages were omitted was not recorded in the files read. The current saved files recover them: `tr-01-034`, `tr-04-041`, `tr-06-049`, `tr-10-011`, `tr-11-043`, `p2-13-014`, `p2-15-009`, `p2-18-004`, `p2-18-031`. These are the source `nl_p1/opus` and `nl_p2/opus` IDs absent from C100's cut data. The source total is 2,224; subtracting those nine gives 2,215. `parity/nl_share.py:54-73` removes normalized test-text overlaps; `R:589-593` explains that policy and the first five exclusions. The texts include “undo”, “undo that”, “bigger”, “make the title bigger” and “and from signoff to publish”. This is reconstructed provenance, not evidence that I found the original complete builder stdout.

**Not verified:** the “63 bare moves, 60 direction/3 position” count in S:263. Its counting rule is unspecified. A full-span, case-insensitive `move\s+\S+\s+(left|right|up|down)[.!]?` search finds eight rows: seven direction, one position. Allowing arbitrary trailing text changes the population and admits distances and “right of” constructions. I would not repeat 63 as a bare-command statistic without its query.

## 3. Training review

### Recipe and what the comparisons establish

**Observed:** the first run stopped after its registered single epoch; M1 changes the recipe as a package and fits the sampled class values. The same base/data with substantially more optimization is strong evidence of undertraining in the first run. It does not isolate epochs from learning rate, batching, arithmetic or attention implementation. “SOP-BERT's recipe” describes the main optimization settings; it does not mean identical dropout or identical encoders. The status's conclusions about product quality on the older sets are supported; intrinsic architectural superiority is not established. Sources: `MODERNBERT_PLAN.md:39-50`; `MODERNBERT_PARITY_PLAN.md:143-151`; `R:87-89`; completion metadata above.

**Observed:** C100 uses FP32 weights with BF16 autocast, SDPA, no gradient checkpointing, and the saved optimizer settings in the table. Request loss is action cross-entropy plus the mean class-head loss plus token-tag loss; a separate mean cut loss backpropagates before the same optimizer update (`finetune_modernbert_batched.py:117-139,515-527`). Most absent class values are still training targets. **Hypothesis:** rare populated heads can receive too little useful supervision relative to absent values. Check populated/absent accuracy per head and per form before changing loss weights; a pooled training accuracy would hide this.

**Observed, derived:** C100 performs eight request passes but consumes 114,276 cut-message examples over 26,913 messages, about 4.246 cut passes. M1 consumes 109,160 over 24,698, about 4.420 passes. This follows the completed update counts, cut batch size and tail-batch cycling at `batched.py:457,516-520`. It does **not** mean the cut has one-quarter of the gradient weight: both losses are averaged. **Hypothesis:** more cut exposure could reduce unread requests and extras. First compare own cuts with gold cuts using the existing `opts.units` path (`neural.js:366-369`); measure recovered requested actions and removed extras. Do not optimize cut F1 as the adoption metric.

**Observed:** the added `nl_p*` material is 2,215/26,913 = 8.23% of cut messages but 2,551/57,135 = 4.46% of request rows. These were counted by `tr-`/`p2-` IDs in the saved C100 files. Request sampling is by requests; cut sampling is by messages. They therefore expose the added natural-language data differently. W repeats this material, but also extends the update schedule (`R:672`). Its miss supports stopping that declared experiment, not a universal theorem that weighting cannot work.

### Labels, heads and request context

**Observed:** layout keys and values are learned from training gold (`make_roles.py:397-430`). C100 has a `property=outline` class, but its only positive example is equalize; it has count tags, but undo/redo have no count in `reader.act_keys`. Adding corrected count data and rebuilding the layout can therefore expand those action outputs without inventing a word-to-legend rule. Empty label removal is different: it loses its information during conversion and decoding, as detailed below.

**Observed:** description values include literal training labels and identities in closed class heads (`config.json`, `reader.classes` for `desc:label`, `desc2:label`, `desc:anchor`). The decoder can only choose one of those values (`neural.js:297-306`). It cannot output a newly encountered description label merely because a larger encoder understands its words. The request reader also receives request spans; the cutter seeing the whole message does not give the class heads all surrounding discourse. M4 adds drawing-name tags while retaining action/class values from the first read (`neural.js:313-319`). **Inferred:** M4's miss does not rule out every form of message context or drawing conditioning, but it is sufficient to reject that measured design under its bars.

**Observed:** `ROLE_TOO_RICH=context` maps some explicit compound descriptions to context (`make_roles.py:448,483`). The browser resolves context immediately to the last shape(s) (`neural.js:293-295`). That label is not an encoded request to ask. `roles_roundtrip.py:34-41,285-295` counts reference-only/engine-refused outcomes separately from silent-label failures; `parity/test_role_too_rich.py:45-58` checks the substitution, not its eventual confidence-gated behavior. **Inferred risk:** an unrelated last shape can replace an explicit compound target. An independent reviewer demonstrated that decoder path with scripted heads; this was not a C100 prediction or a proof of a wrong gated execution. A future oracle-label test should include nonempty unrelated context and require honest unresolved/held behavior. M3 bundled this converter change with new data (`R:196-202`), so its data effect is not isolated.

**Observed:** C100's action list has no `none`; the converter's optional negative rows are not enabled (`make_roles.py:363,379`; config `reader.acts`). Thus a false positive cut reaches heads trained mainly on gold request spans. **Hypothesis:** teaching rejection using falsely cut spans whose annotations contain no request could reduce extras. Derive that supervision from the saved whole-message annotations; do not introduce a hand-written language map or replace realistic messages with generated fragments.

### Export and calibration

**Observed:** weight-only quantization preserves FP32 arithmetic at inference. Python ORT/Node compatibility is well evidenced for the saved fixtures. Quantized decoding nevertheless differs from PyTorch, and the receipt explicitly reports that fact. The saved browser check compares the published C100 on a small set of messages (`reports/evidence/modernbert-c100-publish/README.md:38-55`); it is not the canonical full arm browser receipt. Do not turn “near ties” into a strict parity pass. Training quality must be scored on the exported artifact that is actually used.

**Not verified:** whether BF16 causes material task-quality loss. `R:89` reports prior BF16 comparisons, but the export's SDPA/eager check is FP32/FP32. Zero encoder dropout and BF16 deserve separate controlled checks only after measured data/representation gaps; neither explains an output that cannot be represented. A winning configuration should be confirmed with matched seeds. The learning-curve intervals resample message/session/group units while averaging fixed seeds (`curve_summary.py:5-9,33-56`); they do not describe the full uncertainty over future training seeds.

**Observed:** calibration correctly uses fold-local priors/percentiles and chooses a cost threshold from OOF scores, including ask-all (`calibrate_arm.mjs:20-44`; `calibrate_modernbert.mjs:205-213`). But the folds are message-index modulo five. Reconstructing the actual pooled order shows every one of the ten `nl_a` calibration sessions (58 messages) and nineteen paraphrase groups (88 messages) crosses folds. The outer split groups them; the inner fit does not. **Inferred:** OOF discrimination and threshold selection may be optimistic for independent intentions. The separately scored G3 miss remains valid.

**Observed:** fitting weights are produced requests, not messages (`arm_lib.mjs:249-255`; `calibrate_modernbert.mjs:175-202`). The original pool supplies fresh2 620, short3 212, natural language 488 fitting rows. The refit adds 684 synthetic rows. Short sets therefore become 896/2,004 = 44.71% of fitted rows, although they are 63% of messages. The “counts by messages” explanation in `MODERNBERT_RECAL_PLAN.md:84-85` is wrong. Future weighting must name its unit.

**Observed:** calibration labels use `today` scoring, which ignores resize direction; the alternative direction-aware view exists (`calibrate_arm.mjs:22`; `arm_lib.mjs:232-255`; `test_score_tools.mjs:65-76`). M1's older-set cost is 35.014 under `today` but 30.602 with direction; C100's cited gate counts match between these views. This is an objective-alignment issue to fix in a new protocol, not the cause of the current C100 refit miss.

## 4. Shortcomings: agreement, corrections and independent checks

### The two largest relevant short-command error classes

**Outline questions — agree with the missing-supervision diagnosis.** The independent training audit found no outline question and only `ops-0522` with property=outline, “make the outlines the same” (`A/data/C100/train.jsonl:15372`). The class exists, so this is not a missing output class. In the actual t1 records, `st1-00018` asks “what is the outline of Paused”; the model returns property=shape. `st1-00118` asks for border color and returns property=color. The root-cause table counts 69 such property errors (`E/root_causes.md:531`); the saved score table has 0/69 right and 37 wrongly executed by the published confidence (`E/summary.md:81`). The refit holds all of them but still reads none correctly. **Location:** missing action/property supervision and model generalization, followed by a calibration failure to hold the original errors. More relevant data can improve reading; calibration can only hold these current wrong proposals.

**Outline creation/setting — also checked, because this is the larger outline error class.** The t1 table records 1/80 outline creates and 24/80 outline sets right: together 135 requested actions not right (`E/summary.md:74-75`; `E/root_causes.md:530`). Direct inspection of cached record lines 2005 and 2009 confirms `st1-00009` drops the cyan outline from a purple square, while `st1-00014` changes a requested navy outline to cyan. C100's training has 70 requests with an outline value, and the relevant class values exist. **Location:** model value prediction with sparse training coverage as a plausible contributor, not the absent-output limitation found for empty labels. Exact cause shares require an intervention; the error-category count alone cannot prove data caused every miss.

**Bare moves — agree that labels and coverage need attention; do not claim the model's cause has been proved.** The gold for `st1-00006`, “move Castle right”, is direction=right; the cached model reading is position=right. It is wrongly executed by F_short at confidence .923. The same occurs for r2 `sr2-01123`, “move Milk right”, at .9175. Sources: t1 `msg_01.jsonl:6`, r2 `msg_01.jsonl:988`, `A/C100-s0/recal/rec_ss.jsonl:2003,988`, and `E/summary.json/f_short_executed_wrong`. The exact-span training audit finds the contradiction “move Fan3 left” labelled position=left (`train.jsonl:2186`, `fh-0442`), alongside seven direction-labelled rows. Several of those seven use pronouns, so named bare moves are even less represented in this strict population. **Location:** a confirmed label conflict and sparse construction coverage; wrong class-head output is observed; the relative causal contribution of those training examples is inferred. Calibration is the final failure that admits the wrong proposal. Repair the annotation convention across all matching rows, not one string in the decoder.

### Other short-command limitations

- **Empty label removal: disagree with “other wordings” as the sufficient explanation.** There are 146 positive gold rows, but an empty text produces no tags (`make_roles.py:451`). `oe1-0026`, “Remove the label on the Parse to Store arrow”, has gold `label=""` and no label tags (`train.jsonl:12080`). Without a span, `neural.js:257-271` returns null; `formalizeJoint:392-395` omits the argument. The round-trip code explicitly documents that this output is unrepresentable and the engine asks (`roles_roundtrip.py:37-41,292-295`). t1's 0/78 and r2-test's 0/56 are recorded in `E/summary.md:49,79`. **Cause: label representation/converter/decoder, not simply insufficient examples.** The observed formalization failure does not imply all those proposals physically changed the canvas wrongly; the engine can refuse an incomplete label request.
- **Undo counts: agree, with the layout consequence made explicit.** The six contradictory rows are `sc-00015`, `sc-00181`, `sc-00417`, `sc-00510`, `sc-00708`, `sc-00998` at training lines 23517, 24037, 24745, 25034, 25623, 26478. None carries count. Current `reader.act_keys.undo` and `.redo` are empty. New correct rows must regenerate the layout; correcting only a calibration file cannot make count appear. Unlike empty text, the existing count-tag mechanism can potentially represent this after rebuilding. Verify spelled counts too; do not assume digits alone cover “twice”.
- **Sizes in descriptions: partly agree, but some cause labels are wrong.** `st1-00025`, “make the tiny hexagons teal”, explicitly writes the description; the reading puts size=tiny on the set command and omits it from the target description. `E/root_causes.md:529` groups this as a reference the message does not write. That attribution is wrong for this example. C100 already has `desc:size` values small/large/tiny; it is not evidence that this request needs drawing input. More generally, audit missing values versus attaching a value to the wrong role. Recorded t1 accuracy is 11/67 (`E/summary.md:82`).
- **“Draw a circle”: a confidence hold, not evidence that “draw” is absent.** I counted 494 create spans containing whole-word `draw` in C100 training. The saved browser probe reads circle correctly and holds it at .672 (`publish/README.md:47`). The low create prior contributes, but is not an established sole cause. The confidence also includes action, cut, tag, split-word and structural features (`neural-confidence.js:53-117`). “No explicit kind input” is accurate; “only word counts carry kind information” is too strong.

### Calibration: what actually changed

**Observed diagnostic, no refitting:** I applied the two saved confidence functions and the two saved numeric thresholds to the same cached records using `itemsOf`, `confidence` and `stats`. This separates a change in confidence scores from a change in threshold.

| Confidence scores | Numeric threshold | `nl_a` development right / wrong+extras | Cost score |
|---|---|---:|---:|
| F_ctrl | F_ctrl | 7 / 1 | −0.7653 |
| F_ctrl | F_short | 10 / 1 | 0.0000 |
| F_short | F_ctrl | 8 / 2 | −3.0612 |
| F_short | F_short | 10 / 4 | −7.6531 |

Source: read-only replay command in section 7, `A/C100-s0/eval/rec_nl.jsonl`, the published fit and `E/short.confidence.json`. **Inferred:** “a lower threshold let through three more wrong actions” is incomplete causal language. Lowering the threshold on the original scores adds correct executions without another mistake in this set; changing the fitted scores matters. On t1, lowering only the old threshold gives 685 right and 83 wrong+extras, cost −8.0870, while the actual refit gives 786/8 and 39.3753 using the same replay. The refitted scores select a much better set of executions on these commands; the gain is not explained by merely lowering the old threshold. These crossed combinations are explanatory checks, not candidate thresholds or a post-result rescue of the failed experiment.

The status also underplays the nondeciding guards: recorded real-message cost falls from −22.7273 to −68.1818, and scene cost from 28.2209 to 13.4969 (`E/summary.md:31-34`). These samples are too small for broad conclusions; they still argue against dismissing G3 as an inconvenient isolated miss.

### Natural language, browser cost and process

**Agree:** the observed natural-language quality is poor and the owner's closed line should remain closed. **Disagree with a stronger inference:** the plateau does not prove a larger model is required. Output limits, missing rejection supervision, request-local context, label noise and mixed objectives remain plausible causes. Teacher agreement is a useful reference, not a mathematical ceiling on what a correctly adjudicated reader could achieve.

**Agree with the cost concern, with measurement limits:** the historical browser numbers favor SOP-BERT substantially, but they are not C100 measurements. The C100 saved load size is 155,893,748 bytes (`publish/README.md:41`); the reported renderer memory observation does not isolate ModernBERT's own contribution. Current browser latency and memory remain unverified here.

**Agree with the export/tooling debt:** Settings fields, canonical arm receipts and Linux cleanup verification should be explicit. S:271's “the page reads neither” needs clarification: the browser loads and uses C100's confidence coefficients; it does not validate either shape of the `artifacts` metadata (`ui.js:120-132`; `neural-confidence.js:134-139,301-304`). I did not rerun the obsolete manifest validator or browser cleanup checks. The shared spelling issue belongs to preprocessing and must be measured before/after independently of model training; it should not be hidden inside a claimed model improvement.

## 5. Recommendations, effects, costs, risks and proposed bars

These are **future proposals**, not permission to execute under this read-only review. Every experiment needs its own written hypothesis and fixed decision rule, shown before running. A miss remains a miss. New learned heads or inputs need the applicable owner decision. No proposal adds hand-written language-to-legend equivalences.

**Cost reference used below.** Historical C100 training on the specified laptop took 2,109.97 seconds, about 35.2 minutes (`A/C100-s0/run/complete.json/state.elapsed`); M1's run log budgets roughly 25 minutes for CPU evaluation (`R:108`). These are reference costs, not forecasts for larger datasets or changed objectives. “Training unit” below means a comparable full recipe run plus export/evaluation; its new elapsed time must be measured. CPU-only source/record checks add no browser model bytes. Calibration fitting duration was not established here. C100 browser load size and historical latency are as cited above.

### The status document's five recommendations

| Recommendation | Assessment and expected effect | Cost on this machine / browser | Risks and proposed pre-registration bars |
|---|---|---|---|
| **1. Measure beside VSS-BERT** | **Agree; do first.** Establishes the user-visible short-command baseline and where the gate holds correct readings. Report both actual tab/chat paths and a separate comparison of each learned reader's own confidence. | No GPU. New C100 collection costs CPU; a previous scratch full-r2 pass is documented as about 20 minutes (`publish/README.md:18-19`). Bare/spelled/new views require their own timing. No added shipped bytes or per-message calls. | SOP/VSS tab gates use Rules votes whereas C100 uses its own gate (`VSSBERT_SHORT_COMMANDS_PLAN.md:35-49`); Rules-generated gold therefore cannot isolate encoder quality. Require identical input views, actual gate/dependency behavior, exact counts, extras, unread/held, and successful declared browser parity. Keep A–D as VSS-BERT diagnostic bars; pre-register separate C100 adoption bars. |
| **2. Retrain with r2 and correct labels** | **Agree, after an output audit.** Strongest direct lever for outline questions, count conventions and bare moves. Empty-label removal needs a separate representation change; more rows alone cannot fix it. Count cue coverage before generating more of an already common cue. | A baseline/candidate comparison needs matched training units where existing evidence cannot be reused. Existing C100's 35.2-minute training is the reference; new duration/memory unknown. CPU data audit plus export/evaluation. Same encoder/call structure should keep size/latency similar; new head bytes and real WASM timing must be recorded. | Separate label/converter repair from data addition, or label the result as a bundled product change with no isolated attribution. Before GPU, every newly claimed form must survive perfect-label decode with its intended arguments; no silent wrong outputs. Then require positive paired cost improvement on t1, no higher confidently wrong share, and per-target-form improvement with every request executed. Retain the original fresh2/short3/nl_a guard rules as a minimum; report stricter safety diagnostics too. Freeze calibration reservation before training. |
| **3. Recalibrate after training** | **Agree, but change the protocol preparation.** Use grouped OOF folds and model-unseen calibration messages. Retain the cost-10 threshold argmax/tie-high rule; let source-specific guards accept or reject publication. | No GPU after records exist. CPU fitting/replay; new model requires new inference records. Scalar confidence fit adds no encoder bytes or inference calls. New fitting time is unmeasured. | Training on all r2 then calibrating on its named calibration portion is not held-out calibration. Reserve groups before training, or collect a new calibration pool. Reproduce the control first; group sessions/paraphrases/repeated command spans; predeclare sources, weighting unit and L2 selection. Require P1–P3 and G1–G3, with no test-driven threshold adjustment. A future stronger noninferiority claim needs a lower interval bound above a declared loss margin, not merely an upper bound crossing zero. |
| **4. Stop more of the same natural-language training** | **Agree.** Reopening should address a specific remaining bottleneck. “Distillation from readings” alone restates the current supervised-label approach; specify what new information or loss it supplies. | No cost if the line stays closed. Larger/teacher models: GPU feasibility on 6 GiB, teacher cost, CPU cost and browser footprint are unknown; do not promise a fit. A server/teacher fallback has a separate latency and service budget. | No larger encoder before an oracle representation/context check. If reopened, retain natural-language adoption requirements and compare at equal execution precision, with cost, right share, extras and per-reader resource measurements. New input/model/fallback remains an owner decision. |
| **5. Housekeeping** | **Agree, but prioritize correctness work:** arm/browser receipts and source-to-artifact binding, then honest Settings metrics, then spelling. Stale text and unused download folders follow. | No GPU for documentation/UI/calibration-format fixes. CPU/browser parity and required regressions have unmeasured duration. Removing the old first-model folder reduces hosted storage; C100 no longer fetches it, so it does not reduce an already-current C100 visitor's inference time or download. | Do each behavior change separately. Export receipts must exercise actual Linux browser ownership/cleanup and the published artifact. UI numbers must reproduce the stored OOF metric definitions. Spelling must stop the measured harmful rewrites without increasing wrong executions on guards. Before removal, enumerate remaining script references and preserve needed reproducibility; no deletion was performed here. |

For training with r2, t1 is useful even though it is now known: the owner permits all data to be inspected. A pass still means improvement on the measured generator's constructions. Use independent LLM/person wording and production feedback to assess broader usefulness, and label evaluation on trained-on text as such. This is not a proposal to restore a hidden-test rule.

### Additional changes, ranked by expected value per cost

The ranking is **inferred**, not a measured forecast. Each row is a separate change, not a combined tuning sweep.

| Rank / change | Expected effect | Cost: GPU, CPU, browser | Risk and proposed bar |
|---|---|---|---|
| **1. Strict capability audit; learned absent/empty text distinction** | Removes an impossible target before paying for training. Also tests count action keys, description values and compound-role behavior. | Audit: no GPU, small CPU-only oracle work, no browser change. A learned empty-text representation requires a training unit; small head/decoder overhead is expected but unmeasured. | Keep existing honest-reference allowances, but report them separately from exact capability. Require exact perfect-label round trips for label removal versus no label specified, and held/unresolved output for unsupported explicit compound targets with unrelated context. Require Python/JS parity and old-row deltas accounted for. |
| **2. Grouped calibration and a clear target definition** | Makes OOF estimates more credible; prevents training/calibration overlap after r2; aligns “right” with resize behavior. | No GPU if replaying saved outputs. CPU refit and checks; no extra encoder bytes/calls. Collect new records only when the artifact or input path changes. | Do not claim a guaranteed gain: grouping may expose lower achievable coverage. Keep the cost rule; reject on guard failure. Pre-register direction-aware outcome labels, reproduce old scores under the old convention, and report changed labels/counts. Nested evaluation is needed if presenting selection OOF AUROC as an unbiased estimate. |
| **3. Decompose cut failures, then teach rejection of false requests if warranted** | Separates missing cuts from action/role errors; may reduce unsolicited actions on non-request text. | Gold-cut diagnosis: CPU inference, no GPU; duration unknown. Rejection training: a training unit, no extra encoder call, slight output-head change. | Use real/LLM whole-message annotations and fixed, documented extraction of no-request spans. Do not discard hard realistic messages. Require fewer extras per non-request message and higher cost, with no unacceptable requested-action loss on the preregistered guards. The cut diagnostic alone makes no adoption claim. |
| **4. Loss/exposure and encoder-dropout checks, one at a time** | May improve cutting or rare-value generalization after data/label repair. BF16 comes later unless a numeric mismatch explains observed errors. | Each deciding setting needs matched training units; more cut work costs extra GPU time and may exceed memory without accumulation. CPU export/evaluation repeats. Dropout/exposure changes do not inherently add inference bytes/calls. | Hold request schedule, data, seeds and other settings fixed. Change cut exposure only after the oracle-cut diagnostic supports it; measure requested actions, extras and cost. For dropout, compare populated-head generalization and matched-seed cost, not just training loss. No gain required by hypothesis may be assumed. |
| **5. Smaller reader or explicit disagreement-based combination** | Could deliver comparable safe coverage at a lower browser cost, or useful complementary coverage. First measure which correctly executed requests are unique to each reader. | Analysis of existing common records: no GPU. Student training costs unknown until specified. Running both readers costs both sessions; a conditional second reader saves cost only when it can remain unloaded or unused, which must be measured. | Do not equate agreement with correctness. A combination needs its own held-out calibration and owner-approved reader path. For a smaller student, predeclare cost/precision noninferiority and a meaningful measured reduction in bytes, warm latency and memory. Keep modernbert's larger-model adoption rule separate from the chat's identity. |

**I would not do now:** hand-map move/draw/border words in the learned decoder; lower the threshold until a favorite example executes; repeat the rejected pooled refit with a hand-picked cutoff; change several recipe knobs together; train a larger encoder to solve empty labels or a closed description vocabulary; or add another model to the chat before measuring complementary correct executions. None addresses the demonstrated cause at an acceptable, established cost.

## 6. Answers to the open questions

**Is short-command data the main lever, or are labels involved?** Both, with representation first. Outline questions have no positive question supervision; bare moves have sparse coverage plus a real conflicting label; undo counts have absent labels and absent action keys. Empty label removal is structurally unrepresentable. A data-only run can improve some of these, but cannot honestly claim the whole list fixed. Preserve provenance of every relabel and regenerate/check the layout.

**Should confidence know message kind, and how?** It should predict correctness across the kinds people actually send. That does not require a hand-written “literal/natural” router. Existing continuous structural/head features may be sufficient if fitted and validated correctly; this is unknown. Start with grouped folds and source-stratified reporting. If they still cannot discriminate, pre-register learned interactions or another approved design using existing quantitative features. A short message can be ambiguous and a long message literal; an arbitrary word-count threshold is not a validated kind detector. A production-weighted fit needs measured usage proportions and a declared weighting unit. Do not silently replace the required cost-maximizing threshold with a constrained or manually chosen threshold.

**Is ModernBERT's browser cost justified?** As an optional research/comparison tab, it offers demonstrated gains on some older sets. The existing evidence does not justify making it the default on natural language: the prescribed adoption bar was not met (`MODERNBERT_PARITY_PLAN.md:235`; S §4). For short-command adoption, obtain current C100/SOP product-path cost, risk/coverage and browser measurements. Historical size/latency alone cannot settle a new task-specific decision, and pooled scores can hide a weak form.

**Are the two plans' bars right; does the refit miss favor calibration over data?** The refit bars are defensible, explicit screening rules and correctly reject the candidate. P2 compares point estimates, not proof of equal underlying risk; the G confidence-interval rule is not a noninferiority test. The VSS-BERT plan usefully separates wrong reading, held-correct reading, excess confident mistakes and combination effects; it includes a real short-language guard and discloses Rules-vote bias. Its numeric thresholds are operational diagnostic choices, not universal calibration guarantees (`VSSBERT_SHORT_COMMANDS_PLAN.md`, §§7,14-15). Keep the bars unchanged for this completed result. The miss motivates calibration-design work, but cannot make currently wrong/unrepresentable readings correct; it is not an either/or choice. Data and calibration require separate measurements.

**Which recipe checks are worthwhile?** First the label/capability oracle, then cut-versus-gold-cut decomposition. If cutting limits requested actions, test cut exposure alone; if populated heads fit but generalize poorly, test encoder dropout alone. Quantify the actual dropout locations. Confirm a promising result with matched seeds. BF16 versus FP32 is lower priority unless exported/runtime comparisons tie it to meaningful errors. None of these checks was run on the GPU for this review.

## 7. What was not checked, evidence identity and next checks

No training, export, new model inference, package/model downloads, browser sessions, GPU runs, commits, pushes, stashes or branch switches were performed. Existing test sources were inspected; their suites were not rerun. Saved runtime/browser/test reports are historical evidence. The fresh computations were small read-only data audits and replay of confidence functions over saved records. Independent reviewers' findings were checked against the cited converter/decoder/calibration sources; their scripted-context probe is explicitly identified as delegated evidence above.

The reviewed HEAD is `0ab687cc142e884ed16332925c6d7cd558e1b8fb`, plus the existing dirty/untracked review/calibration records. In particular, the run log, `parity/sets.mjs`, calibration comparison tools and short-command plan were not assumed committed. Concurrent `training/qwen/*` work was not changed. Assigned subagent profiles were the named Sol XHigh reviewer and Terra Medium explorer roles; this runtime exposes no independent introspection proving their actual model/effort settings.

Identity anchors (SHA-256, observed by read-only hashing):

| Input | SHA-256 |
|---|---|
| Status document | `1e5a7ed001ac664aaa099e183094308932b7deb4b0867c756f2b51387b9e8ee5` |
| C100 published config | `9c9f3b2f21a4a5a6180e6342d512b2144c75dd15c7c1409970c0f349d49120c4` |
| C100 published confidence | `3efb94cdcc9bd5159c3c2cedae83e0c6ae5cadc2e5395f60e55a2f3d1811d433` |
| C100 short-command cached records | `ceb47a3653534e6198e45534cfb67cb012ce25a699dca065c2b1c39546e8dea9` (manifest comparison checked by the calibration reviewer) |
| C100 training requests | `e43be4a8ee2d2233c869d4049e4ab5658ca55a102d9a0ff164f7d3b7578c595d` (saved completion manifest) |

The following read-only audit gives the key independent training counts. It writes only stdout:

```python
import json, pathlib, re
p = pathlib.Path('/home/skutner/.cache/diagram-vss-modernbert/arms/data/C100/train.jsonl')
rows = [(i, json.loads(line)) for i, line in enumerate(p.read_text().splitlines(), 1)]
print('rows', len(rows))
print('outline', sum('outline' in r['gold'] for _, r in rows))
print('outline properties', [(i, r['id'], r['act']) for i, r in rows
                             if r['gold'].get('property') == 'outline'])
print('empty labels', sum(r['gold'].get('label') == '' for _, r in rows))
print('undo counts', sum(r['act'] in ('undo', 'redo') and 'count' in r['gold']
                         for _, r in rows))
print('draw creates', sum(r['act'] == 'create' and bool(re.search(r'\bdraw\b', r['text'], re.I))
                          for _, r in rows))
print('bare moves', [(i, r['id'], r['gold']) for i, r in rows
                    if re.fullmatch(r'move\s+\S+\s+(?:left|right|up|down)[.!]?', r['text'], re.I)])
```

Executed with `python3 -I` via stdin. Observed output: rows 57,135; outline 70; outline properties `[(15372, 'ops-0522', 'equalize')]`; empty labels 146; undo counts 0; draw creates 494; eight strict bare moves as discussed above. The OOF audit reads `rec_fs`, `rec_nl`, `rec_cs`, stably sorts by `SET_ORDER`, filters the named calibration sets/parts, assigns `index % 5`, and counts distinct folds within each session/group. Its observed results are the ten split sessions and nineteen split groups in section 3; it performs no fit.

The diagnostic confidence replay was executed with `node --input-type=module` via stdin from the repository root:

```javascript
import {readFileSync} from 'node:fs';
import {itemsOf, goldCount} from './training/neural/parity/arm_lib.mjs';
import {stats} from './training/neural/calibrate_modernbert.mjs';
import {confidence} from './docs/js/neural-confidence.js';
const C = '/home/skutner/.cache/diagram-vss-modernbert/arms/C100-s0/';
const ctrl = JSON.parse(readFileSync('docs/model/confidence/modernbert-c100.json', 'utf8'));
const short = JSON.parse(readFileSync('reports/evidence/modernbert-c100-recal/short.confidence.json', 'utf8'));
for (const [file, set, part] of [
  ['eval/rec_nl.jsonl', 'nl_a', 'development'],
  ['recal/rec_ss.jsonl', 'synth_short_t1', 'all']
]) {
  const rs = readFileSync(C + file, 'utf8').trim().split('\n').map(JSON.parse)
    .filter(r => r.set === set && r.part === part);
  const {items} = itemsOf(rs, 'primary', 'today'), G = goldCount(rs);
  for (const [s, fit] of [['ctrl', ctrl], ['short', short]])
    for (const [t, thresholdFit] of [['ctrl', ctrl], ['short', short]]) {
      const x = stats(items.map(i => ({...i,
        c: i.f && i.act ? confidence(fit, i.f, i.act) : NaN
      })), G, thresholdFit.levels_out_of_fold.cost.threshold);
      console.log({set, scores:s, threshold:t, right:x.right,
        bad:x.wrong+x.extras, cost:x.cost_score});
    }
}
```

I do not know the current production input mix, current C100 browser latency/memory, or the quality gain any proposed training change will yield. The next checks should be the strict output-capability audit and faithful common-input comparison, followed by the separately registered data/layout and calibration changes. Full runtime acceptance, including Linux browser cleanup and meaningful float/quantized differences on task outcomes, remains for the future candidate that would actually be published.
