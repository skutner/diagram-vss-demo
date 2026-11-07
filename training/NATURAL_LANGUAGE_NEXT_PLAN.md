# Natural language after the small readers: a proposal

Date 2026-11-07. Base commit `c266319`. Status: **proposed**. Nothing in this plan has run. No GPU or LLM run starts before the owner
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
sentence is left as a reference for the reasoning layer"). The evaluation scores the reader alone: 29 C100-s0 records hold an unfilled
`mention()` value, which counts as wrong.

## 2. The question

Under the owner's main metric (do only what you are sure of; one confident mistake costs 10 right answers), how many natural-language
requests can be executed safely, by which reader, and at what cost in the browser (size, time, privacy)?

## 3. Step 0: an answer key that is not one of the readers

Every comparison below needs it. Today the key is Opus's labels, so any reader built on Opus scores well by construction, and gpt
scores well in the "either" view. No LLM reader is measured before Step 0.

- **0a. Adjudicate the disagreements.** The 168 `nl_a` messages where Opus and gpt differ, blind A/B by Opus 5.5 high, as `nl_p2`'s
  were (`parity/adjudicate.py`, `parity/ADJUDICATION.md`). New: the adjudicator may answer **ask** (the message does not decide it;
  asking is the right outcome), counted as "not done is right" for that request. The result goes to a new folder `nl_a/key/`;
  `nl_a/opus/` and `nl_a/gpt/` stay unchanged.
- **0b. Check the requests where both agree.** Agreed labels are not proof. A random sample of 100 agreed requests (seed fixed), checked
  by the owner (D4) or by a third model family that labelled none of `nl_a` (gpt-6-astra, which wrote `nl_b`), blind. If more than 5
  of 100 are wrong, stop and report: the agreed labels cannot serve as the key.
- **0c. Score what the demo runs.** Measure the reader together with the reasoning layer's context filling (`docs/js/vss-context.js`),
  or count an unfilled reference as not done instead of wrong (AGENTS.md: not a reader error). Report both. Rescore C100, SOP-BERT,
  Q1 and Q2 on the key: no new reading, the records exist.

## 4. The options

Each is written out with hypothesis, measure and threshold and shown to the owner before it runs (AGENTS.md, Experiments).

### A. In scope today, no new model: make the held requests useful

The small readers hold back most natural requests, and that is the honest outcome. What the person then sees decides whether the editor
is usable. AGENTS.md already requires the question to name the words not understood.
- **A1.** On `nl_a` development and `collected_1`, every held request: does the question name the words it did not understand and the
  forms it does understand? Measure the share that does. Threshold: 100%; anything less is a bug list.
- **A2.** Fill references from the context (0c). The about 40 values per seed written in another sentence are partly the context
  filler's job. Measure: requests right, reader plus filler, against the reader alone, at the same threshold, paired.

### B. Is model size the lever? (offline, on this machine; no browser work)

- **Hypothesis:** a larger model reads natural phrasing that 0.6B cannot.
- **B1, prompt only, no training:** Qwen3-1.7B, 4B and 8B (GGUF, Q4_K_M, native llama.cpp on the RTX 3060's 6 GiB; 8B partly
  offloaded), the legend and the annotation spec in the prompt, the same output format as the Qwen reader. `nl_a` development, scored
  against the key, every request executed and at each model's own cost-10 threshold (calibration part).
- **B2, only if B1 shows a rise with size:** LoRA fine-tune of the largest size that fits 6 GiB, on Q1's training list. That is a
  recipe change against Q1's full fine-tune, so it is declared on its own.
- **Read:** if right share does not rise with size, the limit is not the model, and a bigger browser reader is not worth building.
  If it does, the browser limits decide (D3).

### C. An LLM in the loop (needs D1 and D2)

- **The design:** the browser reader executes what it is sure of; the requests it holds go to a large model, which executes only under
  its own confidence.
- **The open question is that confidence.** Section 1 shows a frontier model executing everything is not safe.
- **Pilots on existing labels only** (no new LLM runs), scored against the key:
  - **C1.** Two frontier models agree: execute a request where Opus and gpt agree, ask otherwise. Its precision is known only through
    0b's sample, because the key equals their shared label.
  - **C2.** The small reader and the LLM agree: execute C100's request only where it equals gpt's label.
