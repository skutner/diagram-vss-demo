# ModernBERT plan: detect what people mean from natural language, as well as Claude Opus 5.5 and gpt-6.1-sol

Date 2026-11-05. Base commit `f57a9c3`. Machine: apparatus, RTX 3060 Laptop GPU, 6 GiB (`GPU-905b8484-3b1e-30f6-defd-05d44f00f692`).
Status: proposed. Nothing in this plan has been trained or committed. The first ModernBERT experiment stays frozen with its negative result (`reports/modernbert.md`); this is a new, separately declared experiment, and the published model and its confidence file stay as they are until an arm is adopted.

**The goal (owner, 2026-11-05):** "modernBERT shouldn't only be optimized for those examples in the repo but instead it should detect user's intentions from natural language."

Review state: an earlier version centred on the built-in examples went through two rounds at Opus 5.5, max effort. The measuring tools, M1, L1, L2's labels and sections 3, 7 and 8 were covered by them. The natural-language test design (sections 2 and 4) and the rewritten arms M2, M3 and M5 were not.
Every number comes from a command in section 11 or a document it names; "estimate" marks what was not measured.

## 1. The short answer

A person writes or dictates a message in their own words. ModernBERT works out what they want, in the legend's terms, does it when it is sure, and asks otherwise. It does this on messages it has never seen, in forms nobody planned for. The repo's 48 examples are one check among others, and nothing is chosen on them.

The first ModernBERT did not learn its own training data, so more data is not the first step. In order:

1. **Train it properly (M1).** The same data as the first run, the recipe SOP-BERT was trained with, on this GPU. About 30 minutes (estimate), against 77 minutes for the first run's one epoch. Measured on natural-language sets. No new data.
2. **Fix two known label gaps, one arm each (L1, L2).** Number words are read from a noisy table. 307 training rows say "shrink" with no scale, and the engine's resize with no scale makes the shape bigger.
3. **Use the annotated data the repo already has (M2s, M2n).** 797 scene turns and about 2,700 natural messages that no ModernBERT has trained on.
4. **Generate new data only if the learning curve says it helps (M3).** Broad natural language, in the forms real people use, not more examples: whole messages, paraphrases, dictation, complaints with the wanted command in them.
5. **Give the model the drawing (M4).** A reader that sees only the message cannot know that "the snowflakes" are eight tiny white stars. This is a new input and needs the owner's approval.
6. **Final test on messages nothing has seen, from a new writer and from real people (M5).** Export, browser check.

SOP-BERT is trained on the same data in each data arm as the control, so the plan also answers whether ModernBERT is worth its cost in the browser.

**The gap that matters is between LLM-written and real messages, and the repo has almost no real ones:** 26 messages from one session (section 2). LLM-written data can only go so far, so the plan asks for more real messages (D8). The demo already collects them.

What it will not do: reach the teachers' number, or understand what the legend cannot express. It should do what it is sure of and ask about the rest (AGENTS.md).

**Found on the way, in the shipped reader:** SOP-BERT makes shapes bigger when told to shrink them. Of the 7 example turns where Opus shrinks a shape, by what the engine draws (`shrink_check.txt`), SOP-BERT grows a shape on 5 ("the moon looks too big, shrink it" -> `action=resize target=Moon`, which the engine runs as x1.5; on one of the 5 they are the wrong shapes), shrinks the right one on none, and names a shape that is not there on 2. The Rules shrink the right one on 4, shrink others on 1 and ask on 2. The first ModernBERT grows a shape on 2 and changes no size on 5. Cause in section 3.

## 2. What "detects the intention" means, measured

**Scope, stated as an assumption:** an intention the legend can express, however it is worded: indirect ("this looks cramped"), verbless ("Tank: blue rectangle"), a complaint with the wish inside ("I didn't say circle, I meant square"). A message the legend cannot express gets the honest answer of AGENTS.md (it says what it did not understand). ModernBERT reads English; the voice path translates to English first.

**Where the readers stand on natural language** (read from the documents named, not re-run):

| set | requests | every request executed | at its threshold |
|---|---:|---|---|
| **The owner's real session**, as sent (`collected_1`, `SESSION_1_ANALYSIS.md`) | 22 | Rules 14% right, 32% wrong, 55% not done, 9 extras; SOP-BERT 14%, 36%, 50%, 17 extras | VSS-BERT executes 1 request, and it is wrong: it deletes a shape nobody meant |
| The same, in corrected English | 22 | Rules 23%, 36%, 41%, 12 extras; SOP-BERT 32%, 32%, 36%, 14 extras | the same one wrong |
| fresh2 test part, a writer the readers had not learned from (`FRESH2_RESULT.md`, `TRAIN_PLAN_R3.md` A.2, `future_improvements_ideas.md`) | 1,313 | Rules 55.5%, 19.0%, 25.4%, 290 extras; SOP-BERT 80.8% right | SOP-BERT 57.3% right, 3.6% wrong, cost score 35.9; VSS-BERT 48.5%, 1.2%, 42.4 |
| fresh2 + short3 test part (`reports/modernbert.md`) | 1,745 | first ModernBERT 693 right = 39.7%, 948 wrong, 237 extras | first ModernBERT 16 right = 0.92%, 0 wrong |

SOP-BERT reads 80.8% of a new LLM writer's requests and 14-32% of a real person's. That session is small: one person, 22 actions, partly garbled by speech and translation, and 7 of the 22 needed legend forms that did not exist then. It is still the best evidence there is of what real language looks like, and its causes are concrete: "make me a yellow triangle" read as `set` by every reader, "place all the elements in the form of a circle", a name dictated as words ("Diamond One"), a text reached by its words ("delete Order Flow").

**The measures:**

