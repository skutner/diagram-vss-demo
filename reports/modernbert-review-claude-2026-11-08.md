# Independent review of the ModernBERT reader (Claude Code, 2026-11-08)

Reviewer: Claude Code (Opus 5.5), a session with no earlier context, following `reports/modernbert-review-prompt.md`. Repository
`diagram-vss-demo` at HEAD `0ab687c` plus the uncommitted files that `git status` lists. Read-only: this file is the only one written in the
repository. No training, export, GPU or model run; two read-only scratch scripts ran outside the repository (section 7).

Labels used below: **observed** means I read it or ran it, and the file:line or command is given. **Inferred** means my reasoning. **Not
verified** means I did not check it. Paths under `~/.cache/diagram-vss-modernbert/` are written `$C/`. `PB` is
`reports/evidence/modernbert-parity-baseline/` and `RC` is `reports/evidence/modernbert-c100-recal/`.

---

## 1. Verdict in five lines

1. The status document's numbers are accurate. 39 claims were checked: 33 are confirmed as stated, 3 are imprecise and 3 are wrong in
   substance (the "move X left" training counts, the cause given for label removal, and section 4's "not worse than SOP-BERT").
2. Its framing misses the largest measured short-command gap. On `short3` (LLM-written short commands), with every request executed:
   - F0 is 8.4, 9.5 and 10.2 points below SOP-BERT trained on the same rows (three seeds);
   - C100 is 6.5 points below the shipped SOP-BERT.
   The gap sits entirely on canvas names typed in lower case ("done red", "check smaller"): F0 25-37% and C100 41% right, against SOP-BERT's
   71-77%. Arms trained with M2n's folders (M2n, M3, M4) read the same requests at 71-74%.
3. The main recommendation (retrain with `synth_short_r2`) points the right way for four of the six failing forms, but not as written.
   - The deciding set `synth_short_t1` shares 421 of its 1,793 request spans with `synth_short_r2`, including 134 of its 166 creates.
   - Removing a label cannot be encoded by the converter at all.
   - The direction/position convention for "move X left" conflicts between the annotations and the Rules, and must be decided first.
4. My top three changes, in order:
   - (a) Put back the realistic folders C100 dropped. M2n's folders closed the lower-case gap on short3; M2s's alone did not. Decide on a
     lower-case view of other drawings, so the fix is shown to be more than short3's four names.
   - (b) Decide the conventions and relabel, then add `synth_short_r2`. Judge the per-form bars on t1 without the spans it shares with r2,
     and any whole-set bar on a fresh set deduplicated by span.
   - (c) Recalibrate with folds grouped by template, without the dead `unk_share` signal, and with novelty signals counted from the training data.
5. Not justified now: more natural-language rounds, a larger encoder, or ModernBERT in the chat. Its browser cost (2.2x the size, 7.6x the time
   of SOP-BERT) buys nothing on short commands until (a) is fixed.

---

## 2. Verification table

All rows are observed. The "result" column says confirmed, imprecise or wrong. The section number is the status document's.

| # | sec. | claim in the status document | source I read or ran | result |
|---|---|---|---|---|
| 1 | 2 | three ONNX shards of 1.5 + 94 + 56 MB | `ls -la docs/model/neural/modernbert-c100/onnx`: 1,491,260 / 93,974,844 / 56,262,912 bytes | confirmed |
| 2 | 2 | two model calls per message | `docs/js/neural.js:372-373`: `readMany` reads all requests in one call, after the cut call | confirmed |
| 3 | 3.1 | first run: 3,412 updates, 77 min 33 s | `reports/modernbert.md:37-38` | confirmed |
| 4 | 3.1 | first run on its own rows: colour 29/208, shape 46/178, size 22/82 | `training/neural/MODERNBERT_RUNLOG.md:87` | confirmed |
| 5 | 3.1 | at the gate 16 right, 0 wrong, 1,625 held, 104 unread; cost 0.92 | `reports/modernbert.md:141-151`; `PB/baselines/modernbert.cal-fresh2-short3.score.json` (16, 0, cost 0.916905) | confirmed |
| 6 | 3.1 | 368 calibration messages, out-of-fold AUROC 0.882, threshold 0.97656 | `docs/model/confidence/modernbert.json` `calibration` (368, 0.88182) and `levels_out_of_fold.cost` (0.9765597) | confirmed |
| 7 | 3.2 | M1: 13,648 updates; at its threshold 851 right / 17 wrong / 7 extras, cost 35.0, 2.7% of executions wrong | run log :87, :210; `PB/arms/M1-s0/summary.txt` | confirmed |
| 8 | 3.2 | M1 − SOP-BERT +12.0 [+4.9, +18.5] | `PB/arms/M1-s0/summary.txt` (`minus_sop`, fresh2+short3, gate) | confirmed |
| 9 | 3.2 | L1 704 / 8 / 1, cost 35.2 | `$C/arms/L1-s0/eval/cal-fresh2-short3-nl_a.score.json` | confirmed |
| 10 | 3.2 | M2s / M2n cost 38.8 / 36.3; M2n 82.6% with every request executed | the M2s-s0 and M2n-s0 score files | confirmed |
| 11 | 3.2 | M4 cost 43.7; 82.9% | the M4-s0 score file | confirmed |
| 12 | 3.2 | F0 on `nl_b` 7.4 / 8.3 / 8.4%, control 8.8 / 9.8 / 9.4% | run log :542-544 (not re-read from the m5 JSON) | confirmed from the log |
| 13 | 3.3 | curve 11.2 / 12.8 / 14.0 / 14.1%; C100−C50 +0.1 [−0.9, +1.1]; C100−C0 +2.9 [+1.3, +4.6] | `PB/curve/curve_summary.json` | confirmed |
| 14 | 3.3 | C100: 26,913 messages, 57,135 requests, 14,288 updates | `$C/arms/C100-s0/run/complete.json` (`state`, `data`) | confirmed |
| 15 | 3.3 | `nl_b` C0 7.6% → C100 11.3%, +3.7 [+2.2, +5.3]; astra +3.1 [+0.6, +5.5] | `PB/curve/nlb_by_writer.json` | confirmed |
| 16 | 3.3 | C100-s0 first causes on `nl_a` development: act 139, cut 146, no-request extras 78, drawing 99, class 41, names 31 (538 in all) | `PB/curve/root_causes/C100-s0.md:218-229` | confirmed; the 538 also holds 4 "ambiguity" rows the document does not list |
| 17 | 3.3 | wrong values 222 / 226; drawing 61 / 56; legend 77 / 76; written 80 / 89 (37 own words, 42 elsewhere) | `training/qwen/QWEN3_FINETUNE_RUNLOG.md:627-632, 655` | confirmed |
| 18 | 3.4 | the `synth_short_r2` table (first run 49.7%; M1 93.8%, 480/0, 668/123, −28.1; ...; W +15.8) | `reports/evidence/modernbert-c100-publish/README.md` table; `synth_short_r2.C100-s0.txt:36` | numbers confirmed. Imprecise: the cost column is per 100 messages with extras not counted (the README says so); the document's header does not |
| 19 | 3.4 | C100: 78.5%; 735 right / 10 wrong / 3 extras, 931 asked, cost 34.7, 1.7% | `PB/arms/C100-s0/summary.txt`, last fresh2+short3 line | confirmed |
| 20 | 3.4 | 678 messages, 1,320 produced, out-of-fold AUROC 0.940, threshold 0.9228 | `docs/model/confidence/modernbert-c100.json` `calibration`, `levels_out_of_fold.cost` | confirmed |
| 21 | 3.5 | P1 +30.1 [+22.3, +37.7]; P2 8 of 794 against 39 of 595; G3 −6.9 with 4 against 1 | `RC/summary.md` (both-fits table); run log :795-800 | confirmed |
| 22 | 3.5 | threshold 0.9228 → 0.8984; create prior 0.327 → 0.530 | `RC/summary.md` ("The two fits") | confirmed |
| 23 | 4 | scene replay: SOP-BERT 66.5%, first run 30.1% | `training/neural/MODERNBERT_PARITY_PLAN.md:63` | confirmed |
| 24 | 4 | fresh2+short3, every request executed: SOP-BERT 77.8%, first 39.7%, M1 77.8%, F0 78.1%, C100 78.5% | `PB/baselines/sop.cal-fresh2-short3-nl_a.score.json` (1,358 / 1,745); `PB/baselines/modernbert...` (693 / 1,745); the arm score files | confirmed |
| 25 | 4 | cost at each reader's own threshold: SOP-BERT 23.0, M1 35.0, C100 34.7 | SOP baseline score (23.037249); the arm summaries | confirmed |
| 26 | 4 | `nl_a`, all 800 requests: SOP-BERT 10.5%, C100 14.1% | `training/NATURAL_LANGUAGE_NEXT_PLAN.md:14-16`; SOP baseline (49 + 35 of 800) | confirmed |
| 27 | 4 | `nl_a` development at the threshold: SOP-BERT −6.4, C100 −0.8 / −2.8 | SOP baseline (−6.377551); the C100-s0 / s1 score files | confirmed |
| 28 | 4 | 71 ms against 537 ms per message | `reports/diagram-e2e-five.md:163-166` | confirmed; measured on the first experiment's model, not on C100 (same architecture) |
| 29 | 4 | "properly trained, ModernBERT is not worse than SOP-BERT; it is better on the older sets at the threshold and on `nl_a`" | `PB/arms/C100-s0/summary.txt` `minus_sop`: on short3, every request executed, −87.5 [−142.6, −35.7]; on `nl_a` development at the threshold, +5.6 [−0.3, +16.8]. Same rows, every request executed, short3: F0 59.0 / 61.8 / 56.5% against the SOP-BERT control's 67.4 / 71.3 / 66.7% (score files, three seeds) | **wrong in part**: worse on short3 with every request executed; "better on `nl_a` at the threshold" has an interval that includes 0 |
| 30 | 6.1 | outline questions 0 of 69-73 | `RC/summary.md` (t1 `outline_q` 0 of 69); `modernbert-c100-publish/synth_short_r2.C100-s0.txt:15` (0 of 73) | confirmed |
| 31 | 6.1 | 0 outline questions in training; the one row with `property=outline` is an equalize | my count on `$C/arms/data/C100/train.jsonl`: property questions are colour 361, label 189, size 180, position 144, shape 109, name 1; `ops-0522` "make the outlines the same" | confirmed |
| 32 | 6.1 | 6 "undo twice / 3 times" rows without a count | `sc-00015`, `sc-00181`, `sc-00417`, `sc-00510`, `sc-00708`, `sc-00998` in C100's `train.jsonl` | confirmed |
| 33 | 6.1 | label removal fails; "146 requests with `label=""`, in other wordings" | 146 confirmed (all act `label`). Cause: `training/neural/make_roles.py:451` drops an empty text value (nothing to tag, no class), so those rows train "no label"; `training/neural/roles_roundtrip.py:37-41, 292-294` names this a layout limit; C100's round trip counts 149 `label=""` causes (`$C/arms/data/C100.work/roundtrip/roundtrip.json`) | count confirmed; **cause wrong** (the layout, not the wording) |
| 34 | 6.1 | 63 bare "move X right/left/up/down": 60 direction, 3 position; "nearly all with a distance" | my pattern (verbs move, shift, nudge, push, slide, drag, scoot, bump + name + direction, no number) on C100's `train.jsonl`: 62 rows, 61 direction, 1 position (`fh-0442` "move Fan3 left"). Only 4 of the 62 carry a distance tag; at least 3 more say "a bit" without one ("nudge Server down a bit") | **not reproduced**; "nearly all with a distance" is wrong for the bare forms. See section 4 for what drives the error |
| 35 | 6.2 | 678 calibration messages, 46% `nl_a`; create prior 0.327 | confidence file `by_set` (310 of 678); `act_prior.create` 0.32685 | confirmed |
| 36 | 6.2 | the confidence has no input that tells a literal command from natural language "other than word counts" | published weights: `n_roles` +3.60 (the largest), `n_units` +1.49, `n_words` −0.73; `unk_share` is 0 on all 3,562 produced C100 requests in `rec_nl` and `rec_fs`, weight 0 | imprecise: the role and unit counts are stronger kind proxies than the word count |
| 37 | 6.5 | the Settings level table shows dashes: `ui.js` reads `heldout_oof_*`, which `calibrate_arm.mjs` never writes | `docs/js/ui.js:466, 2328`; `grep heldout_oof` finds nothing in `calibrate_arm.mjs` or `calibrate_modernbert.mjs` | confirmed in code (page not opened) |
| 38 | 6.5 | `MODERNBERT_PARITY_PLAN.md:4` still says "proposed" | that line | confirmed |
| 39 | 6.6 | "alright" → "right" in 70 of 1,793 t1 texts | `grep -ci alright` on t1's two files: 38 + 30 = 68; 70 is the number of t1 texts the spell checker changes (`VSSBERT_SHORT_COMMANDS_PLAN.md` §3.3) | imprecise |

The document left one number uncounted (6.1, "draw"), so I counted it. Of C100's 6,860 create rows, 492 have "draw" in their first three words
and 22 are a bare "draw a/an <word>" (observed). "draw" is not rare in training. The model reads "draw a circle" right; the hold is the
confidence (section 4).

---

## 3. Training review

### 3.1 What the recipe is (observed)

- **Settings**, from `$C/arms/C100-s0/run/complete.json` `metadata.settings`:
  - seed 0, 8 epochs, lr 6e-5 for both encoder and heads, AdamW, weight decay .01, 6% warm-up then linear decay, clip 1;
  - each update holds 32 request rows and 8 whole messages for the cut head;
  - SDPA attention, BF16 autocast over FP32 weights, no gradient checkpointing.
  - C100 trained in 2,110 s.
- **Heads**, from `training/neural/finetune_modernbert.py:166-178`:
  - The first token's vector h[:, 0] goes through Linear + ReLU + dropout .1 to the act head and all 49 class heads.
  - The token vectors go through dropout .1 to the B/I/O tag head and the 3-way cut head.
- **Loss**, from `finetune_modernbert_batched.py:121-139, 516-540`: act cross-entropy, plus the mean over the 49 class heads, plus the tag
  cross-entropy. The cut loss is a second backward pass in the same update.
- **Encoder dropout is 0**: `attention_dropout`, `embedding_dropout` and `mlp_dropout` are 0.0 in `$C/arms/C100-s0/run/encoder_config/config.json`.
  SOP-BERT's encoder uses its DistilBERT config's dropout (`finetune_roles.py:46-50`).
- **It memorises its data**, with no held-out stopping (the trainer refuses held-out rows, `finetune_modernbert_batched.py:87`):
  - mean loss in the last tenth of training: request 0.0066, cut 0.0063 (`$C/arms/C100-s0/run/train.jsonl`);
  - act and tags are 1.000 on its own rows from epoch 5 and epoch 7 (`run/fit.jsonl`).
  - Every epoch's weights are kept (`run/epoch_1.pt` … `epoch_8.pt`, for every arm).
- **A promised report is missing.** The parity plan declared, for M1, "requests with an unseen trigger, per epoch, on the calibration part" to
  watch forgetting (`MODERNBERT_PARITY_PLAN.md:149`). That report is absent from the run log (`grep "per epoch"` finds nothing).
- **Data mix of C100's 26,913 messages**, by id prefix and folder (my count on `cut_train.jsonl`):

  | source | messages | share |
  |---|---:|---:|
  | synthetic from the Rules' grammar: `synth_rules` 8,404, `synth_rules_ext` 2,783, `synth_rules_ops` 1,374, `synth_combo` 1,497 | 14,058 | 52% |
  | `sonnet_short` + `haiku_short` (LLM-written short commands) | 3,000 | 11% |
  | `nl_p1` + `nl_p2` (natural language) | 2,215 | 8.2% (4.5% of request rows, run log :653) |
  | LLM-written whole messages | the rest | |

  So the owner's rule of 2026-11-02 (synthetic short commands from the Rules' grammar) already supplies most of the data. What is missing is a
  handful of forms, not short commands in general.