- **C3, a new run:** one model sampled twice, executing where the two samples agree. Only if C1 or C2 shows a gain.
- **Threshold, per pilot:** cost score at its threshold above C100's at its own threshold, paired, 95% lower end above 0, and a
  confidently-wrong rate no higher than C100's.
- **The product step comes after, as its own formal plan with review:** where the model runs, who holds the key and what leaves the
  browser.

### D. Not proposed: more training data of the same kind

The curve (C0 -> C100) and W, and Qwen's Q2, show no gain from more natural rows or more weight on them. The drawing input is bounded
by the first row of the table in section 1.

### E. Real messages (the parity plan's D8, still open)

All of `nl_a` is written by LLMs. The only real session (`collected_1`) has 22 requests. Each option above should finally be checked on
real sessions recorded in the demo (target: a few hundred requests, labelled by both teachers and adjudicated as in Step 0).

## 5. Order

1. Step 0, on the CPU plus LLM labelling: 0a about 168 messages, 0b 100 requests, 0c no new runs.
2. A1 and A2: CPU only, minutes.
3. Pilots C1 and C2: CPU only, minutes; only if D1 does not rule an LLM out.
4. B1: GPU, about 1 to 3 h for three sizes on 392 + 408 requests (estimate). B2 only on B1's result.
5. E: whenever the owner records sessions.
6. A product change (C's product step or a bigger browser reader) only after the owner's decision on these results.

## 6. Decisions for the owner

- **D1. Is an LLM in the loop in scope?** AGENTS.md: "The research question of this project is a reader that says clearly where it is
  not sure, not one that approximates well: for approximations there are LLMs." Options: (a) no: the research stays with the small
  readers, and the plan is Step 0, A and B; (b) yes, as a fallback for held requests: Step 0, A, the C pilots, then a product plan.
- **D2. If yes, where the large model runs.** GitHub Pages holds no secret.
  - A key the person types, kept only in their browser.
  - A small proxy server.
  - A local model server.
  - In every case the person's messages leave the browser. A key is never committed.
- **D3. The browser limits for a bigger browser reader:** keep or relax?
  - Each reader's model bundle under 800,000,000 bytes (`reports/browser-models-under-800mb.md`); Qwen3-0.6B Q8_0 is 639,446,688.
  - wllama on one thread with WebGPU off (owner's settings, 2026-11-04). Multithreading needs headers GitHub Pages cannot send.
  - The 10 s p95 bar, already missed by Qwen3-0.6B on one thread (`QWEN3_FINETUNE_PLAN.md`: 30-40 s per message with the shipped
    prompt).
- **D4. The key.** Is Opus 5.5 high blind adjudication with "ask" allowed acceptable for 0a? For 0b, does the owner check 100 agreed
  requests, or does a third model family?
- **D5. Real sessions (E).** Will the owner, or others, record sessions in the demo for a real test set?

## 7. Commands

Existing:
```bash
node training/neural/parity/folder_agreement.mjs training/sketch/llm_bench/nl_a ~/.cache/diagram-vss-modernbert/nl_a_agreement.json
python3 training/neural/parity/adjudicate.py build training/sketch/llm_bench/nl_a WORK 6 ~/.cache/diagram-vss-modernbert/nl_a_agreement.json reports/evidence/modernbert-parity-baseline/nl_a/validate_opus.txt reports/evidence/modernbert-parity-baseline/nl_a/validate_gpt.txt
node training/neural/parity/score_arm.mjs CONFIDENCE.json OUT.score.json REC_FS.jsonl REC_NL.jsonl REC_CS.jsonl
node training/neural/parity/compare_arms.mjs A.score.json B.score.json OUT.json
```

To write (each with a test, before use):
- `adjudicate.py`: an `ask` choice, and `merge --out nl_a/key` that writes the key folder instead of rewriting `opus/`.
- `sets.mjs`: load `nl_a/key/` as the gold when present, and report which key a score used.
- `parity/agree_gate.mjs RECORDS.jsonl --second gpt --key key`: the C1 and C2 pilots, scored by `score_arm.mjs`'s rules.
- `parity/wrong_values_span.mjs`: the split of section 1, by the request's own text, kept with the evidence.
- B1's runner: native llama.cpp with the Qwen reader's output format and scorer (`training/qwen/finetune/`), owned with the Qwen
  session.
