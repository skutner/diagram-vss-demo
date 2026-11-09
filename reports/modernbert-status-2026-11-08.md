# ModernBERT in diagram-vss-demo: how it was trained, what it does, what it cannot, what to do next

Date 2026-11-08. Repository `diagram-vss-demo`, HEAD `0ab687c` (plus uncommitted work listed in section 10). Written for the owner and
for an independent reviewer; the prompt for that reviewer is `reports/modernbert-review-prompt.md`.

**Sources.** Earlier Claude Code sessions did most of this work: "ModernBERT fine-tuning plan" (the parity plan, the learning curve, the
natural-language plan and A1), two Qwen3 sessions (they compared with ModernBERT and diagnosed C100's wrong values), and an archived session
that deployed and live-checked the first model. Their records are files in the repository and in `~/.cache/diagram-vss-modernbert/`; this
document cites the files, not the conversations. Main sources: `training/neural/MODERNBERT_RUNLOG.md` (the run log, append-only),
`training/neural/MODERNBERT_PLAN.md`, `MODERNBERT_EXPORT_PLAN.md`, `MODERNBERT_PARITY_PLAN.md`, `reports/modernbert.md`,
`reports/diagram-e2e-five.md`, `training/NATURAL_LANGUAGE_NEXT_PLAN.md`, `training/NATURAL_LANGUAGE_RUNLOG.md`,
`training/qwen/QWEN3_FINETUNE_RUNLOG.md`, the confidence files under `docs/model/confidence/`, the evidence under `reports/evidence/`,
and this session's evidence folders `reports/evidence/modernbert-c100-publish/` and `reports/evidence/modernbert-c100-recal/`.

**How to read the numbers.** Every number comes from a file named beside it. *Scratch* marks a number from a scorer written in this
session, not the project's registered scorer (`training/neural/parity/score_arm.mjs`). *Inferred* marks a reasoned conclusion, not a
measurement.

**Terms.** *Requested action*: one request the gold asks for. *Every request executed*: the reader's reading of every request, as if nothing
were held. *At the threshold* / *at the gate*: only what the reader's own confidence lets through at the cost-10 level (AGENTS.md: one
confident mistake costs as much as 10 right answers). *Cost score* = (right − 10 × (executed wrong + extras executed)) per 100 requested
actions. *Confidently wrong share* = (executed wrong + extras executed) / executed. *Teachers*: Claude Opus 5.5 and gpt-6.1-sol, whose
labels are the gold of the natural-language sets.

---

## 1. Summary

- ModernBERT here is `answerdotai/ModernBERT-base` fine-tuned as a joint diagram reader (action, legend values, roles and names, request
  cut), exported to 8-bit weights with FP32 arithmetic and run in the browser with Transformers.js on WASM. It is one of the demo's tabs; it
  is not part of the chat's reader (VSS-BERT = SOP-BERT + VSS).
- **The first experiment (published 2026-11-04) was undertrained**: one epoch at lr 3e-5. On its own training rows it was right on 46 of
  178 shapes. Of its three registered conditions at the threshold (cost score > 0, at least 20% right, at most 5% of executions wrong) it
  failed one: it did 16 of 1,745 requests right (0.92%), none wrong. In the live five-reader run it did 1 of 10 requests and changed nothing
  else; its proposals held wrong values (a red star for a red circle, a triangle for a circle).
- **Trained with SOP-BERT's recipe (8 epochs, lr 6e-5, batch 32) it fits its data and equals or beats SOP-BERT on the older test sets**:
  77.8-79.5% right with every request executed on fresh2 + short3 (SOP-BERT 77.8%); at the threshold, cost score about 31-36 against
  SOP-BERT's 23.0; paired, M1 − SOP-BERT +12.0 [+4.9, +18.5].
- **On natural language written by people who do not know the legend, every ModernBERT is poor**: 7-14% right with every request executed,
  against the teachers' 70-73% agreement with each other. More natural-language data helped a little (C100 − C0: +2.9 points on `nl_a`,
  +3.7 on `nl_b`) and then flattened (+0.1 point from C50 to C100); the drawing as input and reweighting did not move it enough. The owner
  closed that line on 2026-11-07.
- **The tab now reads arm C100-s0** (commit `63fe9cc`, 2026-11-07). It reads "draw a circle" as `create shape=circle` but holds it:
  confidence 0.672 < threshold 0.9228.
- **A refit of C100's confidence with short commands (2026-11-08) missed one pre-registered bar** (natural-language guard G3: −6.9 against a
  floor of −5), although it cut confident mistakes on fresh short commands from 39 to 8. Nothing was published.
- **The remaining short-command errors are forms absent or rare in its training data** (outline questions, undo counts, label-removal
  wordings, sizes in descriptions, "move X left" without a distance). No ModernBERT trained on `synth_short_r2`, the round-2 short commands
  made for exactly these forms. That is the most direct improvement lever (section 7).

---

## 2. What the model is

