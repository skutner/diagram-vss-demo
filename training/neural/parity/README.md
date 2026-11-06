# Parity measurements

The measurements behind `../MODERNBERT_PARITY_PLAN.md`: how close a reader's wires are to the saved translations of the built-in examples by Claude Opus 5.5
(`docs/sop-translations/claude-opus-5-5`) and gpt-6.1-sol (`docs/examples/gpt-6.1-sol`), judged by what the engine (`docs/js/logic.js`) draws. Outputs of the base run:
`reports/evidence/modernbert-parity-baseline/`.

The plan's goal is reading natural language in general, so these numbers on the examples are a check and a test of the tool, not a target. M0 of the plan extends the tool to any set with a starting drawing and teacher programs.

| file | what |
|---|---|
| `SPLIT.json` | the frozen split: which examples are never trained on |
| `parity_lib.mjs` | the drawing comparison, the tolerances, the teachers, annotated wires to a program |
| `test_parity_lib.mjs` | the comparison must reject readers that are wrong by construction; run it before trusting any number |
| `readers.mjs` | the shipped readers behind one call, and `nothing`, a reader that writes no wire (the floor) |
| `teachers_agree.mjs` | Opus vs GPT, turn by turn and each on its own history |
| `readers_vs_teachers.mjs` | a reader against the teachers, every request executed, the Opus drawing before each turn |
| `free_run.mjs` | what the owner sees: each on its own drawing, a mistake carrying forward |
| `what_programs_need.mjs` | which turns need more than the message, which keys the shipped ModernBERT layout lacks |
| `teacher_stats.mjs` | counts about the teachers' programs (names a message does not hold, staging wires, repairs, numbers not in digits) |
| `tables.py` | the tables of the plan from the outputs above |
| `gold_vs_opus.mjs` | annotated labels (the scene folders, or a labelling pilot) against the teachers |
| `resize_labels.py`, `shrink_check.mjs` | the `resize` rows with a word for smaller and no scale, and what readers' wires do on the turns where Opus shrinks a shape, by engine effect |
| `drawing_input_size.mjs` | for arm M4: how long the drawing is in word pieces, how often a second call would fire |
| `canvas_lib.mjs` | arm M4: the drawing before each annotated message by replay (sessions, setups, scenes; else names only), and the shapes each name-role means (a mention the request does not write: what the engine selects) |
| `build_canvas_rows.mjs` | arm M4: the second-read rows (request, then `docs/js/drawing-lines.js` lines within 512 pieces; tags on the drawing's names only) for `finetune_modernbert_batched.py --canvas-rows`, with counts per source |
| `m4_measure.mjs` | M4.0 on a set (nl_a): what needs the drawing, how often the cap cuts the needed shape off, how often the trigger (SOP-BERT's heads) catches it |
| `test_drawing_lines.mjs`, `test_canvas_rows.mjs`, `test_m4_reader.mjs`, `test_canvas_trainer.py` | arm M4: the serialization and its cap, the rows' tags, the reader's second read and its signals, the trainer's canvas pass |
| `m4_patches/` | arm M4's hunks for files other agents owned, each with the sha256 of its base; apply with `patch -p1` from the repository root when told |
| `first_run_batches.mjs` | the first run's rows in word pieces, and the tokens in batches of SOP-BERT's recipe |
| `first_run_heads.py` | per-head errors of the first ModernBERT on its frozen records |
| `first_run_fit.py` | the first ModernBERT on its own training rows; an overfit test from the base weights |
| `gpu_probe.py` | training throughput and memory on the card |
| `data_inventory.py` | the annotated folders, how much of them holds the examples' text, what arm M2's data holds |
| `sets.mjs` | the named test sets (fresh2, short3, collected_1, scenes_test, nl_a, nl_b), their parts and the split rules |
| `collect_set.mjs` | a reader (modernbert, sop, rules; any model folder) on sets: one record per message, resumable |
| `trigger_inventory.mjs` | the annotation triggers of an arm's training messages, for the seen / unseen split of `collect_set.mjs` |
| `calibrate_arm.mjs` | the confidence of any arm: the fit of `calibrate_modernbert.mjs` on the calibration parts named by `--cal` |
| `score_arm.mjs` | per set and part: every request executed and at the cost-10 threshold, by trigger / kind / writer, with and without the direction of a resize, either teacher, paraphrase, nothing to do, sessions |
| `compare_arms.mjs` | paired cost-score difference of two arms, 95% interval over messages and sessions |
| `root_causes.mjs`, `test_root_causes.mjs` | the root-cause analysis after an evaluation: each not-right request of the Opus view (every request executed) and each extra gets the first cause that explains it (oracle / teachers disagree / cut / wrong act / reference the request does not write / class head / token head / other) and where it sits, per set part, seen against unseen trigger, with 3 examples per cause and key; at the threshold: right but held, executed wrong. `node root_causes.mjs SCORE.json TRAIN_DATA_DIR OUT.md [OUT.json]`; the counts are asserted equal to the score file's. The test has one fixture per cause and three classifiers broken on purpose that it must reject |
| `free_run_set.mjs` | sessions with each reader on its own drawing (own names, own previous step, a mistake carrying forward), with the do-nothing floor |
| `session_lib.mjs` | how a session's final drawing is compared: only what the session changed beyond its setup, and the answers of questions |
| `m5_nlb.sh` | M5's single reading of the sealed set `nl_b` by one arm: collect, score with the arm's own confidence, free run (gate on and off), the paired comparisons; `bash m5_nlb.sh ARM-sSEED modernbert|sop [MODEL]` |
| `m5_report.mjs` | the M5 table of the plan with the thresholds as restated in `MODERNBERT_RUNLOG.md`, from score, comparison and free-run files only; `--self-test` runs it on the baseline files with `nl_a` in place of `nl_b` |
| `arm_lib.mjs` | what these share: records, the direction of a resize, outcomes |
| `test_score_tools.mjs` | the reproduction of the first run's frozen result from its records, and fixtures a defect would fail |
| `build_arm_data.sh` | an arm's training rows (M1, L1, L2, M2s, M2n; `WITH_L1`, `WITH_L2`, `WITH_M2S`, `EXTRA_NL`), outside the repository, with the round-trip gate and `trigger_inventory.json`; M1 must equal the first run's rows byte for byte; test sets are refused |
| `label_fixes_l2.py`, `LABEL_FIXES_L2.jsonl` | arm L2: every `resize` row of the covered folders read, and the overlay of scales a message states without writing (`make_roles.py LABEL_FIXES`); each line says why |
| `compare_rows.py` | which training rows of an arm differ from another arm's, by key, and what its `reader.json` changes |
| `shipped_decode_check.mjs` | the shipped models decode identically with the committed and the working tree's `neural.js` / `neural-confidence.js` (fresh2 + short3) |
| `test_label_arms.py`, `test_label_arms.mjs` | the label arms: the overlay on the right wire, the implied head, refusals, the number table, the decode and the confidence of the head |
| `nl_share.py` | the learning curve's shares of the natural folders (`nl_p1`, `nl_p2`): a message is in share s when sha256(session or group or id) mod 100 < s (nested; sessions and paraphrase groups whole); rows whose text equals a test text are left out; `--copies K` writes K copies with suffixed ids. `python3 nl_share.py [--copies K] OUT_DIR SHARE FOLDER...` |
| `text_overlap.py` | training texts against every text under `llm_bench`, exactly and normalised. `python3 text_overlap.py TRAIN_TEXTS_DIR [MIN_CHARS]` |
| `adjudicate.py`, `ADJUDICATION.md` | adjudication of a natural folder (`nl_p1`'s scratch scripts, parameterised): `build` makes blind A/B batches of the teachers' disagreements and Opus engine failures, `merge` writes the adjudicated labels to `opus/` (first labels to `opus_first/`) |
| `curve_summary.py`, `test_curve_summary.py` | the learning curve's measure: `nl_a` calibration + development, Opus view, every request executed, right per requested action, seeds pooled, paired bootstrap over sessions/groups/messages. `python3 curve_summary.py [--json OUT] POINT=ARM-s0,ARM-s1 ...` |
| `repeat_rows.py` | experiment W's data from C100's built rows: rows of the given id prefixes written K times (ids suffixed), every other file copied, so the learned number-word map is C100's. `python3 repeat_rows.py SRC_DATA_DIR OUT_DIR K PREFIX...` |

**The comparison.** Strict = exact positions and sizes; loose = 60 px and a size ratio of 1.30 (never a neighbouring size word). A name counts when the message writes it; names the engine gave and names a teacher made up do not. With the drawing before the turn given, shapes already there are also compared by z-order, by whether and which way they moved and by whether and which way they were resized, so that a small wrong move is not hidden by the tolerance. Identical-looking drawings from different programs are the same: dropping a colour is often accepted because white is the default, the engine gives Sun and Roof their usual colours, and a mention can pick the same shapes without its colour. Known limit: loose does not see a lost gap on a new shape (53 of 56 turns pass, 5 strict); the main metric compares `distance`. Free run reads shapes, arrows and groups apart (`finalShares`), so a reader cannot pass on shapes alone.

These are capability numbers, not the project's main metric: every request is executed, and they are per turn because the teachers' programs have no spans to pair requests with.

## Running

The drawing comparisons need only node. To read with SOP-BERT or ModernBERT, `LAPTOP_PKG` names a `package.json` beside a `node_modules` holding `@huggingface/transformers` 3.8.1 (default `training/laptop/package.json`, after `npm ci` there).

The GPU scripts use the task's venv, one visible GPU and the lock on it:

```bash
CUDA_VISIBLE_DEVICES=GPU-905b8484-3b1e-30f6-defd-05d44f00f692 flock -n ~/.cache/diagram-vss-modernbert/locks/GPU-905b8484-3b1e-30f6-defd-05d44f00f692.lock ~/.cache/diagram-vss-modernbert/venv/bin/python -B training/neural/parity/gpu_probe.py
```

## Measuring any arm (M0.5)

```bash
node training/neural/parity/test_score_tools.mjs     # before trusting a number
READER=modernbert|sop|rules MODEL=folder node training/neural/parity/collect_set.mjs --train-data DIR OUT.jsonl fresh2 short3 collected_1 scenes_test
node training/neural/parity/calibrate_arm.mjs --cal fresh2,short3[,nl_a] CONFIDENCE.json REPORT.json OUT.jsonl
node training/neural/parity/score_arm.mjs CONFIDENCE.json|none SCORES.json OUT.jsonl     # "none" for the Rules
node training/neural/parity/compare_arms.mjs A_SCORES.json B_SCORES.json OUT.json     # refuses arms fitted on other calibration parts
READER=... MODEL=... node training/neural/parity/free_run_set.mjs [--confidence CONFIDENCE.json] FREE.json scenes_test nl_a
```

`collect_set.mjs` refuses a message whose id (or text, up to case and spacing) is in the arm's `train.jsonl` / `cut_train.jsonl`; `--allow-text-overlap` accepts text overlaps of short commands and marks them. `score_arm.mjs` and `calibrate_arm.mjs` read a records file only with its complete manifest.

`DIR` holds the arm's `train.jsonl` and `trigger_inventory.json` (`trigger_inventory.mjs`; the rows of `train.jsonl` hold no trigger, so without the file a trigger counts as seen when its words occur in a training request, which is not the registered definition). Records are not written into the repository.