1. **The main metric, AGENTS.md's**: per requested action, right / wrong / not done, extras; the confidently-wrong rate; the cost score (one confident mistake costs 10 right answers) at a threshold chosen on calibration data, with the AUROC of the confidence. The direction of a resize counts as a value (section 5, M0).
2. **Against the teachers.** On the new test sets both LLMs write what they would do with each message. A reading is right if it matches either of them, and where they disagree, asking is what the reader should do. Their agreement per requested action is the ceiling for that set. **It has not been measured on long or real messages yet**, and it will be lower than on the examples.
3. **Generalization, reported for every set**, because this is what separates reading language from recognizing forms:
   - requests whose trigger word never occurs in training (AGENTS.md), against those whose trigger does. First ModernBERT at its gate: 1 of 185 unseen, 15 of 1,560 seen;
   - domains and writers not in training;
   - by kind: long messages, short commands, dictated and translated text, typos, self-corrections, indirect requests, references to the drawing.
4. **Paraphrase consistency (new).** One intention written many ways on the same drawing: the share of wordings read with the same effect. A reader that recognizes forms fails this while scoring well elsewhere.
5. **Nothing to do (new).** Messages with no request, or outside the legend: actions executed per 100 such messages. It should be close to 0 at the gate.
6. **Step-by-step sessions, each on its own drawing**, a mistake carrying forward: what the owner sees when drawing something over many turns.

**A check, not a target: the built-in examples.** They are how the measuring tool was built and tested, so they have numbers now. Every request executed, the Opus drawing before each turn, right = the same drawing and answers as the Opus or the GPT program. A name counts when the message writes it, and shapes already there are also compared by z-order and by whether and which way they moved or were resized. `test_parity_lib.mjs` checks that readers broken on purpose are rejected (reversed moves 0 of 30 accepted, names removed 0 of 422), and an Opus program matches itself on all 1,139 turns.

| set | turns | Opus vs GPT | writes nothing | Rules | SOP-BERT | ModernBERT |
|---|---:|---:|---:|---:|---:|---:|
| all, loose (60 px, size ratio 1.30) | 1,139 | 98.2% | 5.5% | 59.3% | 66.5% | 30.1% |
| all, strict (exact positions and sizes) | 1,139 | 93.9% | 5.5% | 57.8% | 63.4% | 29.7% |
| 4 test scenes, loose | 170 | 97.6% | 5.9% | 57.1% | 66.5% | 31.8% |
| 11 scenarios + 13 quick, loose | 152 | 100% | 0% | 99.3% | 96.7% | 30.3% |
| 20 other scenes, loose | 817 | 97.9% | 6.5% | 52.3% | 61.0% | 29.7% |

Loose never accepts a neighbouring size word but does accept "shrink" as 0.67 or 0.8, and it does not see a lost gap on a new shape (with `distance` removed from the Opus creates, 53 of 56 such turns still pass loose, 5 strict); the main metric compares `distance`. These are per-turn numbers, because the teachers' programs have no spans to pair requests with. The teachers' number is after their engine-checked repairs (80 GPT turns, 9 Opus). These messages are short (8 words median) and mostly plain, so **98.2% says that two LLMs read plain commands alike, not that language is this easy.**

Each on its own drawing, over the 24 scenes:

| | same final drawing, of 24 scenes | in the final drawing the same, mean over the scenes: shapes, arrows, groups |
|---|---:|---:|
| Opus vs GPT | 15 | 95.4%, 98.2%, 100% |
| Rules | 0 | 12.1%, 7.2%, 8.3% |
| SOP-BERT | 0 | 19.5%, 26.6%, 18.3% |
| SOP-BERT at its gate | 0 | 1.9%, 0%, 0% |
| ModernBERT | 0 | 0.5%, 17.6%, 19.4% |
| writes nothing | 0 | 0%, 0%, 0% |

What the Opus programs needed, as a first picture of references: of 1,139 turns, **119 (10.4%) need the drawing or the earlier messages** (a name in 34 turns or a description in 86 that the message does not write); SOP-BERT reads 28.6% of those, and writes-nothing 2.5%.

## 3. Why the first ModernBERT failed

**Observed:**

| check | result |
|---|---|
| The checkpoint on 1,000 of **its own training rows**, rows with a value | act 98.8%, word tags 99.7%; **colour 13.9%, shape 25.8%, size 26.8%, style 16.7%, direction 5.9%, description colour 0%**. The class heads often say "none" |
| The same on held-out fresh2 + short3 (paired proposals) | wrong: colour 84.6%, shape 85.1%, size 76.5%, style 76.9%; but target 23.3%, from 15.7%, anchor 13.4%, name 6.6% |
| Overfit test: 200 rows from the base weights, batch 16 | all class heads 396 of 396 right after 400 updates (about 20 s), at lr 3e-5 and at 6e-5. With a head learning rate of 6e-4: 385 of 396 after 200 updates |
| Training loss of the first run | request loss 0.156 in the ninth tenth of the epoch, 0.147 in the last: still falling when the run stopped |
| Its regime against SOP-BERT's | 3,412 updates at lr 3e-5 against about 13,600 at 6e-5 (8 epochs, batch 32) on the same rows |

**Inferred:** the failure is underfitting, not a bug and not missing data. The heads can fit (overfit test), the word tags already read well, and the value heads did not reach their own training rows. Unknown until M1: how far the same recipe carries on text it has not seen.

**Two label gaps, in every learned reader's data** (observed): all 959 `resize` rows of the first run's data have no `scale`, and 307 of them say smaller ("Shrink Scene1"). The span head can only tag a number that is written, and the engine's resize with no scale is x1.5, so a reader that learned these rows writes a resize that grows the shape (section 1). And `make_roles.py`'s number words are noisy ("lights" -> 2; `ROOT_CAUSES.md`) and miss spelled gaps.

**What real language adds** (`SESSION_1_ANALYSIS.md`, 26 messages, first cause): a form the readers never saw 9, speech recognition 5, translation 3, an ambiguous request or a fragment read as an action 3, a bad cut 1, an engine gap 1, nothing wrong 4. So reading better is not all of it: 8 of 26 are garbled before any reader sees them. Those are reported apart (the corrected-English column), not trained away.

