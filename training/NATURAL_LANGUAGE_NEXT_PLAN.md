# Natural language after the small readers: a proposal

Date 2026-11-07. Base commit `c266319`. Status: **closed, not run, except A1** (section 9). Nothing in this plan has run. No GPU or LLM run starts before the owner
answers the decisions in section 6. It follows the closing of the ModernBERT natural-language line (`training/neural/MODERNBERT_RUNLOG.md`,
"The owner's decision after W") and of the Qwen3 line (`training/qwen/QWEN3_FINETUNE_RUNLOG.md`, "Q2 result").

## 1. Where things stand (measured)

`nl_a` (610 messages, 800 requested actions; development part 392). The answer key is Opus 5.5's labels; gpt-6.1-sol labelled the
same messages blind. Every request executed:

| reader | right, all 800 | right, development 392 | wrong, all | extras, all | cost score, all |
|---|---:|---:|---:|---:|---:|
| gpt-6.1-sol, scored against Opus | 584 (73.0%) | 283 (72.2%) | 141 | 63 | **-182** |
| Opus 5.5, scored against gpt | 543 of 788 (68.9%) | | 182 | 75 | -257 |
| Qwen3-0.6B Q2 | | 75 (19.1%) | | | |
| ModernBERT C100 (seeds 0, 1) | 113 (14.1%) | 51, 44 (13.0%, 11.2%) | | | |
| SOP-BERT | 84 (10.5%) | 35 (8.9%) | | | |

Sources: `parity/folder_agreement.mjs training/sketch/llm_bench/nl_a` (rerun 2026-11-07; 168 of 610 messages have a disagreement);
`arms/C100-s{0,1}/eval/cal-fresh2-short3-nl_a.score.json`; `arms/baseline/sop.cal-fresh2-short3-nl_a.score.json`;
`QWEN3_FINETUNE_RUNLOG.md` 23:20. Cost score: AGENTS.md (right minus 10 x (wrong + extras), per 100 requested).

At each reader's own cost-10 threshold, `nl_a` development: SOP-BERT -6.4, C100 -0.8 and -2.8, Qwen Q1 -5.6 (18 right, 3 wrong,
1 extra of 22 executed), Q2 minus Q1 -3.6 [-21.1, +12.3]. No small reader executes natural language safely in useful amounts.

**A correction to how the gap was described.** The 73% that the M5 bar was built on (0.75 x 73.0% = 54.8%) is the agreement between
two frontier models, not a target. Executing every request, gpt-6.1-sol would score -182 under the owner's main metric against Opus's
labels: 141 of 800 executed wrong. On these messages about a quarter of the requests are read differently by two frontier models.
So the useful question is not "how close to 73% right" but "how many requests can be executed safely, and by what".

**Why the small readers fail is not label convention.** Scored as right when either teacher agrees ("either" view), C100-s0 gets 55 of
412 against 51 of 392 with Opus alone. They fail where the two teachers agree.

**What the wrong values are** (C100, `nl_a` development, requests paired with gold but wrong: 222 and 226). The Qwen session's
`training/qwen/finetune/wrong_values.mjs` counts a value as written when its words are anywhere in the message. Checked against the
request's own text instead (the same code with one change, run 2026-11-07, scratch only):

| first cause of the wrong value | seed 0 | seed 1 |
|---|---:|---:|
| needs the drawing (a shape name the message does not write) | 61 | 56 |
| a legend value or paraphrase not written (e.g. "crimson" for red) | 77 | 76 |
| written only in another sentence of the message | 42 | 38 |
| written in the request's own words | 37 | 51 |
| a reference (`$new`) | 5 | 5 |

Beside these: about 120 requests not done and about 200 extras per seed. A reader that sees the drawing could at most fix the first
row: C100 from about 48 to about 106 of 392 right (27%), an upper bound and an inference.