| part | value | source |
|---|---|---|
| base | `answerdotai/ModernBERT-base`, revision `8949b909ec900327062f0ebf497f51aef5e6f0c8` (Apache-2.0); fine-tuned weights derive from it, repository code AGPL-3.0 | `docs/model/neural/modernbert/README.md` |
| heads | joint: action (sequence head); one class head per legend key (colour, shape, size, position, ...); `implied:scale` (from arm L2); description heads (`desc:*`, `desc2:*`); token tags B/I/O for roles and names (`B-width`/`I-width` added later); a cut head (B/I/O per word over the whole message) | `config.json` `reader` of each folder |
| tokenization | `wordwise-bpe-prefix-space-v1` (word offsets and ids match between Python and JavaScript) | `config.json` `reader.tokenization` |
| limits | 128 tokens per request, 512 per message for the cut head; a request over the limit is held, a message suffix over the limit is reported unread | `docs/js/ui.js` ModernBERT settings note; `config.json` |
| reading | two model calls per message: the cut head, then the joint read of each request (`docs/js/neural.js` `formalizeJoint`) | the message details panel ("2 model calls") |
| number words | arm L1 onwards: read from a table (`number_words_from: "table"`), a mechanical step listed in `training/sketch/VSS_READER_SPEC.md` | `config.json`; run log, L1 |
| export | `weight-only-u8-fp32`: 8-bit stored weights, FP32 arithmetic, Basic graph optimisation, three ONNX shards (1.5 + 94 + 56 MB); the same tokenizer files as the first experiment. Chosen because the first dynamic-q8 graph decoded differently in Python ORT 1.29, Node ORT 1.21 and browser WASM, and ORT 1.29's extended optimisation changed an analytic 19.25 to about 19.59 | `MODERNBERT_EXPORT_PLAN.md:9-15, 23, 51-54`; `arm_receipt.json` |
| browser runtime | Transformers.js 3.8.1, onnxruntime-web, single-thread WASM, CPU; 155.9 MB download; the demo page with ModernBERT and SOP-BERT loaded held about 2 GB of renderer memory (observed 2026-11-07; the attribution to the two WASM sessions is inferred from the memory layout) | page notes; this session |
| cost against SOP-BERT | about 150 MB and 537 ms median per message, against SOP-BERT's 68 MB and 71 ms (measured in the live run of 2026-11-04) | `reports/diagram-e2e-five.md:163-166`; `MODERNBERT_PARITY_PLAN.md` (adoption paragraph) |
| confidence | a logistic model over 24 signals read from the heads (act probability, margin and entropy; a per-action prior `act_prior`; value, fill, description and tag probabilities and margins; stray tags; the cut head's start, end and inner probabilities; unknown and split word shares; number of words, roles and requests), each turned into a percentile of its calibration distribution; thresholds per cost level chosen out-of-fold (5 folds) | `docs/js/neural-confidence.js`; `training/neural/calibrate_modernbert.mjs`; `training/neural/parity/calibrate_arm.mjs` |
| gate in the page | executes a request when its confidence ≥ the level's threshold (default `cost`); levels `cost1`, `cost2`, `cost5`, `cost`, `cost20`, `all` in ModernBERT › Settings, saved per browser | `docs/js/ui.js` (`MGATE_KEY`, `GATES.modernbert`) |

---

## 3. How it was trained: the history

### 3.0 Timeline (commits)

| commit | date (+0200 unless said) | what |
|---|---|---|
| `592973f` | 2026-11-02 14:29 +0100 | `future-experiments.md`: ModernBERT as a base documented, not run (estimates there: 10-15 min training, 2-3× slower and 2× larger than DistilBERT; measured later: about 40 min with the full recipe, 7.6× slower, 2.2× larger) |
| `62a5b8d` | 11-03 18:40 | pre-registered ModernBERT reader and pipeline (`MODERNBERT_PLAN.md`) |
| `1527372`, `0e25611` | 11-03 19:09, 21:15 | CUDA training prepared (the Mac MPS pilot stopped on its memory guard); device fix |
| `baef6de` | 11-04 07:12 | weight-only export and acceptance gates (`MODERNBERT_EXPORT_PLAN.md`) |
| `101edd9` | 11-04 07:37 | first ModernBERT published, with its negative quality result |
| `1667ead` | 11-04 07:50 | five-reader live comparison on Pages (`reports/diagram-e2e-five.md`) |
| `1fa93a5` | 11-06 07:18 | the parity plan run end to end; goal not reached |
| `b5f695f` | 11-06 19:38 | natural-language round 2 (`nl_p2`) and the learning curve |
| `b35ac66`, `2610bc3`, `abcc0d3` | 11-06 22:29, 11-07 15:54, 15:55 | W: stopped on host memory, GPU reset, then the result (miss) |
| `c266319` | 11-07 16:50 | owner closes the natural-language line |
| `759441f`, `d89d305` | 11-07 16:56, 16:58 | Qwen run log: wrong-value diagnosis of C100 (`training/qwen/finetune/wrong_values.mjs`) |
| `63fe9cc` | 11-07 18:29 | the tab reads C100-s0 |
| `0ab687c` | 11-08 08:58 | `synth_short_t1`, the fresh short-command test set |

### 3.1 The first experiment (2026-11-03 to 04; `MODERNBERT_PLAN.md`, `reports/modernbert.md`)

| setting or outcome | value |
|---|---|
| registered conditions (at the cost-10 threshold, fresh2 + short3 test) | cost score > 0; at least 20% of requests right; at most 5% of executions wrong (`MODERNBERT_PLAN.md:14-18`) |
| data | "ALL": 24,698 messages, 54,584 annotated requests (the data the VSS chain and SOP-BERT train on) |
| recipe | 1 epoch, seed 0, FP32 CUDA, eager, gradient checkpointing; microbatch 1, accumulation 16; AdamW lr 3e-5, weight decay .01, 6% warm-up, clip 1; 3,412 updates; 77 min 33 s on the RTX 3060 Laptop GPU (6 GiB) of the machine "Apparatus". The regime difference from SOP-BERT (8 epochs) was declared up front (`MODERNBERT_PLAN.md:50`) |
| fit on its own training rows | colour 29/208, shape 46/178, size 22/82 (measured later, run log, M1 part 1): undertrained. The explanation is labelled inferred in `MODERNBERT_PARITY_PLAN.md:96` and confirmed by M1 |
| result (1,745 requested) | at the gate 16 right, 0 wrong, 1,625 held, 104 unread; test cost score 0.92 (positive); **only the 20% condition failed** (0.92% right); every request executed 39.7% right (`reports/modernbert.md:139-154`; `reports/evidence/modernbert/quality-verification-baef6de.json`: "Right-request share below fixed20percent criterion") |
| confidence | 368 calibration messages; cost-10 threshold 0.97656; out-of-fold AUROC 0.882, test AUROC 0.889 |
| live five-reader run on Pages (`101edd9`) | 11 messages, 10 requested actions + 1 control: ModernBERT 1 right (the path question), 9 asked, 0 wrong, 0 extras; its held proposals had wrong values (a star with no blue, green read as red, a pronoun resolved to red); confidences 0.044-0.979 against 0.9766; starter drawing unchanged (`reports/diagram-e2e-five.md:55, 104-123`; screenshot `reports/evidence/diagram-five-101edd9/modernbert.png`) |
| scene replay (the teachers' drawing before each turn, 1,139 turns, loose) | Opus vs gpt 98.2%, Rules 59.3%, SOP-BERT 66.5%, first ModernBERT 30.1% (`MODERNBERT_PARITY_PLAN.md:61-66`) |
| typical errors | "put a gray hexagon called Switch..." → create with probability 0.9995 but shape circle; "draw a red circle." → a red star on five browser calls (the float graph agrees: not an export error); "draw a circle" → a triangle (`reports/modernbert.md:179-183`; this session) |

### 3.2 The parity plan (2026-11-05 to 06; `MODERNBERT_PARITY_PLAN.md`)

**Goal (owner, 2026-11-05):** "modernBERT shouldn't only be optimized for those examples in the repo but instead it should detect user's
intentions from natural language." The owner's answers to the plan's questions: "1 implement the entire plan without my supervision 2
generate the training data yourself 3 yes" (run log line 35).

**Data written for it** (all by LLMs; the owner chose generated data, so only 26 real messages exist, `collected_1`):

| set | messages / requests | writers and labellers | agreement of the two labellers | role |
|---|---|---|---|---|
| `llm_bench/nl_a` | 610 / 800 (Opus labels); development 300 / 392, calibration 310 / 408 (split by `sha256(session or group or id) % 2`) | written by gpt-6.1-sol (batches 01-06) and Opus (07-12); labelled by Opus and gpt-6.1-sol | 72.2% development, 73.0% all | development test and calibration |
| `llm_bench/nl_b` | 601 / 714 | written by gpt-6.1-sol (01-06) and gpt-6-astra (07-12); sealed until M5 | 69.6% | final test |
| `llm_bench/collected_1/teachers` | 26 real messages, each as sent and corrected (52 rows) | the owner's session, labelled by both teachers | 76.6% | reported |
| `llm_train/nl_p1` | 706 / about 827 | Claude writers; first labels Opus, blind; second labels gpt; 190 disagreements adjudicated blind by Opus (60 training labels changed) | 77.5% | training (M3, C-arms) |
| `llm_train/nl_p2` | 1,518 / about 1,733 | Sonnet (01-12), Haiku (13-16), Opus (17-20), gpt-6.1-sol (21-30); adjudication of 414 rows (144 training labels changed) | 75.7% | training (C-arms, W) |

Specs: `training/sketch/llm_bench/NL_TEST_SPEC.md`, `training/sketch/llm_train/NL_TRAIN_SPEC.md`, `training/neural/parity/ADJUDICATION.md`.

**The arms** (one change each, bars declared before each run; cost scores at each arm's own threshold on the fresh2 + short3 test from
`reports/evidence/modernbert-parity-baseline/arms/*/summary.txt`):

| arm | change | result | key numbers |
|---|---|---|---|
| **M1** | SOP-BERT's recipe: lr 6e-5, batch 32, 8 epochs, 6% warm-up, linear decay, weight decay .01, clip 1, seed 0, 8 messages per step for the cut head, SDPA, BF16; 13,648 updates, about 40 min | **pass** | training rows: colour 208/208, shape 178/178, size 82/82; test 77.8% every request executed (SOP-BERT 77.8%); at its threshold 851 right / 17 wrong / 7 extras, cost 35.0, 2.7% of executions wrong; M1 − SOP-BERT +12.0 [+4.9, +18.5]; `nl_a` 10.2% |
| **L1** | number words read from a table | pass | at threshold 704 / 8 / 1, cost 35.2; `nl_a` development at threshold +23.2 against M1 |
| **L2** | the implied scale (resize without a number): relabel + one class head | pass, narrowly | shrinks 15 of 17 "smaller" requests (every earlier reader 0); with every request executed worse than M1 on short3 (−64.4) and `nl_a` (−96.4), hidden by the threshold |
| **M2s / M2n** | add the existing annotated scene turns (797) / natural messages (about 2,700) | **miss** (`nl_a` bar) | cost 38.8 / 36.3; M2n 82.6% every request executed |
| **M3** | add `nl_p1` | **miss** | wrong-act first causes 203 → 159; `nl_a` development at threshold −6.6 [−19.0, +3.7] against M2n; cost 36.2 |
| **M4** | the drawing as a second input (drawing-lines, 2,048-token canvas budget) | **miss** | requests that need the drawing on `nl_a` development: 6.3% right against a bar of 60% (269 of 800 `nl_a` requests need it); +8.1 on fresh2; cost 43.7, 82.9% every request executed (single seed) |
| **F0** (final by the plan's rule) | M1's data with L1 and L2; seeds 0-2; a SOP-BERT control trained on the same rows | **adoption: no** | `nl_b` every request executed 7.4 / 8.3 / 8.4% (control 8.8 / 9.8 / 9.4%); at threshold right 1.1%, 5 of 13 executions wrong; unseen triggers (277 requests) 5.1%; paraphrase groups with the gold's effect 38.4%; sessions on its own drawing: shapes 10.8%, arrows 18.8%; F0 − control on `nl_b` −0.6 [−7.7, +7.7]; on fresh2 at threshold better on every seed (+6.7 to +10.1) (`reports/evidence/modernbert-parity-baseline/m5/m5_report.md`) |

First causes on `nl_b` (every request executed): F0 wrong act 387, extras on text with no request 323, cut 241, reference needing the drawing
186 (of 1,254 causes); the SOP-BERT control 416, 357, 285, 176 (of 1,324). On natural language the action and the cut fail first.

### 3.3 Round 2, the learning curve, W, and the close of the natural-language line (2026-11-06 to 07)

Curve with F0's recipe, seeds 0 and 1, `nl_a` all 800 requests, every request executed (`reports/evidence/modernbert-parity-baseline/curve/`):

| point | natural-language training messages | right | difference |
|---|---:|---:|---|
| C0 | 0 | 11.2% | |
| C25 | (a 25% share) | 12.8% | C25 − C0 +1.6 [+0.2, +3.0] |
| C50 | 1,153 | 14.0% | C50 − C0 +2.8 [+1.2, +4.4] |
| C100 | 2,215 | 14.1% | C100 − C50 +0.1 [−0.9, +1.1]; C100 − C0 +2.9 [+1.3, +4.6] |

- C100's training data: F0's list with `ROLE_TOO_RICH=context` plus 2,215 natural-language messages (`MODERNBERT_RUNLOG.md:672`; `nl_p1` +
  `nl_p2` hold 2,224, and which 9 were left out is not recorded in the files read): 26,913 messages, 57,135 requests, 8 epochs, 14,288 updates.
- On `nl_b` (read once already at M5, so not used to choose): C0 7.6% → C100 11.3%, +3.7 [+2.2, +5.3]; on gpt-6-astra's half, a writer
  family that wrote no training text, +3.1 [+0.6, +5.5] (`curve/nlb_by_writer.json`).
- First causes, C100-s0, `nl_a` development: wrong act 139, cut 146, extras on no request 78, needs the drawing 99, class value 41, name tags
  31 (538 in all; C0-s0 647) (`curve/root_causes/C100-s0.md:210-229`).
- **The wrong values of C100** (the Qwen session's diagnosis, `training/qwen/finetune/wrong_values.mjs`, approximate word matching;
  `reports/evidence/qwen3-finetune-plan/diagnosis/`): of 222 / 226 paired wrong requests (seeds 0 / 1) on `nl_a` development, 61 / 56 need the
  drawing, 77 / 76 are a legend value or paraphrase, 80 / 89 are values written in the message (of seed 0's 80: 37 in the request's own words,
  42 elsewhere in the message), 4 / 5 references (`QWEN3_FINETUNE_RUNLOG.md:627-660`). Upper bound if a drawing input fixed every
  drawing-dependent value: about 48 → 106 of 392 right (27%), against the M5 bar of 54.8% (run log line 736).
- By the rule declared beforehand the curve is "slowing": more rounds of the same kind would not reach the bar at any plausible size. **W**
  (natural rows weighted 4×) then missed (+0.2 [−1.0, +1.3]). **Owner, 2026-11-07 16:50: "lets go with your recommendations"**, which closed
  the natural-language line ("no more training runs of this kind": no third data round, no reweighting, no drawing-input run on natural data).
- Context: the natural-language plan after the small readers (`training/NATURAL_LANGUAGE_NEXT_PLAN.md`) compares on `nl_a`: teachers 73.0%,
  Qwen3-0.6B Q2 19.1% (development), C100 14.1%, SOP-BERT 10.5%; at each reader's cost-10 threshold on `nl_a` development: SOP-BERT −6.4,
  C100 −0.8 and −2.8 (seeds), Qwen Q1 −5.6: "No small reader executes natural language safely in useful amounts." That plan was closed, not
  run, except A1 (section 5).

### 3.4 Published: the tab reads C100-s0 (2026-11-07, commit `63fe9cc`)

The owner reported that the ModernBERT tab could not read "draw a circle". Diagnosis: the chat's "Not done" reply was VSS-BERT's; the
ModernBERT tab read `create shape=triangle` (confidence 0.193 against 0.9766). The owner chose to publish an arm ("let's go with your
recommendations", then "commit and push"). This was **not** the parity plan's adoption (its `nl_b` bar was never met); it rested on short
commands.

*Scratch* evidence (`reports/evidence/modernbert-c100-publish/`) on `synth_short_r2` (1,997 short commands, gold = the Rules' reading, seed 0
of each arm, extras not counted):

| model | core forms (1,007), every request executed right | core at its gate: right / wrong | all 1,997 at its gate: right / wrong; cost |
|---|---:|---:|---|
| first experiment | 49.7% (creates 3.0%, moves 1.2%) | 0 / 0 | 0 / 0; 0 |
| M1-s0 | 93.8% | 480 / 0 | 668 / 123; −28.1 |
| F0-s0 | 95.7% | 410 / 0 | 514 / 55; −1.8 |
| **C100-s0** | 95.7% | 474 / 3 | 636 / 39; +12.3 |
| W-s0 | 97.4% | 488 / 0 | 595 / 28; +15.8 |

- C100-s0 on the fresh2 + short3 test (registered scorer): 78.5% every request executed; at its threshold 735 right, 10 wrong, 3 extras, 931
  asked, cost 34.7, 1.7% of executions wrong. Confidence: calibration parts of fresh2, short3 and `nl_a` (678 messages, 1,320 produced
  requests), out-of-fold AUROC 0.940, cost-10 threshold 0.9228.
- Checks: the export's receipt (Python ONNX Runtime against Node on 41/41 fixtures; PyTorch against Node near ties: act 19/20, tags
  1,952/1,956, cuts 18/20, `passed: false` by its strict rule, as every arm); the page served locally gave the same readings and confidences
  as Node on five messages to three decimals; `modernbert_runtime_test.mjs` 9/9; `regress.sh` unchanged; an independent code review; the live
  Pages page read "draw a circle" as `create shape=circle`, 0.672.
- Not produced: the first experiment's canonical receipts (section 6.5); none was written by hand.

### 3.5 Refit of C100's confidence with short commands (2026-11-08): **miss**

Plan `training/neural/MODERNBERT_RECAL_PLAN.md` (two independent reviews; bars fixed before any result). Same model and signals; the
calibration data got a fourth source, the calibration part of `synth_short_r2` (679 messages). Deciding test: `synth_short_t1` (1,793 fresh
short commands, another seed of the same generator, its own ids, no text shared with `synth_short_r2`, C100's training data, `nl_a` or
`nl_b`; commit `0ab687c`).

| bar | result | F_short (refit) | F_ctrl (published fit) |
|---|---|---|---|
| P1 cost difference, `synth_short_t1` | pass | +30.1 [+22.3, +37.7] | |
| P2 confidently wrong share | pass | 8 of 794 executed | 39 of 595 |
| P3 cost difference, creates (166) | pass | +23.5 [+16.3, +31.0]; creates done 29 → 68 | |
| G1 `short3` test | pass | +6.5; 6 confident mistakes (limit 9) | 5 |
| G2 `fresh2` test | pass | −0.2; 13 (limit 21) | 8 |
| **G3 `nl_a` development** | **miss** | **−6.9** (floor −5); 4 confident mistakes | 1 |

The refit lowered the threshold (0.9228 → 0.8984) and raised the create prior (0.327 → 0.530); on 392 natural-language requests it let
through 3 more wrong actions. "draw a circle" stayed held (0.622 against 0.8984): the generator's creates say "add", never "draw". Root causes
(`reports/evidence/modernbert-c100-recal/root_causes.md`): 12 of the refit's 13 confident mistakes on short commands are "move X right/left"
read as a position where the gold is a direction; on `nl_a` 3 of 4 are placement wording read as a move ("put Sam beside Martin").

---

## 4. ModernBERT against SOP-BERT

| measure | SOP-BERT | ModernBERT | source |
|---|---|---|---|
| scene replay, 1,139 turns, loose | 66.5% | first experiment 30.1% | parity plan line 63 |
| fresh2 + short3 test, every request executed, right | 77.8% | first 39.7%; M1 77.8%; F0 78.1%; C100 78.5% | run log baselines; arm score files |
| same, cost score at its own threshold | 23.0 (shipped SOP-BERT, `nl_a` fit) | M1 35.0; C100 34.7 | arm score files (C100 rechecked in this session) |
| paired at the threshold | | M1 − SOP-BERT +12.0 [+4.9, +18.5]; F0 − control on fresh2 +6.7 to +10.1 (3 seeds) | run log M1, M5 spread |
| `nl_a`, all 800 requests, every request executed | 10.5% | C100 14.1% | `NATURAL_LANGUAGE_NEXT_PLAN.md:12-17` |
| `nl_a` development, cost at the threshold | −6.4 | C100 −0.8 / −2.8 | same, line 24 |
| `nl_b`, every request executed | control 8.8-9.8% | F0 7.4-8.4% | run log M5 spread |
| `nl_b`, cost at the threshold, paired | | F0 − control −0.6 [−7.7, +7.7] (tie) | run log M5 |
| size, median time per message | 68 MB, 71 ms | about 150 MB, 537 ms | `reports/diagram-e2e-five.md:163-166` |

Reading: properly trained, ModernBERT is not worse than SOP-BERT; it is better on the older sets at the threshold and on `nl_a`, and ties on
`nl_b`. It was not adopted because it did not beat SOP-BERT by the 5 points on `nl_b` that the plan required for its cost. Not measured yet:
the two on bare short commands at their gates.

---

## 5. Where the chat stands (context, not ModernBERT)

- The chat always replies as VSS-BERT (SOP-BERT and VSS combined). On "draw a circle" it read `create shape=circle` and held it (combined
  confidence about 0.938 against 0.9488).
- **A1** (`training/NATURAL_LANGUAGE_RUNLOG.md`, commit `525ba6e`): when VSS-BERT holds a request and asks, its question names a word of that
  request in 95 of 745 cases (12.8%; pass rule "every one", missed). Causes listed with code locations (fixed sentences that name no word,
  pronouns quoted only when the other reader had one, VSS sentences rewritten, and the spell checker rewriting the message before every
  reader: "wireless" → "wire", "instances" → "distance"). Captured from the demo itself with a headless browser
  (`training/neural/parity/a1_capture.mjs`).
- A measurement plan for VSS-BERT on short literal commands against the Rules was approved on 2026-11-08 and is running:
  `training/sketch/VSSBERT_SHORT_COMMANDS_PLAN.md` (measurement only).

---

## 6. Shortcomings (measured unless marked)

### 6.1 Reading of short literal commands (C100)

| what it gets wrong | measured | in C100's training data (`~/.cache/diagram-vss-modernbert/arms/data/C100/train.jsonl`) |
|---|---|---|
| outline questions ("what's the border colour of Db") | 0 of 69-73 right on the short sets (read as colour, label, size or position) | 0 outline questions (the one row with `property=outline` is an `equalize`) |
| undo / redo with a count ("undo twice") | 0% | 0 with a count; 6 rows "undo twice / 3 times" labelled without a count (they conflict with the generator's gold) |
| removing an arrow's label | 0% | 146 requests with `label=""`, in other wordings |
| sizes inside descriptions ("delete the small circles") | 0-24% | rare |
| "move Keeper left" without a distance | 12 of the refit's 13 confident mistakes | 63 bare "move X right/left/up/down": 60 labelled direction, 3 position (1 of them, "move Fan3 left", mislabelled); nearly all with a distance ("move Mix right by 60 pixels") |
| "draw a circle" | read right; held by confidence (0.672 / 0.9228) | the Rules' create cues include "draw" (`docs/js/logic.js:875`); not counted how often the training data says "draw" |

### 6.2 Confidence and calibration

- Fitted on 678 messages, 46% natural language (`nl_a`), where creates are often wrong; so `act_prior` scores every create low (0.327).
- Short commands in the calibration pool help short commands a lot, but a pooled fit lowers the threshold for every message (the refit's G3
  miss): the confidence has no input that tells a literal command from a natural-language message, other than word counts.
- The first experiment's fit and the arms' fits differ in format (`artifacts` a per-file map against one hash); the page reads neither.

### 6.3 Natural language

- 7-14% right with every request executed against the teachers' 70-73%; the action and the cut fail first; more data of the same kind
  flattened (section 3.3); about a third of `nl_a`'s requests need the drawing (269 of 800). Inferred: the gap needs more capacity or another
  method, not more rounds.

### 6.4 Cost in the browser

- About 150 MB and 537 ms per message (SOP-BERT 68 MB, 71 ms); the page with it loaded held about 2 GB of renderer memory (observed once).

### 6.5 Process and tooling gaps

- The canonical export chain (`export_modernbert.py`, `check_modernbert.mjs`, `check_modernbert_browser.py`, `finalize_modernbert_export.mjs`)
  accepts only the first experiment's checkpoint and artifacts; the browser check is written for macOS Chrome (on Linux its cleanup check
  would pass without checking anything). Arms are exported by `parity/arm_export.py`, whose receipt covers Python-ORT-against-Node parity
  but not the browser.
- The published first-experiment folder's manifest no longer validates at HEAD ("Export source changed: docs/js/neural.js").
- `docs/model/neural/modernbert/` (the first experiment, 156 MB) is still served by Pages, unread by the page.
- The ModernBERT Settings level table shows dashes: `ui.js` reads `heldout_oof_*` fields that `calibrate_arm.mjs` never writes.
- `docs/model/neural/modernbert-c100/README.md` says C100's training data "lacks" outline and label removal (it has 70 and 146 rows; it lacks
  outline questions and undo counts). Left on purpose: any edit there changes the folder's version and forces every returning visitor to
  download 156 MB again; corrected in the run log.
- `MODERNBERT_PARITY_PLAN.md:4` still says "Status: proposed. Nothing in this plan has been trained", although it ran.
- Most arms were evaluated with one seed (F0: 3; the curve points and W: 2).
- Only 26 real messages exist (`collected_1`); every other natural-language message is LLM-written (the parity plan's largest risk, by its own
  words).

### 6.6 Shared with the other readers

- The spell checker runs before every reader and rewrites words: "alright" → "right" (a direction word; 70 of 1,793 `synth_short_t1`
  texts), "chevrons" → "cons", "wireless" → "wire", "instances" → "distance". Reported by A1 and by the VSS-BERT plan; not fixed.

---

## 7. Recommendations (ranked)

Each would be its own pre-registered plan (AGENTS.md "Experiments": hypothesis, measure and the threshold that means "it worked", before
running; no knob turned after the data).

1. **Measure ModernBERT on bare short commands beside VSS-BERT** (cheap, CPU). Add C100 as a reported reader to
   `training/sketch/VSSBERT_SHORT_COMMANDS_PLAN.md`'s views. It answers "SOP-BERT or ModernBERT on short commands?" on the same messages and
   gives the baseline for 2.
2. **Retrain C100's recipe with the round-2 short commands added** (`training/sketch/llm_train/synth_short_r2`, which AGENTS.md's owner rule
   of 2026-11-02 says belongs in the learned readers' training data), and fix the one mislabelled "move Fan3 left" and the 6 undo-count
   label conflicts. Consider in the same data step synthetic bare "move X left/right" without a distance and the Rules' other create cues
   ("draw", "make", "put") if a count shows them rare. One GPU run (about an hour on the 6 GiB laptop GPU, estimate), export with
   `arm_export.py`, CPU evaluation.
   - Decide on `synth_short_t1` (committed; no text shared with `synth_short_r2`), with guards on `short3` test, `fresh2` test and `nl_a`
     development, and per-form bars for the forms of 6.1.
   - Caveats: the test comes from the same generator, so a pass says "better on these commands"; the round-2 training of SOP-BERT and VSS
     (TRAIN_PLAN_R2, 2026-11-03) was not adopted.
3. **Recalibrate after 2**, carrying the refit's lesson: guards on natural language, because a pooled fit moves risk onto it. Options to
   weigh in that plan (each a calibration rule, not a new model): a separate threshold per message kind decided by a mechanical,
   pre-registered rule (for example one request and at most N words), or calibration data weighted to the expected production mix. Both are
   knobs unless fixed before any result.
4. **Natural language: not more of the same.** If it matters, a new plan with a different lever (a larger encoder is limited by the browser;
   distillation from the teachers' readings; or a large model in the loop for the cases the readers hold). The owner's decision; the line was
   closed on 2026-11-07.
5. **Housekeeping** (small, each the owner's call): remove `docs/model/neural/modernbert/` and `confidence/modernbert.json` from Pages (the
   first experiment stays in git history; four research scripts still name it); correct the model README when the model files next change;
   generalise the canonical export and browser-receipt chain to arms (Linux-capable, no false pass) or document the arm-export acceptance as
   the standard; make `calibrate_arm.mjs` write what the Settings level table reads; update the parity plan's status line; fix the spell
   checker with its own regression run.

---

## 8. Open questions for a reviewer

- Is the short-command data the main lever, or are the misses partly label conventions (direction against position, the undo-count
  conflict) that a data step would only paper over?
- Should a learned reader's confidence know the message kind (literal command against natural language), and how without a hand-written rule
  (AGENTS.md forbids hand-written equivalences between language and the legend; mechanical steps are listed and measured)?
- Is the browser cost of ModernBERT justified if it ties SOP-BERT on `nl_b`, and beats it on the older sets and on `nl_a` at the threshold?
- Are the bars of this session's two plans (the refit; the VSS-BERT measurement) right, and is the refit's miss a reason to change the
  calibration design rather than the data?
- Anything in the training recipe worth a controlled check (dropout 0 against SOP-BERT's 0.1, noted in the run log; BF16; one seed per arm;
  the cut head's share of the updates)?

---

## 9. The owner's words about ModernBERT (verbatim, in order)

- 2026-11-02: documented as a future experiment, "not now" (paraphrased in `future-experiments.md:57`).
- 2026-11-05: "modernBERT shouldn't only be optimized for those examples in the repo but instead it should detect user's intentions from
  natural language." (`MODERNBERT_PARITY_PLAN.md:6`)
- 2026-11-05: "1 implement the entire plan without my supervision 2 generate the training data yourself 3 yes" (run log line 35; the run log
  reads "2" as the answer to D8, real messages: no).
- 2026-11-05: "stop implementation once the claude code hits weekly usage limit" and "stop before 7 am next morning" (line 52); "you can use
  astra xhigh as well from codex if needed to" (line 54).
- 2026-11-07, after a reboot: "continue" (line 707).
- 2026-11-07 16:50: "lets go with your recommendations" (closes the natural-language line, line 729).
- 2026-11-07 17:35: "go with your suggestion" (settles the natural-language plan, `NATURAL_LANGUAGE_NEXT_PLAN.md:217-218`).
- 2026-11-07: "let's go with your recommendations", then "commit and push" (C100 published, run log lines 749-750).
- 2026-11-07: "keep your plan"; "after finishing the plan use the plan implementer for implementation, no need for my approval" (the refit,
  `MODERNBERT_RECAL_PLAN.md` status line).
- 2026-11-08: "continue where you left off" (the refit resumed); "go with your recommendations on all questions" (the VSS-BERT plan).

---

## 10. Where everything is

**Evidence in the repository:**

| folder | what |
|---|---|
| `reports/evidence/modernbert/` | the first experiment: quality verification, browser short benchmark (Mac Chrome; identical decoding across five calls), publication regression |
| `reports/evidence/diagram-five-101edd9/` | screenshots of the five-reader live run of 2026-11-04 (`modernbert.png`, `neural.png`, `rules.png`, `vss.png`, `combined.png`), referenced by `reports/diagram-e2e-five.md:142-146` |
| `reports/evidence/qwen3-browser-prototype/live-2-f6c329e/` | six tab screenshots including ModernBERT (`reports/qwen3-browser-prototype.md:280-284`) |
| `reports/evidence/modernbert-parity-baseline/` | baselines, every arm (`arms/<arm>/summary.txt`, receipts, root causes for M1, L1, L2, M2n, M3), `m4/`, `m5/m5_report.md`, `curve/` (curve, W, `nl_b` by writer, root causes C0-W), `nl_p2/` agreement and adjudication |
| `reports/evidence/qwen3-finetune-plan/diagnosis/` | `wrong_values.{C100-s0,C100-s1,Q1,Q2}.json` |
| `reports/evidence/modernbert-c100-publish/` | this session's short-command comparison, probes, browser check, regression table |
| `reports/evidence/modernbert-c100-recal/` (uncommitted) | the refit's bars (`compare.json`), summary, root causes, logs |

**Plans and logs:** `training/neural/MODERNBERT_PLAN.md`, `MODERNBERT_EXPORT_PLAN.md`, `MODERNBERT_PARITY_PLAN.md`, `MODERNBERT_RUNLOG.md`,
`reports/modernbert.md`, `reports/diagram-e2e-five.md`, `training/NATURAL_LANGUAGE_NEXT_PLAN.md`, `training/NATURAL_LANGUAGE_RUNLOG.md`,
`training/qwen/QWEN3_FINETUNE_RUNLOG.md`; uncommitted: `training/neural/MODERNBERT_RECAL_PLAN.md`, `MODERNBERT_RECAL_HANDOFF.md`,
`training/sketch/VSSBERT_SHORT_COMMANDS_PLAN.md`, this document and `reports/modernbert-review-prompt.md`.

**Models in the repository:** `docs/model/neural/modernbert-c100/` and `docs/model/confidence/modernbert-c100.json` (the tab reads them);
`docs/model/neural/modernbert/` and `confidence/modernbert.json` (the first experiment, unread).

**Uncommitted code** (owner, 2026-11-07: "leave uncommitted"): `training/neural/parity/sets.mjs`, `test_score_tools.mjs`, `compare_fits.mjs`,
`test_compare_fits.mjs`; the VSS-BERT plan's phase-1 tools when they land.

**Outside the repository** (`~/.cache/diagram-vss-modernbert/`, 144 GB, not backed up, not cleaned automatically on this machine):

| path | what |
|---|---|
| `arms/<arm>-s<seed>/` | 25 arms of 6.4 GB each (checkpoint `run/checkpoint.pt`, `export/`, `eval/` records and fits, `nlb/` where read); the SOP-BERT controls `SOP-F0-s{0,1,2}` (590 MB each) |
| `arms/C100-s0/recal/` | the refit's work (marked by `KEEP.md`) |
| `arms/data/<arm>/` | each arm's training data (`train.jsonl`, `cut_train.jsonl`, `trigger_inventory.json`) |
| `arms/baseline/`, `arms/nlshare/`, `arms/regress_*` | baseline score sets, the curve's natural-language subsets, regression outputs |
| `cuda-run-0e25611/` | the first experiment's training run (checkpoint, float and q8 graphs) |
| `weight-only/modernbert/`, `final/modernbert/` | the first experiment's weight-only export with its receipts; an earlier export (inferred) |
| `a1/` | A1's capture and report |
| `hf/`, `venv/`, `python/`, `source/` | the base models' cache, the task's Python environment, a clone of the repository |

---

## 11. Rules that bind further work (AGENTS.md, in short)

- Training and test data are realistic messages written by LLM agents or people; synthetic short commands generated from the Rules' grammar
  are training data for the learned readers too (owner, 2026-11-02 22:04), in their own named folders.
- No hand-written equivalences between language and the legend; mechanical steps are listed and measured.
- The main metric: do only what you are sure of. The headline number is how often a reader is confidently wrong; readers are compared by the
  cost score at their own threshold, with the share done right beside it.
- Experiments: hypothesis, measure and pass threshold written before running; a miss is reported, no second try.
- Root-cause analysis after every evaluation; fixes where the cause sits.
- Agents do not commit; the coordinator reviews and commits; `regress.sh` before any commit that touches reader code or models.