## 4. The test sets and the calibration

`training/neural/parity/SPLIT.json` freezes which examples stay out of training. Each set is named once here and has one job.

| set | what | job |
|---|---|---|
| `llm_bench/collected_*` | real messages: `collected_1` (26, as sent and corrected), more by D8 | **The truest check.** Reported at every arm, never trained on until it has been read. Too small to gate today; it gates at M5 if it reaches 200 messages |
| `llm_bench/nl_b` | about 600 new messages, written only when the model is frozen, by a writer family not in training (gpt-6.1-sol, D4) | **The headline.** Read once, at M5 |
| `llm_bench/nl_a`, development half | about 300 new messages | comparing arms, root-cause analysis |
| `llm_bench/nl_a`, calibration half | about 300; SHA256(id) % 2 == 0 | the confidence |
| `llm_bench/fresh2`, `short3` | as today, SHA256(id) % 3 == 0 is calibration | the confidence; no-loss checks on long messages and short commands |
| `llm_bench/scenes_test` | 4 step-by-step scenes, 170 turns | sessions, development. It has been read at every round and shaped `scenes_r3b`, so it is not a final test |
| The 48 built-in examples | their 20 other scenes are training rows from M2s on, like any data; the 13 quick and 11 scenarios stay out | reported only, nothing is chosen on them. Numbers on training rows are labelled as fit |

**What `nl_a` and `nl_b` hold.** The kinds below, with no quotas: the writer picks domains and people, and each row is reported by kind. Whole messages of any length; short literal commands; step-by-step sessions; chatter around the request; self-corrections; complaints with the wish inside; indirect requests; typos and non-native slips; dictated run-ons and text as a translator leaves it; fragments; ambiguous messages; messages with no request or outside the legend; references to the drawing by pronoun, by description, by the words of a label; groups of paraphrases of one intention. Each row carries a `setup`, a short program for the drawing the person is looking at, so that the engine can run it and a reference can be resolved.

**Teachers on the new sets.** **Both teachers write what they would do with every message, blind, frozen before any reader runs**: Opus 5.5 medium as annotated rows (section 6), gpt-6.1-sol high by `codex exec` by the same conventions, in a session separate from any that wrote the texts. Each with engine validation, first pass kept. If D4 declines Codex, "either teacher" reads "Opus", and the report says so.

**Who writes the test sets.** A writer of a test set gets the style rules of `llm_bench/SPEC.md`, the kinds above, a domain and a persona, and **no cause list and no training data**, so that test sets do not oversample the forms being fixed.

**Calibration.** Every arm fits its confidence on the calibration parts of fresh2 + short3 and of `nl_a`, by the five-fold protocol of `calibrate_modernbert.mjs`, and the threshold is chosen there; never on a development set or on training data. A difference between two arms is always between the same fit. That script today accepts only the five fresh2 + short3 folders and the first run's counts (its lines 45, 71, 126), so M0 generalizes it. M1 also reports the first experiment's fit, unchanged, for its registered conditions.

Comparisons resample messages for the 95% interval, and whole scenes for sessions (`future_improvements_ideas.md` section 5: steps of one scene are not independent).

## 5. The arms: one change each

Each arm is written out and shown to the owner before it runs, with the threshold below. **A miss stops the line and is reported; what comes next is a new declaration** (AGENTS.md, Experiments: no patches, no "one more try"). No settings are chosen on held-out data. Each evaluation is followed by a root-cause analysis (first cause and where it sits), reported separately for seen and unseen triggers, and the next arm follows the causes.

### M0. Tools, test sets and baselines (no training)

1. Install `training/laptop` node packages (git-ignored). `readers.mjs` reads a model outside `docs/model`. `test_parity_lib.mjs` runs before every evaluation.
2. Fix the annotation spec (section 6). `validate_rows.mjs`: replays annotated rows on their `setup` or their session in the engine, computes `names` and `groups`, reports engine errors.
3. Write `nl_a` by the rules of section 4, with both teachers. Needs D4.
4. **Both teachers read `collected_1`, blind** (its `context` folder stays closed). How far LLMs get on real language has never been measured, and it is the real ceiling.
5. A scorer for any set: the main metric per request, the splits of section 2, at the gate and executing everything; agreement with either teacher; effect in the engine on the `setup`; paraphrase consistency; nothing to do. **The direction of a resize counts as a value:** `docs/js/bench-canon.js` skips `scale`, so today growing a shape on "shrink" scores as right, and such requests are 20 of the 2,559 in fresh2 + short3, a large part of a 2% budget. `bench-canon.js` itself stays; scores are reported with and without the direction, so that baselines stay comparable. Generalize `calibrate_modernbert.mjs`.
6. The short-command validation AGENTS.md asks for: the learned readers on `short3` and the short sets of `regress.sh` against the Rules (`regress.sh` names only Rules and VSS today).
7. **Oracle:** perfect head outputs (the `roles_roundtrip.py` path) through the decode, per set, so that no threshold below is out of reach. If a ceiling falls under a threshold, that threshold is restated before its arm runs.
8. The batched trainer (section 7) with an automatic gate before every run: all class heads ≥ 99% on 200 rows within 400 updates. Code review (section 9).
9. The baseline table of Rules, VSS, SOP-BERT, VSS-BERT and ModernBERT on every set.
10. The annotation pilot again, on long natural messages: the pilot of section 6 covered only short scene messages, so its choice of models is checked on 40 messages before any volume.

### M1. The recipe only