"Written only in another sentence" includes references the reasoning layer is meant to fill (AGENTS.md: "a name stated in an earlier
sentence is left as a reference for the reasoning layer"). Not all of it: SOP-BERT and ModernBERT write a "description" as a `mention`
wire that the engine resolves (`docs/js/neural.js:145`), and some of those are confident wrong executions, not open references
(C100-s0 `nl-01-004`: gold target "guestwifi,staffwifi", output `mention(quantifier=all)`, which acts on every shape). On `nl_a`
development, 18 C100-s0 requests are paired, wrong and carry a `mention(` value where the gold has none (36 records hold one anywhere).

## 2. The question

Under the owner's main metric (do only what you are sure of; one confident mistake costs 10 right answers), how many natural-language
requests can be executed safely, by which reader, and at what cost in the browser (size, time, privacy)?

## 3. Step 0: an answer key that is not one of the readers

Every comparison below needs it. Today the key is Opus's labels, so any reader built on Opus scores well by construction, and gpt
scores well in the "either" view. No LLM reader is measured before Step 0, and no result of an option is read on the old key.

- **0a. Adjudicate by a model family that labelled no part of `nl_a`.** The rows `adjudicate.py build` selects: the 168 messages where
  Opus and gpt differ plus the messages whose Opus label fails in the engine, 179 in all; also gpt's engine failures (added to the
  selection). Two blind adjudicators per row: gpt-6-astra (it wrote `nl_b` and labelled nothing in `nl_a`) and Opus 5.5 high, each
  choosing A, B, both acceptable, own, or **ask** (the message does not decide it; holding is the right outcome). Report how often the
  two agree, and the split Opus / gpt / own / ask. Where they disagree, the owner decides (D4), or the row becomes "ask".
  The result goes to a new folder `nl_a/key/`; `nl_a/opus/` and `nl_a/gpt/` stay unchanged. The key's session rows after a changed row
  are replayed (`validate_rows.mjs` on the key, `names` recomputed): 14 of 21 sessions hold a disagreement, with 97 later rows.