- **The final list drops realistic short-command data.** F0 and C100 lack the folders of M2s and M2n: `opus_short_r2`, `ops_groups`,
  `ops_positions`, `opus_tgt_1/2`, `scenes_r3*` and `opus_r3_gaps`. They were dropped because M2s and M2n missed their `nl_a` bars (run log
  :330-331, :340-342), not because of the short sets.

### 3.2 Is anything in the recipe or data likely to limit the model, untested by the run log?

1. **Case: a cased tokenizer against lower-case names.** Observed; the largest effect I found.
   - The canvas names of short3 are Start, Process, Check and Done. Users type them in lower case, and three of the four are common English words.
   - On short3's test part, 133 of 432 requests write such a name in lower case. Split per request from the records
     (`$C/arms/{F0,SOP-F0}-s{0,1,2}/eval/rec_fs.jsonl`, command in section 7):

     | seed | lower-case name (133): ModernBERT F0 | lower-case name: SOP-BERT control | other (299): ModernBERT F0 | other: SOP-BERT control |
     |---|---:|---:|---:|---:|
     | 0 | 36.8% | 71.4% | 68.9% | 65.6% |
     | 1 | 36.8% | 77.4% | 72.9% | 68.6% |
     | 2 | 24.8% | 72.2% | 70.6% | 64.2% |

   - Of the 31 requests the control gets right and F0 gets wrong on all three seeds, 28 are of this kind: "copy check", "red for check",
     "start big", "done in gold", "check smaller", "group check and done".
   - SOP-BERT uses `distilbert-base-uncased` (run log :110), which lower-cases every word. ModernBERT keeps case, and its training names are
     mostly capitalised.
   - The same split across arms (seed 0; the shipped SOP-BERT from `$C/arms/baseline/sop.jsonl`):

     | reader | lower-case name (133) | other (299) |
     |---|---:|---:|
     | shipped SOP-BERT | 72.2% | 66.9% |
     | first ModernBERT | 23.3% | 26.8% |
     | M1 / M2s / F0 / C100 / W | 38.3 / 30.8 / 36.8 / 40.6 / 47.4% | 70.2 / 73.9 / 68.9 / 71.6 / 72.9% |
     | **M2n / M3 / M4** (M2n's folders) | **73.7 / 73.7 / 70.7%** | 75.3 / 75.9 / 73.9% |

   - From M2s to M2n the lower-case subset goes from 41 to 98 right; the other subset goes only from 221 to 225. So M2n's whole gain on
     short3 is this subset.
   - Leaving out the 16-18 records per arm marked as training-text overlap changes nothing in the lower-case subset: none of them holds such
     a request, so it stays at 133 requests with the same counts.
   - Which folder carries it: `opus_short_r2` has 90 messages on short3's own drawing (Start, Process, Check, Done) and 40 with a lower-case
     canvas name. `nl_p2` has 573 messages with lower-case names, but on other drawings, and C100, which trains on it, stays at 40.6% (my
     count over the folders' `names` and texts).
   - Inferred:
     - The model learned a capital letter as part of what a name looks like when the name is also a common word ("check", "start", "done",
       "process").
     - `opus_short_r2` may fix it only for those four names. They are the demo's start drawing too (`docs/js/start-diagram.js:15-31`),
       which matters in production, but whether the fix generalises to other canvases is unknown.
     - The synthetic sets (t1, r2) write every name capitalised, so they cannot show any of this.
2. **Values and forms the layout cannot hold.** Observed in `$C/arms/data/C100/reader.json`.
   - An empty label cannot be encoded (row 33).
   - Head value lists are built from the training values:
     - `outline` has no "gold": "make Striker's outline gold" loses the outline, 6 times in t1;
     - `desc:size` holds only small, large and tiny, so "the huge ellipses" cannot be read (1 of 14 right on t1);
     - `act_keys.undo` and `act_keys.redo` are empty, so the decoder never reads a count for them.
   - Some heads are closed vocabularies of training strings. `desc:label` has 105 values ("Advice only", "Close ticket", …) and `desc:anchor`
     has values such as "Late" and "Walken". A label written in a description that was not a training label cannot be read.
   - Effect on the scores: not measured.
3. **Over-training and forgetting: a hypothesis.**
   - Training loss is near 0 after 8 epochs, with no encoder dropout and no held-out stopping. Generalisation to natural language or to new
     phrasing may peak at an earlier epoch. Untested: the epoch checkpoints exist and were never read.
   - This is also the right first check for "dropout 0 against 0.1". Before a GPU run, see whether earlier epochs read `nl_a` and short3
     better; if no earlier epoch is better, a dropout run is less likely to help (inferred).
4. **Dropout 0 against SOP-BERT's 0.1: a hypothesis, untested.** ModernBERT ships with 0 dropout (its config above). I do not know whether
   0.1 helps this task. Run it only after point 3, with two seeds.
5. **Pooling: a hypothesis, untested.** The base model's config sets `"classifier_pooling": "mean"` (`encoder_config/config.json`), while the
   trainer uses the first token (`finetune_modernbert.py:177`, as DistilBERT does). This affects only the act and class heads, not tags or cut.
6. **BF16: not a limit.** The trainer reviewer measured logits within 0.147 and 3 of 40,000 class decisions flipping (run log :89). The
   export is FP32, and the confidence is fitted on the exported model's records.
7. **The cut head's share of the updates: a low-priority hypothesis.**
   - C100 makes 14,288 updates × 8 messages = 114,304 message reads over 26,913 messages, about 4.2 passes, against 8 passes over the request
     rows (computed from `complete.json` and the trainer).
   - But the cut loss falls to 0.0063 on training messages, as low as the request loss. Inferred: the cut head fits its data, and its failures
     on natural language are generalisation, not too few passes.
8. **One seed per arm makes small-set decisions at the gate noisy.** Observed in the score files:
   - On fresh2+short3 the cost score is stable across seeds (C100-s0 34.7, C100-s1 34.1), but what it executes is not: thresholds 0.9228 and
     0.9107; right at the gate 735 and 845.
   - On `nl_a` development at the gate, where about 10 of 392 requests are executed, a seed changes the result: W-s0 −2.3, W-s1 −19.6.
     The run log's W verdict shows the same (W-s1 minus C100-s1 −16.8 [−30.3, −5.7], W-s0 minus C100-s0 −1.5; run log :720).
   - The published s0 was chosen on one seed.
9. **Label conventions in conflict.** Observed (section 4): direction against position for "move X (to the) left", and undo counts. The
   run log already notes that a one-word identity was made a name in one adjudication batch and a label in others (run log :611).
10. **Export.** The receipt passes Python ONNX Runtime against Node on 41 of 41 fixtures. PyTorch against Node flips near ties (act 19/20,
    cuts 18/20, `passed: false` by its strict rule; status document §3.4). Because the confidence is fitted on the exported model, the gate is
    consistent with what runs. Not a limit I can measure.

### 3.3 Calibration design (observed unless marked)

- **The form of the confidence** (`docs/js/neural-confidence.js:120-160`):
  - a logistic model over 24 percentile-mapped signals, with a per-act prior table (`act_prior`) learned from the calibration pool;
  - L2 chosen from a grid by out-of-fold AUROC, the threshold by the out-of-fold cost-10 score;
  - folds by index % 5 over the pooled list (`MODERNBERT_RECAL_PLAN.md` §4).
- **`unk_share` carries nothing.** ModernBERT's BPE never produces an unknown piece: the signal is 0 on all 3,562 produced requests in C100's
  `rec_nl` and `rec_fs`, and its fitted weight is 0. ModernBERT therefore has no signal at all for "a word never seen in training", which
  AGENTS.md treats as a reason to ask.
- **What holds a bare short command is mostly not the reading.** I computed the pulls with `neural-confidence.js` `pulls()` on the published
  fit, for creates that were read right (scratch script `pulls.mjs`):
  - "add a circle" (short3) has confidence 0.825, held. Pulls: `n_roles` 0.83, `act_prior` 0.81, `n_units` 0.52.
  - Over 712 right two-role creates, the mean pulls are `act_prior` 0.81 and `n_units` 0.52.
  - So a one-role, one-request message loses about 1.35 logits to the role and unit counts on top of the create prior. The refit plan's cause
    analysis named only `act_prior`.
  - Inferred: these counts work as an unplanned message-kind input. In this pool, many-request messages are mostly fresh2, where the model is
    good, so short single commands are penalised.
- **The refit (F_short) changed the shape of the fit, not only its threshold.** Weights from `RC/short.confidence.json` against the published file:
  - L2 fell from 0.1 to 0.01, and pairs of correlated signals took large opposite weights: `act_margin` +13.3 against `act_negent` −9.8,
    `desc_margin_min` +9.0 against `desc_p_min` −6.1, `tag_margin_min` +4.6 against `tag_p_min` −6.1.
  - `act_prior(property)` fell from 0.85 to 0.44. Part of P2's gain is the fit now distrusting every property question, to hide the one form
    the model cannot read (outline questions).
  - Inferred, not tested: folds by index spread near-duplicate template messages (the same command with and without words around it) across
    folds. That makes the out-of-fold AUROC optimistic and favours weak regularisation; the recal plan itself warned of this (§4).
- **Two levels share one threshold.** In the published file, cost20's threshold equals cost10's (0.9228, `levels_out_of_fold`), so the Settings
  levels offer fewer distinct choices than they show.

---

## 4. Shortcomings (status document section 6): agree or disagree, with my own checks

I checked every short-command error class of 6.1 in C100's training data (`$C/arms/data/C100/train.jsonl`) and in C100's records on t1
(`$C/arms/C100-s0/recal/rec_ss.jsonl`, joined to `meta.form`). With every request executed, C100 reads 1,385 of t1's 1,793 requests right. 404
of the 408 misses fall in seven forms:

| form (t1 count) | what C100 reads (records) | in training | where the cause sits |
|---|---|---|---|
| outline question (69) | `property=color` 34, `shape` 17, `position` 15, `size` 3; never `outline` | 0 outline questions; the head has the value only from one equalize row | **data** (absent). The confidence lets 37 of them through under F_ctrl (`RC/summary.md`), so a data gap becomes confident mistakes |
| outline on a new shape (80; "add a purple square with a cyan outline") | colour and shape right, outline dropped (74 of 80; 5 other errors, 1 right) | 17 creates with an outline colour, all with **no fill colour** ("add a diamond with a magenta border") | **data**: the two-colour form is absent |
| outline on an existing shape (80) | 24 right; outline dropped, or navy→cyan, teal→cyan; "gold" impossible | 35 rows; outline values: red 7, cyan 6, … teal 1, gold 0 | **data**, through the head's value list |
| remove an arrow's label (78) | `label` act with from/to right, `label=""` missing (78 of 78) | 146 rows, all encoded as "no label" | **layout and converter**: `make_roles.py:451`. More data cannot fix it; the engine asks "What should the label say?" (`roles_roundtrip.py:37-38`), so it is held, not executed wrong |
| size in a description (67) | the size is dropped from the mention in 51 of the 56 wrong (the other 5 are counts); "huge" cannot be read | 24 described sizes (small 17, large 4, tiny 3) | **data**, through the head's value list |
| undo / redo with a count (28) | the count is dropped (28 of 28) | 6 rows labelled without a count; `act_keys.undo` and `.redo` are `[]` | **labels and data** |
| move (172) | 134 right; 29 read as `position=left/right`, 9 without a direction; every error is left/right, never up/down | see the next paragraphs | **data and a label convention**; the confidently wrong executions come from the **calibration** |

**"move X left" in detail (observed).**

- With the verb "move" and no number, C100's training rows label left/right as a position (`position=left/right`, not leftOf/rightOf)
  38 times. Examples: "Move Fridge to the far left", "move it to the right side of the canvas", "move the Lexer to the left".
- The same conditions give a direction only 17 times; the bare form "move X left/right" is 6 of them.
- The form "move X to the left/right" without a number is split: 11 direction against 5 position.
- The position head has the values "left" and "right" but no "up" or "down", which explains why only left/right fail.
- The Rules read "move Keeper to the left" and "move Keeper to the far left" as a direction, and "move Keeper to the left side" with neither
  (scratch `rules_probe.mjs`, output in section 7).
- short3's gold reads the verbless "start left" as a position (`opus_short_r2/README.md`: "where the conventions are silent the short3 gold was
  followed ... 'start left' -> move position=left").
- So the project has two conventions: the LLM annotations (position for "to the (far) left") and the Rules (direction). "move Fan3 left" is
  mislabelled only under the Rules' convention.

**Agree or disagree, by subsection.**

- **6.1**: I agree with the forms, with the corrections in the table above (label removal is a layout limit; move is not "nearly all with a
  distance"). Two things are missing:
  - The lower-case-name failure on short3 (section 3.2, point 1) is ModernBERT's largest short-command shortcoming in measured requests. It
    is absent from section 6.
  - On short3 at the gate, C100 does 53 of 432 requests right (cost 0.7); SOP-BERT does 53 (−3.9). On realistic short commands every learned
    tab mostly asks (score files).
- **6.2**: I agree that a pooled fit moves risk onto natural language. I disagree that `act_prior` is the main holder of bare commands: the
  role and unit counts pull as much or more (section 3.3). The cross-validation and the dead `unk_share` are design issues the document does not list.
- **6.3**: I agree. The curve, W and the wrong-value split support "not more of the same". I cannot check the inferred "needs more capacity
  or another method"; the evidence fits label noise and missing drawing input just as well (`QWEN3_FINETUNE_RUNLOG.md:634-641`).
- **6.4**: I agree, with one caveat: the 537 ms and the ~2 GB renderer memory were measured on the first experiment's model (same graph size)
  and on one page load. Not re-measured for C100.
- **6.5 and 6.6**: I agree. Checked: the Settings table, the plan's status line, and the spell checker's "alright" count (68, row 39).
  Not checked: the manifest failure "Export source changed".

---

## 5. Recommendations

Cost estimates use these measured figures: a C100-sized arm trains in 2,110 s, about 35 min (`complete.json`); evaluation is about 25 min of
CPU per arm (run log :108). Times for larger lists are **estimates**: C100's 2,110 s scaled by the number of request rows. A data or label
change leaves the browser download (155.9 MB) and latency unchanged, because a new class value adds 768 weights. Every bar below is a
proposal to pre-register, not something I ran.

### 5.1 The document's recommendations

**R1. Measure ModernBERT on bare short commands beside VSS-BERT.**
- **Agree** with the measurement. **Disagree** with adding it to `VSSBERT_SHORT_COMMANDS_PLAN.md`. That plan is mid-run: S6 under review, S7
  not run (`reports/evidence/vssbert-short-commands/README.md`), and it says "Modify: none" (§10). Adding a reader to a pre-registered
  measurement changes it.
- **How instead:** a separate small plan after its S7, reusing the bare views and `collect_set.mjs` / `score_arm.mjs`.
- **Cost:** CPU only, about 25 min (estimate, from the run log's evaluation time).
- **Measure:** C100 against SOP-BERT and VSS-BERT on the same views, each at its own gate. Paired cost difference with `pairedInterval`, the
  unit a message; every request executed per form; the short3 test part split by lower-case names.
- **Bars:** none to pass. It is a baseline, reported with the confidently wrong share and its Wilson interval.

**R2. Retrain C100's recipe with `synth_short_r2`.**
- **Agree in part.** The data is the lever for outline questions, two-colour outline creates, outline values and sizes in descriptions.
- **Disagree on five points:**
  1. It cannot fix label removal (the layout, row 33).
  2. It does not touch the lower-case-name gap (r2 writes every name capitalised).
  3. Undo counts need the 6 rows relabelled as well as data.
  4. The move convention must be chosen first, or the data trains two conventions against each other.
  5. **t1 cannot decide it.** 421 of t1's 1,793 request spans (239 distinct) equal a span of r2, and training rows are request spans.
     Shared spans by form: create 134/166, undo 37/37, redo 38/38, undo counts 21/28, layout operations 27/27. The failing forms share
     almost none (outline 3 of 229, size 3/67, move 24/172). t1 was also read once by the refit. 132 of t1's spans also equal a request
     text C100 already trains on. (Observed; command in section 7.)
- **Closest prior result:** `TRAIN_PLAN_R2.md` "Result" added `opus_short_r2` and `synth_short_r2` to SOP-BERT and VSS on 2026-11-03.
  It was not adopted: losses at the gate on fresh2, "mostly from the confidences fitted on the R2 readers", while the readings barely moved.
  Measure the reading per form separately from the gate.
- **Expected effect** (inferred): the four data forms rise from 0-30% toward the 95%+ of the forms already covered. Label removal stays at 0.
- **Cost:** one GPU run (estimate: 2,110 s × 59,132 / 57,135 rows, about 36 min), export, 25 min CPU.
- **Deciding set, two options:**
  - cheaper, for the per-form bars: t1 without the 421 requests whose span occurs in r2. The failing forms keep almost all their rows
    (outline 226 of 229, size 64 of 67, move 148 of 172). t1 was read once by the refit, but nothing was chosen on it;
  - for any whole-set bar: a fresh set from `gen_short_r2.py` with a new seed, deduplicated by span against r2, t1 and the training data
    (`dedup_against.py` works on texts today and needs a span mode), then `check_file.py --mode rules`.
- **Risks:** fitting the generator; a pooled calibration again; trained-in conflicts if R-new-2 is skipped.
- **Bars** (on the deciding set, every request executed, per form, n ≥ 40 per form):
  - outline question ≥ 90%; outline create ≥ 90%; outline set ≥ 90%; size in a description ≥ 80%; undo count ≥ 90% after the relabel;
    move ≥ 95%;
  - no loss on short3 test or fresh2 test, every request executed: paired cost interval not entirely below 0, point loss ≥ −5;
  - `nl_a` development as R3 below.

**R3. Recalibrate after R2.**
- **Agree**, with design changes that are calibration rules (they need no new model):
  - folds grouped by template, meaning the gold span lower-cased (as `compare_fits.mjs` already groups for its interval);
  - drop `unk_share`;
  - an L2 grid that stops at 0.1, or a selection by out-of-fold cost score instead of AUROC. Choose one before any result.
- Per-kind thresholds or a weighted pool are knobs unless fixed beforehand (agree with the document). My preferred option is in R-new-4.
- **Expected effect** (inferred): fewer bare commands held by the role and unit counts, and a fit whose out-of-fold numbers are not
  flattered by near-duplicates, which matters most when the pool holds template sets.
- **Risk:** a fit with fewer near-duplicate folds may choose a higher threshold and execute less. The pool's mix still moves risk between
  kinds, which is why the `nl_a` guard stays.
- **Cost:** CPU, minutes per fit, plus one collection.
- **Bars:** P1-P3 and G1-G3 as in `MODERNBERT_RECAL_PLAN.md` §5, on the new deduplicated set. Add per-form held-right on creates. Add a
  guard on short3's lower-case-name subset: confident mistakes not above the control's + 1 per 100 requested.

**R4. Natural language: not more of the same.**
- **Agree.** Teacher "distillation" without logits is more labelled text, which the curve measured at +0.1 point per doubling
  (`curve_summary.json`), so I would not call it a different lever. A large model in the loop for held requests is a pipeline change for the owner.
- Effect, cost and bars do not apply: R4 is a decision not to run more training of this kind, not a run.

**R5. Housekeeping.**
- **Agree.** Cheapest first:
  - make `calibrate_arm.mjs` write `heldout_oof_*`, or make `ui.js` read `levels_out_of_fold` (reader code, so run `regress.sh`);
  - the parity plan's status line;
  - removing the unread first-experiment folder (156 MB served by Pages), which is the owner's call;
  - generalising the canonical export, or documenting the arm export as the standard;
  - the spell checker, with its own regression run.
- **Effect:** the Settings table shows the levels it promises; the repository stops serving 156 MB nobody reads. The spell checker fix
  changes what every reader sees: "alright" stops becoming the direction word "right".
- **Cost:** each item is under an hour of code or documents, except the canonical export chain, which is a day or more (estimate).
- **Risk:** the spell checker and `ui.js` changes are reader code. They can move every reader's numbers, so each needs its own `regress.sh` table.
- **Measure:** for the spell checker, `regress.sh` before and after, plus the 70 changed t1 texts read raw and corrected, as the VSS-BERT plan's
  `t1raw` view does. For the Settings table, a page check that the levels show numbers.

### 5.2 What I would add, ranked by expected value per cost

**R-new-1. Put back the realistic folders C100 dropped, and check that the case fix generalises.**
- **Measured.** Arms with M2n's folders (`opus_short_r2`, `ops_groups`, `ops_positions`, `opus_tgt_1/2`) compare with C100 as follows
  (score files and the split in section 3.2, point 1):

  | measure | M2n / M3 | C100 |
  |---|---|---|
  | short3, every request executed | 74.8% / 75.2% | 62.0% |
  | same, without training-text overlap | 306 of 414 | 253 of 416 |
  | short3's lower-case-name requests | 73.7% | 40.6% |
  | short3 cost at the gate | 9.5 / 5.1 | 0.7 |

  scenes_test also rises (83.4% against 66.3%). But M2s's list holds 5 of scenes_test's steps exactly (run log :253), and `scenes_r3b` was
  shaped on scenes_test (`MODERNBERT_PARITY_PLAN.md` §4), so that row overstates the gain and is not evidence here.
- These are realistic LLM-written folders, the base AGENTS.md wants. M2s and M2n each missed their `nl_a` bar (run log :330-331), which is
  why the final list dropped them. The case gain comes with M2n's folders: M2s alone reads the lower-case subset at 30.8%.
- **The arm:** C100's list plus M2s's and M2n's folders (the list M2n and M3 were measured on), nothing else changed.
- **The deciding set is a lower-case view of other drawings.** short3 is where the hypothesis came from, and M2n and M3 already show the
  result there. `opus_short_r2` shares short3's drawing and was written from failure analyses of the forms readers miss (its README).
  - The view: an existing test part on other drawings, for example fresh2 test, with every canvas name written in lower case. Report it
    split by names that are also common English words, since that is where the failure sits.
  - It is a scratch view, collected and scored on CPU.
- **If that view shows the fix does not reach other names**, the next step is one of:
  - labelled mechanical variants of training rows with names lower-cased consistently (a secondary, named folder, as AGENTS.md allows for
    mechanical variants);
  - a mechanical front-end step that writes a word in its name's case when the drawing has that name. It must be listed in
    `VSS_READER_SPEC.md` and measured. Risk: "check", "start", "process" and "done" are also verbs, so the step can create false names.
- **Expected effect** (inferred from M2n and M3): short3 every request executed from about 62% to about 75%, past SOP-BERT's 68.5%.
  Whether names on other drawings gain is unknown; that is what the deciding view measures.
- **Risk:** the gain may be specific to Start, Process, Check and Done. M2s and M2n missed their `nl_a` bars, so natural language is not
  expected to gain.
- **Cost:** one GPU run (estimate: 2,110 s × 63,114 / 57,135 rows, about 39 min) plus 25 min CPU, plus about 15 min CPU for the view
  (estimate).
- **Bars:**
  - deciding: the lower-case view on other drawings, every request executed, paired against C100, interval above 0, on the common-word
    names and on all names;
  - replication, must not lose: short3 test every request executed, paired against C100, interval not entirely below 0;
  - fresh2 test: no loss (interval not entirely below 0, point loss ≥ −5 at the gate);
  - `nl_a` development: the guard of R3.

**R-new-2. Decide the conventions, then relabel, before any new data.**
- Three conventions need a decision:
  - "move X to the (far) left/right" and "X left" (position or direction);
  - undo/redo counts;
  - a one-word identity as name or label.
- Write each as one row of the conventions file, then fix the conflicting rows with an overlay, as `LABEL_FIXES_L2.jsonl` did.
- **Effect** (inferred): it removes the 38 against 17 split that pulls "move X left/right" toward a position. Combined with data, it
  should bring the move form near the 95%+ of set and connect; alone, without data, the bare form stays rare.
- **Risk:** choosing the Rules' convention for "to the far left" (a direction) may be less faithful to what people mean (the left edge). A
  relabel can also shift `nl_a`, whose gold follows the annotation conventions.
- **Cost:** the owner's decision plus a small relabel job (CPU), with the round trip and `regress.sh`.
- **Bars:** the round-trip gate unchanged; the relabelled rows listed and counted before training; the measured effect comes with the next
  trained arm (R-new-3), not alone.

**R-new-3. Then R2, `synth_short_r2`, on the R-new-1 list after R-new-2's relabel, with the bars of R2.** One change per arm: R-new-1,
then R2 on top. Each is measured against the arm before it.

**R-new-4. Give the confidence data-derived novelty signals.**
- Two signals: the share of a request's words that never occur in the training rows, and whether its trigger word occurs with the predicted
  act in training (`trigger_inventory.json` exists).
- They are counted from the training data, not written by hand, so they are mechanical steps to list and measure. Inferred: they would let
  the fit separate literal commands from natural messages without a hand-written rule, and replace the dead `unk_share`.
- **Effect** (inferred): natural-language requests with unseen words get lower confidence without lowering literal commands, which is what
  the refit could not do with word counts alone.
- **Risk:** the signals depend on the training data, so they change with every retrain and must be recomputed with the model. Short sets
  share most words with training, so the signals may separate little within them.
- **Cost:** CPU (code in `neural-confidence.js`, `calibrate_arm.mjs` and the collector; `regress.sh`); no GPU.
- **Bars:** as R3, plus the out-of-fold AUROC on a grouped-fold fit not below the published 0.940 − 0.01.

**R-new-5. An epoch sweep from the existing checkpoints (CPU).**
- Export `epoch_4.pt` … `epoch_8.pt` of C100-s0. Read `nl_a` calibration, short3 calibration and the fresh2 calibration part, every request
  executed. This answers the forgetting question the plan promised.
- **Effect:** it measures whether 8 epochs cost reading of new phrasing. If an earlier epoch reads `nl_a` or short3 better, the recipe has
  room; if not, dropout and epoch arms are unlikely to help (inferred).
- **Risk:** choosing an epoch is a knob; the rule below fixes it. Not checked: whether `arm_export.py` accepts an `epoch_N.pt` file without
  `complete.json`. The trainer's docstring says `arm_export` refuses a run marked `full_schedule: false` unless told otherwise
  (`finetune_modernbert_batched.py:16`), so the export step may need a small change.
- **Cost:** 5 exports plus 5 collections, a few CPU hours (estimate).
- **Rule to fix beforehand:** pick the epoch only on calibration parts; adopt nothing unless a later declared arm confirms it on test parts.
  Only if an earlier epoch reads better, a dropout 0.1 arm follows (two seeds).

**R-new-6. Two seeds for anything decided at the gate on a small set.**
- Or decide on every-request-executed measures, with the gate reported.
- **Evidence:** on `nl_a` development at the gate, W's two seeds gave −2.3 and −19.6 (section 3.2, point 8). On fresh2+short3 the cost score
  was stable across C100's seeds.
- **Effect:** fewer verdicts that flip with the seed.
- **Cost:** one more GPU run per arm (about 35 min) and 25 min CPU.

**R-new-7. Layout for removing a label and similar.**
- A class value meaning "an empty label", built from the data like L2's `implied:scale`. It needs the owner's approval (AGENTS.md) and one GPU run.
- **Effect:** "remove the label of the arrow from A to B" becomes readable (0 of 78 today).
- **Lowest value:** today these requests are held by the engine, never executed wrong.
- **Risk:** a new head value can fire on other label requests ("label the arrow …") and execute an empty label where a text was meant.
  That would be a confident mistake where today there is a question.
- **Bars:** label removal on the deciding short set ≥ 90% every request executed; label setting not lower than before (paired, interval not
  entirely below 0); confidently wrong share on label requests not above the control's.

**What I would not do, and why:**
- **More natural-language rounds or reweighting:** +0.1 per doubling, and W missed (run log :715).
- **A larger encoder.** Its size and latency were not measured here. It would raise both, and the evidence points at data, labels, layout
  and case, not capacity, for short commands (inferred).
- **ModernBERT in VSS-BERT or the chat now:** it is worse on short3's lower-case names and costs 7.6 times the time. Replacing SOP-BERT inside
  VSS-BERT is a pipeline change for the owner, worth measuring offline only after R-new-1.
- **Lower-casing all of ModernBERT's input:** it removes the capital-letter cue for names. Untested, and worse in expectation than R-new-1,
  which already has a measured fix.
- **A decoder that writes SOP text:** already rejected by the plan (§8), for good reasons.

---

## 6. Answers to the open questions (status document section 8)

**Is the short-command data the main lever, or are the misses partly label conventions?**
- Both, and it differs per form (section 4 table):
  - data alone: outline questions, two-colour creates, sizes in descriptions;
  - data and labels: undo counts (6 rows conflict);
  - layout: label removal (no data helps);
  - data and a real convention conflict: move left/right. 38 no-number rows label "move … left/right" as a position, and the Rules read the
    same wordings as a direction.
- A data step on top of the conflict would partly paper over it: the model would learn "bare 'move X left' = direction" from the generator,
  while short3's gold keeps "start left" = position.
- Decide the convention first (R-new-2). Note also that the largest short3 gap, lower-case names, is case. Realistic short commands written
  on short3's drawing closed it in M2n, M3 and M4, so it too is a data lever, but a different set from `synth_short_r2` (R-new-1).

**Should a learned reader's confidence know the message kind, and how without a hand-written rule?**
- It already does, by accident. The role count, request count, word count and the per-act prior encode the calibration pool's mix, and in
  this pool that penalises short single commands (section 3.3).
- I would not add a hand-set kind rule. I would:
  1. group folds by template, so near-duplicates stop flattering weak regularisation;
  2. add novelty signals counted from the training data (R-new-4), which separate literal commands from natural language by statistics of
     the data, not by a written list;
  3. fix the pool's composition before any result.
- A threshold per kind by a mechanical rule (one request, at most N words) is allowed only if N is fixed beforehand and listed as a
  mechanical step. It is a cruder version of point 2.

**Is the browser cost justified, if ModernBERT ties SOP-BERT on `nl_b` and beats it on the older sets and on `nl_a` at the threshold?**
- Not now. Two of the premises do not hold as stated; the third does:
  - The `nl_a` advantage at the threshold is +5.6 [−0.3, +16.8] (row 29), not established.
  - The fresh2 advantage is real (+13.9 [+6.7, +20.1] at the threshold, `PB/arms/C100-s0/summary.txt`).
  - On short3, the owner's production priority, ModernBERT is worse than SOP-BERT with every request executed (row 29), and the two tie at
    their gates.
- It costs 2.2 times the size and 7.6 times the time of SOP-BERT (`reports/diagram-e2e-five.md:163-166`).
- Keep it as an experimental tab. Ask again after R-new-1, R-new-2 and R-new-3, on a fresh short set and on short3 at the gates.

**Are the bars of the two plans right, and is the refit's miss a reason to change the calibration design rather than the data?**
- **The refit's bars were sound and pre-registered.** G3 is tight: with 8 against 14 executions on 392 requests, "point loss ≥ −5" is about
  two extra confident mistakes. The plan said so (§5), and the miss stands.
- **The miss is a reason to change both.**
  - Its root causes are the refit's new score function (calibration; corrected in section 8: not the lower threshold) and placement wording
    read as a move (model and data, `RC/root_causes.md`).
  - The refit also shows design flaws the data cannot fix: L2 0.01 with large opposite weights, and the property prior collapsing to hide one form.
  - Change the design (R3, R-new-4) and the data (R-new-1 to 3), each with its own bar.
- **The VSS-BERT plan's bars are reasonable as written.** I would report its short3 view split by lower-case names, without changing a bar,
  and add nothing to it mid-run.

**Anything in the recipe worth a controlled check?**
In order: the epoch sweep from the existing checkpoints (R-new-5, CPU); then dropout 0.1 against 0 (two seeds) if the sweep shows an earlier
peak; then mean pooling against first-token pooling (one run); two seeds for any arm decided at the gate. BF16 is not worth a run (row 6 of
section 3.2). The cut head's share is low priority, because the cut fits its training data.

---

## 7. What I could not check, and what I would check next

**Not checked:**
- the browser: no page opened, so the Settings dashes and the 2 GB memory are code reading and the document's report only;
- whether the first experiment's manifest fails at HEAD;
- the m5 JSON files (rows 12 and 29 read the run log and the arm score files);
- the M3 and M4 root-cause files;
- every number in the parity plan's earlier sections;
- the lower-case guard of R-new-1 on other drawings (it needs a model run, which the prompt excludes);
- which of M2n's five folders carries the case gain (only one arm added all five at once).

The lower-case split uses a simple word match: a canvas name of the default drawing, or of the message, written in lower case inside the
request's span. It is observed but rough.

**Next, in order:**
1. C100 on a lower-case view of fresh2 test (CPU; the baseline for R-new-1's guard);
2. a span-deduplicated fresh short set;
3. the convention decision;
4. the epoch sweep.

**What I ran (all read-only; nothing written in the repository except this file):**

- **Python, run with `python3 -I`, reading `$C/` and the repository:**
  - per-arm score tables from `$C/arms/*/eval/cal-fresh2-short3-nl_a.score.json`;
  - C100 `train.jsonl` counts: move rows by wording and label, outline rows, empty labels, undo counts, creates by first verb;
  - t1 records per form from `$C/arms/C100-s0/recal/rec_ss.jsonl`;
  - the t1 / r2 span overlap (spans lower-cased, spaces collapsed);
  - the short3 split per request of F0 against SOP-F0, seeds 0-2, and the lower-case split across arms (`rec_fs.jsonl` of each arm,
    `$C/arms/baseline/{sop,modernbert}.jsonl`);
  - lower-case canvas names per training folder (`names` against the text).
- **Two node scripts in the session scratchpad, outside the repository:**
  - `rules_probe.mjs` loads `docs/js/logic.js` and prints the Rules' reading of probe texts. Output: "move Keeper left" and "move Keeper to the
    left" → direction left; "move Keeper to the far left" → direction left; "move Keeper to the left side" → move with neither; "what is the
    border of Keeper" → property outline; "remove the label of the arrow from Keeper to Goal" → label "".
  - `pulls.mjs` imports `docs/js/neural-confidence.js` and prints `confidence()` and `pulls()` for chosen records under
    `docs/model/confidence/modernbert-c100.json`.
- **Other read-only commands:** `git status`, `ls`, `grep`, `sed`, `wc`.

---

## 8. Addendum after reading the Codex review (same day)

I read `reports/modernbert-review-codex-2026-11-08_codex.md` after finishing sections 1-7 and reran the checks below (read-only).

**A correction to this report.** The refit's loss on `nl_a` and its gain on t1 both come from its new score function, not from the lower
threshold. I reran Codex's replay (`itemsOf`, `confidence`, `stats` on the cached records):

| set | published scores, published threshold | published scores, refit threshold | refit scores, published threshold | refit scores, refit threshold |
|---|---|---|---|---|
| `nl_a` development: right / wrong+extras | 7 / 1 | 10 / 1 | 8 / 2 | 10 / 4 |
| t1: right / wrong+extras | 556 / 39 | 685 / 83 | 675 / 7 | 786 / 8 |
| short3 test: right / wrong+extras | 53 / 5 | 83 / 6 | 75 / 6 | 91 / 6 |

Section 6 said "the pooled threshold"; it now says the score function.

**Codex findings I checked and accept:**
- Neither SOP-BERT nor ModernBERT has a `none` act (`reader.acts` of both published configs; `make_roles.py --none-rows` is "comparison
  only"). A false cut cannot be rejected by the act head.
- The calibration fit weighs produced requests, not messages. In the refit the short sets are 896 of 2,004 fitted rows (44.7%), not 63%
  (`RC/summary.md` "produced"; the confidence file's `by_set`).

**Codex findings I did not rerun:**
- The 10 `nl_a` calibration sessions and 19 paraphrase groups split across folds.
- The 9 omitted natural-language messages.
- The `ROLE_TOO_RICH=context` risk that an unrelated last shape fills an explicit compound target (inferred).

**Where I still differ:**
- Codex calls t1 usable for deciding an r2 retrain. It shares 421 request spans with r2 (section 5.1, R2).
- Codex does not report the lower-case-name gap on short3 (section 3.2, point 1), which is the largest measured short-command difference
  between ModernBERT and SOP-BERT.

**One more measurement: agreement with the Rules as a gate.** Executing only the requests where a learned reader's reading equals the
Rules' reading exactly (cached records; per gold request; extras that match a Rules extra counted as wrong):

| reader | short3 test: agree → right / wrong; cost | fresh2 test: same | `nl_a` development: same |
|---|---|---|---|
| C100-s0 | 183 / 12; +14.6 | 691 / 28; +31.3 | 15 / 15; −34.4 |
| C100-s1 | 184 / 7; +26.4 | 694 / 29; +30.8 | 13 / 13; −29.8 |
| shipped SOP-BERT | 195 / 11; +19.7 | 675 / 32; +27.0 | 14 / 12; −27.0 |

Agreement is a strong signal on short commands. For comparison, C100's own gate gives +0.7 on short3 and +45.8 on fresh2. But agreement is
a coin toss on natural language, so it is no gate on its own. As a fitted confidence input it would be a new input to a learned reader's
gate, which is the owner's decision (the VSS and SOP-BERT tabs already use the Rules' vote; VSS-BERT does not).