- **Change.** First-run data, byte-identical by its manifest (54,584 requests, 24,698 messages), with SOP-BERT's recipe: lr 6e-5, batch 32, 8 epochs, 6% warm-up, linear decay, weight decay .01, clip 1, seed 0, one batch of 8 whole messages for the cut head per step. Mixed precision and batches of 32 only make this possible on the card.
- **Hypothesis.** The first run's failure was underfitting; with the same training as SOP-BERT, ModernBERT reads natural language about as well as SOP-BERT.
- **Measure.** Export, its own confidence refit, on the frozen fresh2 + short3 split. Per-key accuracy on 1,000 of its own training rows. Everything else in section 2 is reported, including `collected_1`.
- **It worked when all three hold:** (a) colour, shape and size are each ≥ 95% right on its own training rows **that have a value** (first run 13.9%, 25.8%, 26.8%); (b) the first experiment's registered conditions hold on the test part: cost score > 0, ≥ 20% of requests right, ≤ 5% of executions wrong; (c) ModernBERT minus SOP-BERT, paired, cost score on the same test part: the lower end of its 95% interval is above -10 points.
- **Also reported, not gating:** requests with an unseen trigger, per epoch, on the calibration part. Eight epochs of full fine-tuning may cost pretrained English (`future-experiments.md`, "Catastrophic forgetting"): "erase" for delete. If reading unseen words falls as the fit rises, that is the next proposal.
- **On a miss:** stop and report. If (a) fails, the next proposal would be a head learning rate of 6e-4 (from the overfit test), as a new declaration.
- Time: about 30 minutes on the GPU (estimate from the probe and the batch sizes), then about 30 minutes on the CPU.

### L1. Number words (P6)

- **Change.** On M1's data, only `make_roles.py NUM_WORDS=table` and the decode in `neural.js` gated on `reader.number_words_from`, taken from `wip/preprocess-fixes` and reviewed. **Not** that branch's decode and adapter changes, which apply to shipped models and would move every baseline. The rows whose labels change are counted first.
- **Hypothesis.** The number words stop being noise ("lights" -> 2), with nothing lost.
- **Measure.** L1 against M1, which is also the measure AGENTS.md asks of a mechanical step: what is lost without it. The `roles_roundtrip.py` gate on every trained folder and on `scenes_r3b`, which holds the only spelled gaps among the sets read so far (6).
- **It worked when** `scenes_r3b` reaches the 95% gate, no other folder falls under it, and L1 minus M1 on the cost score has its 95% interval below 0 on none of fresh2, short3.
- Needs D2. With the written exception instead, this arm does not run.

### L2. The scale a message does not write

- **Change.** Labels and one more head: an Opus 5.5 medium session writes `scale` on the `resize` rows that imply one, by `CONVENTIONS.md` (at least the 307 rows of M1's data and the 7 of the folders M2s adds that say smaller), each change listed in a `LABEL_FIXES.md`. A value the text does not write cannot be tagged, so `scale` gets a class head for unwritten values, built from the data like every other head. `distance` does not: only 3 such rows of 595. `roles_roundtrip.py` today skips `scale`, so it learns to compare it.
- **Hypothesis.** The readers shrink what they are told to shrink, with nothing else lost.
- **Control.** SOP-BERT on the same labels. This is also what would fix the shipped reader; adopting it is a separate decision.
- **It worked when** at least 15 of the 17 requests with a word for smaller in the test part of fresh2 + short3 shrink, by the scorer of M0.5; and L2 minus the arm before it has its cost-score interval below 0 on none of fresh2, short3. `shrink_check.mjs` on the example turns is reported (SOP-BERT today shrinks the right shape on 0 of 7 and grows one on 5).
- Needs D7.

**What M2 builds on:** the last of M1, L1, L2 that passed. L1 and L2 are side fixes: a miss is reported and M2 waits for the owner's word, and M2 can go on without them at the price the report states.

### M2s and M2n. The annotated data that exists

Two arms, one after the other, each with SOP-BERT on the same data as the control (about 35 minutes), seeds 0 and 1.

- **M2s, scenes and gaps.** + `scenes_r3`, `scenes_r3b`, `opus_r3_gaps` (955 requests; the data list of `TRAIN_PLAN_R3.md` A.1, job 082, never run). The layout then gains width, height, `distance` on create, fill values, and layer and label in descriptions; these folders hold no `shape=any`, no `onTop` or `inside`, and no size in a description (`data_inventory.txt`), which stay out of reach until labels carry them. Hypothesis: noun-led creates, sizes, gaps and the forms of the real session read right once they are in the data.
- **M2n, natural messages never used.** + `opus_tgt_1`, `opus_tgt_2`, `ops_groups`, `ops_positions`, `opus_short_r2` (2,743 messages, 5,024 requests). Hypothesis: more annotated natural language widens what it reads. Caveat from round 2 (`TRAIN_PLAN_R3.md` A.2): a data list with some of these lost on VSS-BERT, so this one is measured alone.
- **Each worked when** the cost score, minus the arm it builds on, has its 95% interval above 0 on the development half of `nl_a` or on `scenes_test`, and below 0 on none of those, fresh2, short3. A gain on the development half of `nl_a` is the stronger of the two ways to pass.
- **Also, for M3's decision, a learning curve** on the final data list: every LLM-written realistic folder at 25%, 50% and 100% of its messages by SHA256(id), seeds 0 and 1.

### M3. New natural-language data, only if the data says so

- **Runs only if** going from 50% to 100% raised the cost score on the development half of `nl_a` by ≥ 2 points, with its 95% interval above 0. Otherwise it is skipped and that is reported. If the causes then still name forms the data lacks, the owner decides on a new declaration.
- **Change.** One round of new data (section 6) added to the final list. About 1,500 messages and paraphrase groups (estimate). The training brief lists the first causes of the last arm and the real session's forms; no quotas.
- **It worked when** the cost score on the development half of `nl_a` rises by ≥ 2 points with its interval above 0, the unseen-trigger and paraphrase numbers do not fall, and no loss is shown on fresh2, short3, `scenes_test`. A second round needs a new declaration; after a round that misses, no more rounds.

### M4. The drawing in the input (needs the owner's approval, D3; decided after M2, on this full scope)

Without it, a reader reads "the waves" or "the title" as a reference and asks, which AGENTS.md accepts as honest. In the real session a text reached by its words was the single most repeated miss.

- **Change.** A second model call on the request plus compact lines from the page's state, for example `star1 star2 star3: tiny white star | "eight tiny white stars for"` (names, kind, colour, size, label, edges, the first 10 words of the message that made them). The existing B / I / O word tags may land on those names: no new head, but a new read path.
- **Measured for the design, on the examples' scenes and scenarios** (`drawing_input_size.txt`; SOP-BERT's heads stand in for the trigger; M4.0 repeats it on `nl_a`):

  | lines carry | every turn: pieces p50, p90, max; over 512 | the 119 turns: p50, p90, max; over 512 |
  |---|---|---|
  | none of the message's words | 125, 209, 670; 6 | 150, 211, 240; 0 |
  | its first 10 words | 301, 516, 1,651; 119 | 363, 497, 672; 11 |
  | all its words | 366, 627, 2,117; 205 | 420, 591, 817; 23 |

  | second call fires when | turns | of the 119 caught |
  |---|---:|---:|
  | `fill:<key>` says context or description | 12.3% | 63 |
  | also when a written name is neither on the canvas nor made in the message | 20.2% | 97 |