- **0b. Check what both teachers agreed on, by message.** A fixed-seed random sample of 60 messages from those without a disagreement
  (about 80 requests), labelled blind by gpt-6-astra (it sees the text and the drawing, not the teachers' label), then compared with the
  agreed label. A difference is adjudicated as in 0a. Defined: **wrong** = contradicts `ANNOTATION_SPEC.md` or what the message says;
  a debatable choice the spec leaves open is not wrong. Reported: the wrong rate with its 95% interval (Wilson). Bar: the upper end at
  most 6%. Above it the agreed labels are not a key and the plan stops for the owner. Sampling by message also finds requests that both
  teachers missed.
- **0c. Rescore the existing records on the key.** The records were made against Opus's gold and `loadRecords` refuses them once the
  gold changes (`arm_lib.mjs:179`, `recordDiffers` `arm_lib.mjs:102`). A key view re-pairs the stored produced requests with the key,
  as `teacherRecord` does for the teachers (`arm_lib.mjs:83`). Thresholds: kept as fitted on the old calibration labels (declared now,
  so nothing is refitted after seeing key scores), and a refit on the key reported beside it. No new reading.
  Unresolved references: a value counts as **not done** (0 cost) only for the forms AGENTS.md names, a pronoun, `$new`, or a name
  written in an earlier sentence of the message; an engine-resolved description (`mention(...)`) is scored as executed.

## 4. The options

Each is written out with hypothesis, measure and threshold and shown to the owner before it runs (AGENTS.md, Experiments).

### A. In scope today, no new model: make the held requests useful

The small readers hold back most natural requests, and that is the honest outcome. What the person then sees decides whether the editor
is usable. AGENTS.md already requires the question to name the words not understood.
- **A1.** For the reader the demo runs by default, on `nl_a` development and `collected_1`, every held request: the message shown to the
  person, captured from the demo's own code path. A tool lists, per held request, the words the question names and the legend forms it
  offers. Pass: every question names at least one word of the request it could not read. Anything less is a bug list, fixed in the demo
  (a bug fix, no approval needed).
- **A2. Not run without D6.** Filling references from the context exists only behind the VSS reader (`vss-context.js` takes a VSS
  reading; `vss-composer.js:58` is its only importer). Putting a filler behind SOP-BERT, ModernBERT or Qwen is a new layer in their
  pipeline and needs the owner's approval (AGENTS.md).

### B. Is model size the lever? (offline, on this machine; needs D7)

- **Hypothesis:** a larger model reads natural phrasing that 0.6B cannot.
- **B1, prompt only, no training:** Qwen3-0.6B, 1.7B, 4B and 8B (GGUF Q4_K_M, native llama.cpp on the RTX 3060's 6 GiB; 8B partly
  offloaded), the legend and the annotation spec in the prompt, the same output format as the Qwen reader. `nl_a` development on the
  key, every request executed and at each model's own cost-10 threshold (fitted on the calibration part).
- **Bar:** 8B minus 0.6B, paired right share with every request executed, 95% lower end above 0; and the same at each one's threshold
  (cost score) reported. If the bar is missed, model size is not the lever and B stops.
- **What it can decide:** only whether size matters. Native numbers are development numbers (the Qwen run log, Q0.2), and no size above
  0.6B fits the 800 MB bundle at Q4; any browser use goes through D3.
- **B2 is not part of this plan.** Fine-tuning 4B or 8B in 6 GiB means QLoRA, and the GGUF export (`write_gguf.py`) handles only the
  0.6B Q8_0 container. If B1 passes, B2 is declared on its own.

### C. An LLM in the loop (needs D1 and D2)

- **The design:** the browser reader executes what it is sure of; the requests it holds go to a large model, which executes only under
  its own confidence.
- **The open question is that confidence.** Section 1 shows a frontier model executing everything is not safe.
- **Pilots on existing labels, descriptive only (they gate nothing):** on agreed requests the key equals the teachers' shared label,
  so a pilot built on that label cannot be wrong there.
  - **C1.** Two frontier models agree: execute where Opus and gpt agree, ask otherwise. Its precision is estimated only from 0b's
    independent check, with that interval; coverage from the key.
  - **C2.** The small reader and gpt agree: execute C100's request only where it equals gpt's label; scored only on the rows where the
    key differs from gpt's label or 0b checked it.
- **C3, the measured pilot, a new run (needs D1):** a model family that labelled none of the key (or two samples of one model) executes
  where its readings agree, on `nl_a` development, scored on the key. Bar: cost score at its threshold above C100's at its own
  threshold, paired, 95% lower end above 0, and a confidently-wrong rate no higher than C100's.
- **The product step comes after, as its own formal plan with review:** where the model runs, who holds the key, what leaves the
  browser, and the browser's limits on calling an API directly (CORS).

### D. Not proposed: more training data of the same kind

The curve (C0 -> C100) and W, and Qwen's Q2, show no gain from more natural rows or more weight on them. The drawing input is bounded
by the first row of the table in section 1.

### E. Real messages (the parity plan's D8, still open)

All of `nl_a` is written by LLMs. The only real session (`collected_1`) has 22 requests. Each option above should finally be checked on
real sessions recorded in the demo (target: a few hundred requests, labelled by both teachers and adjudicated as in Step 0).

## 5. Order

1. The tools of section 7 with their tests (CPU).
2. Step 0: 0a (about 180 rows, two adjudicators), 0b (60 messages), 0c (no new reading). LLM labelling runs in normal subscription
   sessions (Claude subagents, `codex exec` for the gpt models); the API-credit route is paused.
3. A1 (CPU, minutes). A2 only on D6.
4. C1 and C2 (CPU, minutes, descriptive). C3 only on D1.
5. B1 only on D7: GPU, about 1 to 3 h for four sizes (estimate).
6. E whenever the owner records sessions.
7. A product change only after the owner's decision on these results.

## 6. Decisions for the owner

- **D1. Is an LLM in the loop in scope?** AGENTS.md: "The research question of this project is a reader that says clearly where it is
  not sure, not one that approximates well: for approximations there are LLMs." Options: (a) no: the research stays with the small
  readers, and the plan is Step 0, A and B; (b) yes, as a fallback for held requests: Step 0, A, the C pilots and C3, then a product plan.
- **D2. If yes, where the large model runs.** GitHub Pages holds no secret.
  - A key the person types, kept only in their browser (subject to the provider allowing browser calls).
  - A small proxy server.
  - A local model server.
  - In every case the person's messages leave the browser. A key is never committed.
- **D3. The browser limits for a bigger browser reader:** keep or relax?
  - Each reader's model bundle under 800,000,000 bytes (`reports/browser-models-under-800mb.md`); Qwen3-0.6B Q8_0 is 639,446,688.
  - wllama on one thread with WebGPU off (owner's settings, 2026-11-04). Multithreading needs headers GitHub Pages cannot send.
  - Time: Qwen3-0.6B measured p95 14.7 s with names only and 31.3 s with the drawing (Qwen run log, Q0.7), against a 10 s p95 bar.
- **D4. The key.** gpt-6-astra and Opus 5.5 as the two blind adjudicators of 0a and the checker of 0b; the owner decides the rows where
  the adjudicators disagree, or they become "ask". Acceptable, or does the owner check them instead?
- **D5. Real sessions (E).** Will the owner, or others, record sessions in the demo for a real test set?
- **D6. A reference filler behind the neural readers (A2)?** A new layer in their pipeline.
- **D7. B1: new models and their download.** Qwen3-1.7B, 4B and 8B GGUF (about 1 to 5 GB each), offline only, never shipped.

## 7. Commands

Existing:
```bash
node training/neural/parity/folder_agreement.mjs training/sketch/llm_bench/nl_a ~/.cache/diagram-vss-modernbert/nl_a_agreement.json
node training/neural/parity/score_arm.mjs CONFIDENCE.json OUT.score.json REC_FS.jsonl REC_NL.jsonl REC_CS.jsonl
node training/neural/parity/compare_arms.mjs A.score.json B.score.json OUT.json
```

To write (each with a test, before use):
- `adjudicate.py`:
  - `build` also selects gpt's engine failures;
  - two adjudicators per row, and the agreement between them;
  - an `ask` choice;
  - `merge --out KEYDIR`, writing the key folder;
  - `merge --write` refuses any folder under `llm_bench` unless `--out` is given, so `nl_a/opus` cannot be rewritten.
- The key's session replay: `validate_rows.mjs` on `nl_a/key`, with `names` recomputed.
- `sets.mjs`, `arm_lib.mjs`, `score_arm.mjs`:
  - an explicit `--gold key` option, never chosen automatically when the folder exists;
  - a key view that re-pairs stored produced requests, like `teacherRecord`;
  - the "ask" wire form and its rule: holding it is right (0 cost), executing it is wrong;
  - the reference rule of 0c;
  - every score file names its gold.
- `parity/check_sample.py`: 0b's message sample (seed 20261107), the blind items and the Wilson interval.
- `parity/agree_gate.mjs RECORDS.jsonl`: the C1 and C2 pilots, descriptive.
- `parity/wrong_values_span.mjs`: the split of section 1, by the request's own text, kept with the evidence (its scratch version
  reproduces 61/77/42/37/5 and 56/76/38/51/5).
- A1's tool: the held requests' questions from the demo's code path, with the words they name.
- B1's runner (only on D7): native llama.cpp with the Qwen reader's output format and scorer (`training/qwen/finetune/`).

## 8. Review

Initial review by `plan-reviewer` (Opus 5.5 high), 2026-11-07, verdict REVISE. Its findings are applied above:
- The C pilots passed by construction; they are now descriptive, and C3 is the measured pilot.
- Rescoring needed scorer and record changes (`arm_lib.mjs:102`, `:179`) and an "ask" rule; these are now listed.
- The reference rule covered `mention()` outputs that are wrong executions; it is now limited, and the count is 18, not 29.
- Opus adjudicating its own disagreements was circular; there are now two adjudicators, one from a family new to `nl_a`.
- 0b had no definition of wrong, the wrong unit and too loose a bar; it is now 60 messages, a Wilson upper end of 6% or less, blind.
- B had no owner approval and no bar; D7 and a bar are added, and B2 is removed.

Every section 1 number was checked by the reviewer, who reran the two CPU scripts; the only mismatch was the 29.

## 9. Decisions (2026-11-07): closed, not run, except A1

The owner first asked for the whole plan to be implemented, then, after a conflicting decision relayed from the Qwen session (its
advisor, at the owner's request: "have the advisor make all these decisions"), chose this session's suggestion: "go with your
suggestion". What stands:
1. **No hosted model (Opus or gpt) reads messages in the product now (D1, D2).** A provider key in a static Pages site would be
   exposed, and a backend is a product decision. gpt-vs-Opus agreement (73.0%) stays a reference, not a target.
2. **B1 is not run, and nothing is downloaded (D7).** Qwen3-0.6B already misses the 10 s p95 bar (Q0.7: 14.7 s names, 31.3 s drawing),
   so no larger size can ship (inference).
3. **No answer-key work.** Step 0 (0a, 0b, 0c), the C1/C2/C3 pilots, the "ask" outcome and A2's filler are dropped. Opus's labels stay
   the gold, with the "either" view as the cross-check; the cost formula and the fitted thresholds are unchanged.
4. **The demo is unchanged** by this plan, except for bug fixes A1 may find (a separate, reported change).
5. **A1 runs** (section 4.A): on the existing records, does every held request's question name at least one word it could not read?
   Its pass rule is pre-registered in `training/NATURAL_LANGUAGE_RUNLOG.md` before it is computed.
6. **Next, outside this plan:**
   - real sessions recorded in the demo (E), the largest gap;
   - the parked demo fixes in `future_improvements_ideas.md` (P3, P6, never drop a value silently).