- **What M4.0 must settle, by measurement, before D3 is put to the owner:**
  - Input budget: a cap of 512 pieces, request first, newest lines first. How often the shape a request needs is cut off (that request is held).
  - Read path: `neural.js` caps a ModernBERT read at 128 and the gate holds a truncated request, so the second read needs its own cap. Class heads come from the first read; only tags on canvas names from the second.
  - Confidence: `neural-confidence.js` reads tags only over the request's own words, so tags on canvas names need new signals and a refit.
  - New page state: no per-shape source text exists in `logic.js` or `ui.js`. The serialization is a new mechanical step, the same in Python and JavaScript, with a parity fixture and listed like the others, with what is lost without it measured.
  - Training rows come from replaying sessions and `setup`s in the engine. A `mention(...)` whose filters the message does not write becomes tags on the shapes the engine selects. A labelled mechanical augmentation shuffles the lines, adds shapes not referred to and renames consistently. Batches at 400 pieces hold about 10 rows within the 4,096 tokens the card allows.
- **Alternative:** no new input; references stay with the shared context rule and the context filler, and the reader asks. The names the previous turn touched hold all the unwritten names on only 11 of 34 example turns, so this cannot match the LLMs on those messages.
- **It worked when** on the development messages that need the drawing at least 60% are right, the cost score rises with its interval above 0, the confidently-wrong rate does not rise, and sessions on the reader's own drawing are scored too (training uses the exact drawing, use is on one that may be off).
- Browser cost, to be measured: a 512-token call took 3.37 s on WASM (M1 Mac); it would run on about 20% of messages.

### M5. The final model

- **Training folders, explicitly:** the first run's 23 folders (the 11 of `ALL_DATA.md` and the 12 `EXTRAS` of `finetune_modernbert.py`), the folders of M2s and M2n that passed, the label fixes of L1 and L2 if they passed, and M3's folders if any. **Never:** `fresh2`, `short3`, `collected_*`, `scenes_test`, `nl_a`, `nl_b`, the 13 quick and 11 scenarios.
- **Seeds:** seed 0 is exported and judged; seeds 1 and 2 give the spread. SOP-BERT control: seeds 0, 1, 2 on the same data.
- Write `nl_b` with both teachers, read it once. Weight-only u8 / FP32 export, the 19 fixtures on Python, Node and Chrome (`MODERNBERT_EXPORT_PLAN.md`), `regress.sh`, the live page run with every reader ready, an independent runtime check.
- **"Detects the intention" is reached when all of these hold** (seed 0), right meaning either teacher:

  | on | condition | today |
  |---|---|---|
  | `nl_b` | at the cost-10 threshold: ≥ 70% of requested actions right, ≤ 2% of executions wrong | SOP-BERT 57.3%, 3.6%; VSS-BERT 48.5%, 1.2% (fresh2) |
  | `nl_b` | every request executed: ≥ 85% right (≥ 80% if M4 is declined), with the teachers' agreement beside it | SOP-BERT 80.8% (fresh2) |
  | `nl_b` | cost score above VSS-BERT's and above the SOP-BERT control, 95% intervals above 0 | |
  | `nl_b`, requests whose trigger never occurs in training | every request executed: ≥ 70% right; at the gate ≤ 2% of executions wrong | M0 |
  | `nl_b`, paraphrase groups | ≥ 85% of the wordings read with the same effect | M0 |
  | `nl_b`, nothing to do | at the gate, ≤ 1 action executed per 100 such messages | M0 |
  | real messages, if ≥ 200 | at the gate, no destructive action wrong; right share above the SOP-BERT control with its interval above 0 | VSS-BERT on `collected_1`: 1 executed, wrong |
  | sessions in `nl_b`, each on its own drawing | final shapes, arrows and groups the same, **each** ≥ 60%, mean over the sessions (≥ 50% if M4 is declined). The exact final drawing and the numbers at the gate are reported beside it | teachers 95.4%, 98.2%, 100%; SOP-BERT 19.5%, 26.6%, 18.3%; at its gate 1.9%, 0%, 0% (the example scenes) |
  | `short3` and the short sets | at the gate, right within 5 points of the Rules and wrong not above theirs | M0 |
  | fresh2, short3 | no loss shown against the SOP-BERT control | |

  Reported, not gating: `collected_1` however small; the built-in examples; the strict tolerance.
- **Adoption is a separate decision**: ModernBERT replaces nothing unless its cost score beats the SOP-BERT control on `nl_b` by ≥ 5 points with the interval above 0, for its cost (150 MB, 537 ms median per message against 68 MB, 71 ms). If SOP-BERT does as well, that is the result, and the data and label work still pays for itself.

## 6. Generating data

**What exists.** 94,202 wires in 52,594 rows, counting rows with no wires and the `_dd` copies; the first run used 24,698 messages. Their labels can be used as they are: on the three scene folders they run in the engine with the same effect as the Opus programs on 98.0%, 96.9% and 96.4% of the turns (as either teacher 98.9%, 100%, 98.8%). Real messages: 26.

**One label convention.** The annotated format (`id, domain, names, groups, text, wires[span, trigger, type, args]`), plus `setup` on new rows. Not `.sop` files: they have no spans. Before any writing, the spec needs two fixes:
- `TRAIN_MSG_SPEC.md` does not list `group`, `at`, `width`, `height`, `fill`, `layer`, and has no scale for "shrink". Merge `docs/sop-translations/claude-opus-5-5/CONVENTIONS.md`'s reading rules in.
- Settle what the annotations and the Opus programs do differently: `shape=any` in "which shape" questions (it leaves the panels out), "pale" on a plain shape, `onTop` against `above` with a gap. New data follows the settled rule. Of the existing scene rows, 23 of 963 differ from Opus by effect (`gold_vs_opus_rows.txt`); the training rows are re-checked, and `scenes_test`'s gold is touched only by D6.

**What to write, when M3 runs.** Not more examples. In their own clearly named folders, each with a README, with no quotas and a coverage report per round (legend keys and values, kinds, unseen triggers on the development half), which informs the next brief and is not a target:

| kind | what | why |
|---|---|---|
| Whole messages, many people | As `TRAIN_MSG_SPEC.md`: any length, chatter, reasons, questions, domains and personas | The base (AGENTS.md) |
| **The real session's forms** | "make me a X", "place all the elements in the form of a Y", "join A and B", "a text item that says Z", "I didn't say X, I meant Y", names dictated as words, a text reached by its words | The only evidence from a real person. `opus_r3_gaps` started this |
| **Paraphrase groups** | One intention on one drawing, written the way 10 different people would. The label is checked per wording | Directly teaches that wording is not intention; rare legend keys get coverage from their meaning, not their usual wording |
| Dictated and translated text | Run-ons, homophones, words as a translator leaves them | Most of the real session came this way |
| Step-by-step sessions | Drawing something over many turns, with references to what came before | Rows for M4, and how long jobs are really done |
| Fragments, ambiguous, nothing to do | "Layout", "unite all the boxes", thanks, questions about the weather | Where the reader should ask, not act |
| Mechanical variants, labelled | Names swapped consistently, typos, values swapped where literal; replayed in the engine | Stops memorizing names. Secondary, never the base |

Real messages come first whenever there are any: each collected file goes through two annotators, is read as a test once, and its misses become the next brief.

**Which model does what.** Texts have no right answer, so the choice follows variety and cost. Labels were measured: a blind pilot on two scenes (`winter`, `kitchen`; 66 turns), one brief, first pass, no engine:

| annotator | same effect as Opus or GPT | as Opus | as GPT | agent tokens | time |
|---|---:|---:|---:|---:|---:|
| Haiku 5.5, medium | 45 = 68.2% | 66.7% | 62.1% | 79,506 | 128 s |
| Sonnet 5.5, medium | 64 = 97.0% | 92.4% | 92.4% | 56,452 | 63 s |
| Opus 5.5, medium | 64 = 97.0% | 97.0% | 87.9% | 66,421 | 115 s |
| Opus 5.5, high | 64 = 97.0% | 97.0% | 87.9% | 66,956 | 144 s |

Opus medium and Opus high wrote the same type and args on all 66 turns (spans and triggers differ on 4). This is a small sample of short messages from two scenes, and it cannot separate Sonnet from Opus; M0.10 repeats it on long natural messages. The tokens include reading about 36 KB of specs. The comparison favours writers of the Opus dialect, since one reference is Opus and the brief includes its conventions. Haiku dropped coordinates and groups because the spec does not list them, so its number is from before the spec fix.

**Decision, to be confirmed by M0.10:**

| job | model, effort | why |
|---|---|---|
| Texts for training (most) | Sonnet 5.5, medium | Texts only, saved before any label. As AGENTS.md assigns data writing |
| Terse, typo-heavy, dictated, short literal | Haiku 5.5, medium | Variety and cost. **Texts only**: not for labels unless re-measured after the spec fix |
| One writing session in four, and the forms the causes name | Opus 5.5, medium | Keeps that writer's style in the mix |
| First labels | Opus 5.5, **medium** | The model to imitate. High wrote the same labels; the examples' translations were also made under a repository setting of medium |
| Second labels, independent | Sonnet 5.5, medium | 97.0% as either teacher and a different model, so its disagreements mean something |
| A disagreement between the two | Opus 5.5, high | Few rows, harder judgement. Not measured |
| Third opinion on those rows; the second teacher on test sets; the writer of `nl_b` | gpt-6.1-sol, high, by `codex exec` if its quota allows (D4; Codex is logged in, the quota is unknown) | A different family. **Never training labels**: 75 of its example turns name created shapes with a word the message does not hold, 45 hold more wires than Opus, 80 were repaired against engine behaviour, which a text reader cannot learn |

A local model on this GPU writes nothing: the only one tried here, Qwen3-0.6B, was right on 3 of 10 proposals (`reports/qwen3-browser-prototype.md`), and a 6 GiB card will not hold a model near the teachers. The GPU's part in data is reading: it can read a large pool of cheap messages in minutes, and from the second round on only the ones the model is unsure of, or where ModernBERT and SOP-BERT disagree, go to the annotators.

**The training process, per batch** (the rules are AGENTS.md's; test sets by section 4):

1. A writer session gets the style rules, the kinds, a domain, a persona and the cause list, and may not read `llm_bench`, `docs/js/scenarios.js` or `docs/js/scenes-extra.js`. It saves `texts/texts_NN.jsonl`. No quotas, no padding.
2. Two annotators label the saved texts independently, with no engine.
3. `validate_rows.mjs` replays each label in the engine and computes `names` and `groups`.
4. The gates run: texts byte-identical to the saved ones; spans and triggers are substrings; no engine errors; agreement between the two by effect; the `roles_roundtrip.py` gate (≥ 95% right, reference or refused, ≤ 1% silent wrong labels); no exact text shared with a test set. A folder under 90% agreement stops for diagnosis.
5. A row where they disagree goes to adjudication. It stays in the data with a flag and is never dropped. Those rows are also where the reader should learn to ask, so the calibration reports them apart.

Each session handles several batches, so the specs are read once. Folders: `llm_train/nl_p<round>_<writer>/`, with a README naming the model, effort and session evidence. Cost of a round of 1,500 messages: about 25 annotation sessions plus about 15 writing sessions, a few million agent tokens (estimate from the pilot; long messages cost more). It stops if usage runs low.

## 7. Training on this GPU

Measured with `gpu_probe.py` (ModernBERT-base, forward, backward and optimizer step on random token ids):

| setting | batch x tokens | examples/s | reserved GiB |
|---|---|---:|---:|
| first run: eager, FP32, checkpointing | 1 x 64 | 20.4 | 2.3 |
| SDPA, FP32 | 16 x 64 | 146.2 | 3.0 |
| SDPA, BF16 | 16 x 64 | 222.5 | 2.7 |
| SDPA, FP16 | 16 x 64 | 204.7 | 2.7 |
| SDPA, BF16 | 32 x 64 | 271.0 | 3.3 |
| SDPA, BF16 | 64 x 64 | 295.4 | 4.65 |
| SDPA, BF16 | 32 x 128 | 144.2 | 4.8 |
| SDPA, BF16 | 16 x 256 | 69.1 | 4.65 |
| SDPA, BF16 | 8 x 512 | 32.1 | 4.7 |
| SDPA, BF16 | 4 x 1024 | 13.9 | 5.0 |

Batches of 8,192 tokens ran out of memory without checkpointing (128 x 64, 64 x 128, 32 x 256, 16 x 512). With it they fit in 2.9-3.2 GiB at about 80% of the examples per second.

- **Settings.** The venv `~/.cache/diagram-vss-modernbert/venv` (Python 3.12, Torch 2.15.0+cu132, Transformers 4.57.6). SDPA and BF16 autocast for training; eager FP32 for the export, as now, with a parity check that they agree. No gradient checkpointing for M1-M3.
- **Batches.** 32 random requests and 8 random messages per step, as `finetune_roles.py` forms them, each pass with its own backward. On the first run's rows the largest such batches hold 1,696 and 2,416 tokens (`first_run_batches.txt`; request rows are 9 pieces median, messages 14), so **the first run's 4 GiB allocator limit stays** unless a dry run hits it. About 30 minutes for 8 epochs (estimate). Only M4's long inputs need a budget of 4,096 tokens per batch and a limit of 5 GiB (the card has 5.8 GiB free; gnome-shell shares it).
- **Guards**, kept from `finetune_modernbert.py`: the physical UUID, the lock on it, `gpu_recovery_action = None`, no other compute job, finite losses and gradients, atomic checkpoints, a resume that checks identity, hashes of source and data, data and checkpoints outside git. Added: temperature and throttle reasons logged; stop at 90 °C or a hardware slowdown. The card read 72 °C right after the probes, with no thermal slowdown active; a sustained run is not measured yet. `nvidia-smi` reports 752 W against a 136 W cap, a nonsense reading, so power is not used.
- **Trainer.** A new file; `finetune_modernbert.py` stays as the record of the first run. `make_roles.py`, `finetune_roles.py` (`Layout`) and `modernbert_tokenization.py` are reused.
- **At the end of every run**: per-key accuracy on 1,000 of its own training rows, on rows with a value. Epoch checkpoints are kept. Test sets are read only after the run; nothing stops early on them.

## 8. Export and the reader

The export path stays (`export_modernbert.py`, `modernbert_weight_only.py`, `finalize_modernbert_export.mjs`, `check_modernbert_browser.py`): weight-only u8 with FP32 arithmetic on WASM, shards under 100 MiB. Any new layout re-runs the 19 fixtures. Arms export outside the repository; only an adopted one enters `docs/model`, in its own folder, with its own confidence file. `docs/js/neural.js` changes only for what a model's own config turns on (P6's table, the head for an unwritten scale, M4's read path), and shipped models must decode byte-identically (the check of `ROLES_ROUNDTRIP.md`). `regress.sh` runs before any commit that touches a reader.

Not proposed: a decoder that writes SOP text (harder browser export, weaker per-field confidence, more to learn; only if the label round trip of the heads falls under its 95% gate), or training an LLM on this card.

## 9. Who does what

| work | who |
|---|---|
| This plan and its review | Opus 5.5, max (owner, 2026-11-05) |
| **All code review** | `code-reviewer`, Opus 5.5, max (owner, 2026-11-05) |
| Trainer, head layout, reader changes | Opus 5.5, high (AGENTS.md) |
| Pipeline wiring, scorers, builders, running trainings and evaluations, root-cause analyses | Sonnet 5.5, medium (AGENTS.md) |
| Mechanical checks | Haiku 5.5, medium |
| Risky runtime claims (export parity, adoption) | `implementation-verifier` |
| Data | section 6 |

Agents leave changes in the working tree; the coordinator reviews and commits. Long runs are reported when they finish, with numbers.

## 10. Decisions for the owner

| # | decision | recommendation | needed before |
|---|---|---|---|
| D1 | The thresholds of section 5, which define "detects the intention", **including whether the final picture of a session counts**, and **whether that bar is read with every request executed or at the gate**. They can change now, or after M0's oracle and baselines before their arm runs, not after a result | As written: every request executed, because in use a person answers what the gate holds; the number at the gate is reported beside it | M1 for M1's; the rest before their arm |
| D2 | P6 for the learned readers. `TRAIN_PLAN_R3.md` calls it both "approved" and "not given"; the branch records your words of 2026-11-03 16:44, "fix what is logical in preprocessing". Is that your OK? The alternative is a written exception for `scenes_r3b`'s gate (5 spelled gaps; the counts already decode, `ROOT_CAUSES.md` section 3) | P6, only the gated hunks, as L1 | L1 |
| D3 | The drawing as a new input (M4), on the scope in section 5 | Decide after M2, with M4.0's measurements | M4 |
| D4 | gpt-6.1-sol by Codex as the second teacher on test sets, for third opinions, and as the writer of `nl_b`: is the quota yours to spend? | Yes if it is. Otherwise "either teacher" reads "Opus", and `nl_b` comes from Opus personas not in training | **M0.3** |
| D5 | Terms of use: both vendors restrict using outputs to train competing models. A small reader of diagram commands is probably not that, and the repository already trains on LLM-written data, but this plan's aim is to imitate them. Not checked | Your call | M3 |
| D6 | Edit `scenes_test`'s gold where it differs from the settled convention (DECISIONS.md item 5 says such a pass is your question) | No: it is scored against both teachers anyway. If yes, each changed row is listed and scores are reported both ways | M0.2 |
| D7 | L2: the relabelled `resize` rows and one more class head, for a scale the message does not write. It is built from the data like the others, but AGENTS.md asks approval for a new classifier | Yes: this is what stops "shrink" from growing the shape | L2 |
| D8 | **Real messages.** The demo already keeps what people send (⋮ › Settings › Collected requests › Download as JSONL; `COLLECT_FORMAT.md`, `collect_to_bench.py`). Can you and a few other people use it for a while and send the files? About 200 messages would let real language gate the final test; every file also shows forms no LLM thought of | Yes. Any amount helps; nothing leaves the browser unless downloaded | any time; before M5 to gate |

## 11. Reproducing the numbers

Scripts: `training/neural/parity/` (README there). Outputs: `reports/evidence/modernbert-parity-baseline/`. Source `f57a9c3` plus these uncommitted files. The natural-language numbers of section 2 are read from the documents named there.

| numbers | command |
|---|---|
| The comparison rejects broken readers | `node training/neural/parity/test_parity_lib.mjs` |
| Teachers' agreement on the examples | `node training/neural/parity/teachers_agree.mjs out.json` |
| What the programs need, the layout gaps | `node training/neural/parity/what_programs_need.mjs flags.json` |
| Counts about the teachers' programs | `node training/neural/parity/teacher_stats.mjs` |
| A reader against the teachers on the examples | `LAPTOP_PKG=... node training/neural/parity/readers_vs_teachers.mjs nothing\|rules\|sop\|modernbert out.jsonl` |
| Each on its own drawing | `LAPTOP_PKG=... [GATE=cost] node training/neural/parity/free_run.mjs teachers\|nothing\|rules\|sop\|modernbert` |
| The tables of the examples | `python3 training/neural/parity/tables.py out.json flags.json name=out.jsonl ...` |
| Annotated labels against the teachers, the pilot | `[SHOW=30] node training/neural/parity/gold_vs_opus.mjs [DIR...]` |
| The shrink labels and what readers do with them, by effect | `python3 training/neural/parity/resize_labels.py`, `node training/neural/parity/shrink_check.mjs name=out.jsonl ...` |
| M4's input sizes and second-call trigger | `LAPTOP_PKG=... node training/neural/parity/drawing_input_size.mjs flags.json` |
| The first run's row lengths and batch tokens | `LAPTOP_PKG=... node training/neural/parity/first_run_batches.mjs` |
| First run: held-out heads, own-rows fit and overfit test | `first_run_heads.py`, `first_run_fit.py` (task venv, GPU lock) |
| GPU throughput | `gpu_probe.py` (task venv, GPU lock) |
| Data inventory, text overlap, what M2s's data holds | `python3 training/neural/parity/data_inventory.py` |

Not reproducible from the repository: the pilot's rows (session scratchpad; scores in `annotation_pilot.txt`, usage in `annotation_pilot_notes.txt`) and the first-run checkpoint (`~/.cache/diagram-vss-modernbert/cuda-run-0e25611`, SHA256 in `reports/modernbert.md`). `goldProgram` adds `scale=0.67` to a resize with a shrink word, as the scene harness does, so a few label matches on the scene folders depend on that rule; L2 removes the need for it on the training rows.

## 12. Risks

- **LLM-written messages are cleaner than real ones, and this is the largest risk.** SOP-BERT goes from 80.8% on a new LLM writer to 14-32% on one real person, on a tiny sample. A plan judged only on LLM-written text can pass and still fail people. `collected_1` is reported at every arm, and D8 is the way out.
- **All new test data comes from models close to the teachers.** A reader that imitates them is judged by them. Only real messages break the circle.
- **M1 may fit its training rows and still read new text badly.** Then the cause is generalization, and the arm stops and is reported.
- **Fine-tuning may cost pretrained English** (M1's per-epoch report). If it does, LoRA or fewer epochs are the proposals `future-experiments.md` already holds.
- **The gate may hold too much again.** The first one held nearly everything, and SOP-BERT at its gate draws 1.9% of the example scenes' final shapes. The confidence is refit for each arm; if it still holds most right readings the cost score shows it.
- **Calibration may not carry over** between long messages, short ones and real ones. All are reported apart.
- **Speech and translation errors are not the reader's to fix.** 8 of 26 real messages were garbled before any reader saw them. They are reported apart, in the as-sent and corrected columns.
- **Seed noise may exceed the 2-point gates.** Not measured until M2's two seeds; the interval is the guard.
- **M4 may have too few rows.** About 10% of example turns need the drawing, so the augmentation carries much of it, and training on the exact drawing differs from use on the reader's own.
- **Allocator fragmentation** with variable-shape batches may behave differently from the fixed-shape probe. The dry run of M0.8 checks it.
- **The GPU needed a reboot to recover once** (`reports/modernbert.md`). The guards stop a run on an unhealthy state, and a run resumes from its checkpoint; no reset is attempted.
- **Quota.** M1 costs only code review. M0.3, M0.4 and M0.10 are small data jobs. M3 is the expensive step, which is why it comes after the learning curve.
