# Qwen3-0.6B fine-tuning plan: detect what people mean from natural language, as well as Claude Opus 5.5 and gpt-6.1-sol

Date 2026-11-05. Base commit `f57a9c3` plus uncommitted files: the ModernBERT session's sets and scoring tools, and this plan's scripts in
`training/qwen/finetune/`. Machine: apparatus, i7-12700H (20 logical CPUs), 30 GiB, RTX 3060 Laptop GPU 6 GiB (`GPU-905b8484-…`).
Status: proposed. Nothing was trained, no reader code was changed, nothing was committed. The ModernBERT session held the GPU all evening
(until 07:00), so every GPU number below is **pending** and says so. CPU numbers were measured while that session loaded the machine
(load average 14-35 on 20 threads); times measured then are marked "loaded".

The goal is the owner's for ModernBERT (`MODERNBERT_PARITY_PLAN.md`), applied to the Qwen reader: it detects what a person wants from
their own words, not from the repository's 48 examples. Those are a check; nothing is chosen on them.

## 1. The short answer

**Is fine-tuning justified now?** The prototype report said no (`reports/qwen3-browser-prototype.md`, last section), for three reasons.
The evidence since then changes two of them. It confirms the first:

| report's reason | what changed (measured, section 2) | still true |
|---|---|---|
| Latency: 30-40 s per message even with a short context, on the 4-vCPU VM | The shipped prompt is 1,790 tokens. A fine-tuned reader needs a 30-token system prompt. It writes 17 tokens (p50) for a 1-2-request message instead of 47. In wllama on this laptop (one thread, loaded), decoding at a short context takes 0.64 s per token against 1.53 s at the shipped context. | **Still the blocker.** Estimated from those rates (section 6), a fine-tuned 1-2-request message here, under load, in one thread, takes about 29 s (p50) with names only. With the drawing it takes about 63 s (p50) and 120-165 s (p90) when the drawing must be read again, which is the usual case because it changes after every executed message. It falls to about 24 s only when the drawing is still in the cache. The research bar was 10 s at p95. The time does not depend on training, so Q0.7 settles it before any training (D5). |
| Calibration needs about 11 hours of browser readings | A native llama.cpp reader with the same contract runs here on the CPU (loaded) at a median of 5.9 s per message for the shipped prompt. Runaway outputs (8 of 98 past 512 tokens) make the mean 12-25 s, so about 1,100 calibration messages take 4-8 hours here. It runs faster on the GPU, and the fine-tuned format writes 3x fewer tokens. Its records go through the same scorer. | **Not yet.** The parity smoke test against wllama already fails the gate set in Q0.2: 5 of 7 outputs identical, token log-probabilities differ by up to 0.72 on identical outputs, and one divergence is not a near tie. Native b12099 records cannot stand in for the browser's probabilities. The way out is b11364 native, wllama's own build, if it matches (D3), or calibrating in the browser runtime itself, in parallel one-thread instances (section 7). |
| Training memory: full fine-tuning does not fit in 6 GiB | LoRA from the shipped weights themselves. "No training" writes back the shipped file byte for byte, and the return path is built and self-tested. A CPU overfit test passed: 20 of 20 training rows decoded exactly after 100 LoRA updates. | The GPU probe and the GPU overfit gate are not run (the card was busy). |

There is also new evidence on quality:
- On `nl_a`, the encoders read 5-9% of the requests and the two teachers agree on 72.2%. 33.6% of the requests need the drawing. (SOP-BERT 8.7% with either teacher by the current scorer; 9.2% in the score files of 20:31, before the scorer changed.)
- The shipped Qwen reader on `nl_a` (a sample of 53 messages, snapshot of 22:05): 1 of 93 requested actions right, 14 wrong, 24 extras. On `collected_1` (all 52 messages): 3 of 44 right, 13 wrong, 13 extras. Prompting is not the way. This was read as such before the run (`training/qwen/finetune/PREREG_BASELINE.md`).
- The shipped JSON contract cannot express what the annotation writes. Even a perfect reader in that format gets 76.3% of `nl_a`'s development requests right against Opus, with 23 wrong.

So: **yes, as a gated experiment**, under the conditions below. **No**, as a commitment to ship a 639 MB reader: that decision comes at the end (Q5), against the encoders, for its cost. **Said plainly:** on today's evidence a fine-tuned Qwen in one WASM thread is a reader that answers in tens of seconds. It can be a careful second reader. It cannot be the one that acts while the person waits, unless D5 allows a faster runtime path (WebGPU) and that path is measured.

**How we go about it, in order:**

1. **Q0, no training.** First the real time per message on the reference machine (Q0.7): it does not depend on training and can stop the
   browser path at once. Then the shipped reader's baseline on every set, run natively; parity of native against wllama; a scorer and
   calibration for a reader that writes text; the GPU probe and the overfit gate on the GPU; a gate on the return path to the browser.
2. **Change what the model writes, not only its weights.** One line per request, `[trigger words] type key=value ...`, in the annotation's
   own form. It writes and reads back the gold of `nl_a` without loss (its own validator is still to be measured, Q0.4), in 3x fewer
   tokens than the JSON, with a 30-token system prompt instead of 1,790.
3. **Q1: the recipe on the encoders' data.** LoRA from the dequantized shipped GGUF, on the same 24,698 messages SOP-BERT and ModernBERT M1
   learned from. This is the fair comparison: same data, same sets, same scorer.
4. **Q2: the natural-language data that exists.** `nl_p1` (627 usable rows, 587 with a drawing) and the ModernBERT plan's M2 folders.
5. **Q3: the drawing in the prompt** (owner's approval, D2). This is what an encoder cannot take and a generative model can, at about
   113 tokens per message (p50).
6. **Q4: new data, only if the learning curve says so.** Texts by Claude writers. First labels by Opus 5.5 medium (a dialect choice:
   the pilot does not separate Opus, Sonnet and GPT on cross-family agreement, section 9). Second labels by gpt-6.1-sol high.
7. **Q5: the final test on a set no Qwen step has seen** (D9), export into the same GGUF container, the browser, and an adoption decision
   against the encoders.

**What would mean stopping** (section 11):
- the overfit gate fails;
- Q1 does not read more of `nl_a` than SOP-BERT on the same data, every request executed, or fails its absolute floors at the gate
  (Q1 b, c);
- the time bar on the reference machine cannot be met and the owner does not want a slow second reader (D5). This can be known before any
  training.

## 2. What was measured for this plan

All commands are in section 14; evidence files are in `reports/evidence/qwen3-finetune-plan/`.

| what | result |
|---|---|
| The pinned GGUF and the official base | GGUF SHA-256 `9465e63a…` = pin; `Qwen/Qwen3-0.6B` `model.safetensors` SHA-256 `f47f7117…` = Hub LFS hash, unchanged over all 24 revisions of the repo |
| Is the GGUF a Q8_0 of those safetensors? | **No.** Token embedding: byte-identical. The 113 F32 norms: equal. The other 196 Q8_0 tensors: median relative error 0.96% against the BF16 weights, where a standard Q8_0 of the same weights has 0.55%; up to 12% of a tensor's values more than one quantization step away, the largest 180 steps. The published BF16 weights are close to the GGUF's source but not it |
| Does the shipped Q8_0 re-quantize to itself? | Yes: all 18,624,512 blocks of all 197 tensors, byte for byte (every block has a value at ±127) |
| The return path | `write_gguf.py` writes weights into a copy of the shipped container; with the shipped weights unchanged it reproduces SHA-256 `9465e63a…`, 639,446,688 B |
| Native reader | `collect_qwen.mjs`: the page's own prompt, schema, validation, wires and score (`docs/js/qwen-contract.js`), through llama-server b12099 on the CPU, 6 threads, loaded. First message: 1,829 prompt tokens in 12.2 s; later messages reuse 1,800 cached tokens. Over 98 messages: median 5.9 s, p90 55.6 s; decoding median 55 ms per token; generated tokens median 81. 8 outputs ran past 512 tokens (up to 133 s), 1 to the 2,048 limit |
| Tokens, `nl_a` gold (610 messages, 800 requests), the GGUF's tokenizer | shipped system prompt in the template: **1,790**; a one-line system prompt: **30**. Message p50 / p90 / max: 17 / 47 / 283. Names turn: 34 / 62 / 299. **Drawing as SOP Lang: 113 / 223 / 360** (5 / 10 / 16 lines). Output per message: **JSON 47 / 95 / 376**, JSON without quotes 36 / 71 / 261, SOP Lang 16 / 44 / 231, **lines with trigger 16 / 46 / 206**, lines with whole span 23 / 62 / 277. Per request: JSON 46.3 mean, lines with trigger 16.5 |
| Prompt per message, all tokens | shipped: 1,824 / 1,852 / 2,089 (p50 / p90 / max). Fine-tuned with the drawing: 178 / 311 / 449 |
| Format ceiling (gold → format → the format's real parser → scorer), `nl_a` development, against Opus | **JSON contract 299/392 = 76.3%, 23 wrong, cost score 17.6** (the reader's own `validate` / `toNodes`). **Lines with trigger: 392/392, also with the direction of a resize compared** (written and read back, then the engine's parser; **without** a validator of its own yet, so this is the format's ceiling, not the reader's: Q0.4). JSON losses, counted over all 610 messages: descriptions by label 39, `scale` on resize 13 (so "shrink" cannot be written), `object` 10, `position` on duplicate 9, labels and names the teacher normalized that the validator blocks (about 25), help `topic` 4 |
| The scorer rejects wrong readers (same path) | writes nothing: 0 right, cost 0. Every action swapped: 2/392 right, cost −841. Each message given the next one's requests: 27/392 right, cost −940 |
| Baseline, the shipped reader, native (a sample, snapshot of 22:05, `baseline_q8_shipped.partial-2205.json`; the run was stopped at 22:15, resumable; the full run belongs on the GPU. One message, `nl-01-047`, has an error record in the snapshot caused by pausing the collector, not by the reader; it counts as not read there and was removed from the live file) | `nl_a` development, 27 messages: **0/61 right**, 8 wrong, 11 extras. Calibration half, 26 messages: 1/32, 6 wrong, 13 extras. `collected_1`, all 52: 3/44, 13 wrong, 13 extras. 5 of the 52 `collected_1` outputs invalid as a whole (4 filled the 16-request cap, 1 cut at the token limit); 101 requests blocked by validation. Floor beside it: 0 right, cost 0 (section 8) |
| wllama 3.8.1 in headless Chromium 148, this laptop, 1 thread, **loaded** (load 23-35 on 20 threads) | libllama `b11364-46ca246`, 1 thread, not multithreaded. Shipped reader: first message 790 s (1,844-token prefill at 300 ms per token); later messages 94-198 s, and 874 s for a 558-token runaway; decoding 1.53 s per token at about 1,850 tokens of context. Short prompt (30-token system prompt + drawing + message, 234-337 tokens): prefill 0.35 s per token for a fresh prompt and 0.47-0.52 s per token for new tokens after a cached prefix; decoding 0.64 s per token. **Parity smoke test** (`parity_check.mjs`, native rerun with top-2 log-probabilities): native re-runs repeat themselves exactly (7 of 7). Against wllama, **5 of 7 raw outputs identical** (6 of 8 in the first comparison). On the shared tokens the 99th percentile of the log-probability difference is 0.12, and the largest on an identical output is 0.72. Of the 2 divergences, 1 is at a near tie (0.06 nats) and 1 is not (0.37 nats). **The Q0.2 gate fails on every condition.** |
| SOP-BERT re-scored with the current scorer | `nl_a` development, every request executed: either teacher 36/412 = 8.7%; against Opus 35/392 = 8.9%; with the direction of a resize 33/392 = 8.4%. At its gate: 5 right, 2 wrong, 1 extra, cost −6.4. The 9.2% quoted elsewhere is from score files written before `score_arm.mjs` and `arm_lib.mjs` changed at 21:09-21:13 (`score_arm.mjs` now `cab3e964…`) |
| Overfit test on the CPU (`overfit_test.py`, loaded, 6 threads) | **Passed: 20 of 20 rows decoded exactly** after 100 updates of LoRA r=16 (10,092,544 trainable parameters, 196 modules) from the dequantized shipped GGUF, in the line format with the drawing. Loss on the target tokens 4.914 before, 0.00037 after. 25 s per update of 4 rows (98-284 tokens each), 46 minutes; peak RSS 8.41 GiB. The training tokenization (`tokenizer.json`) equals the GGUF's own (llama-server `/tokenize`) on all 20 rows |
| Blind labelling pilot, 40 long natural messages of `nl_a`'s calibration half, by engine effect | section 9 |
| Teachers' agreement on `nl_a` by writer | texts by gpt-6.1-sol: 291/426 = 68.3%, 103 wrong; texts by Opus: 293/374 = 78.3%, 38 wrong. By kind, lowest: indirect 53.3%, fragment 60.0%, dictated 66.7%, typos 66.7%, session 67.7%, long 68.3% |
| Training data in this format | `nl_p1` snapshot: 627 usable rows, 587 with a drawing, 733 requests; 79 session steps marked unreliable left out; 4 kept rows whose drawing replay failed get the names. The first-run list: 24,698 messages, 54,584 requests, 307 resize requests given the scale their shrink word implies. The older folders hold names only, no drawing (e.g. `synth_rules` 8,404 rows, `opus_train_c` 300). All rows checked so far write and read back losslessly |

Already known and not re-measured, from `reports/evidence/modernbert-parity-baseline/baselines/` (the scorer of 20:31):
- on `nl_a` development, every request executed, either teacher: SOP-BERT 9.2% (8.7% now, above), Rules 6.1%, first ModernBERT 5.1%;
- GPT against Opus 72.2% (283/392, 70 wrong, 20 extras, cost score −157.4);
- SOP-BERT at its cost-10 gate: 5 right, 2 wrong, 1 extra. Even the teachers score negative when every request is executed. On this language the gate decides the headline number, not the reader alone.

## 3. Why the shipped reader is not the thing to fine-tune as it is

- **Its format loses a quarter of the gold.** The JSON contract (`docs/js/qwen-contract.js:39,57`) allows only enum keys in a description (`quantifier, shape, color, notColor, recency`). It has no `scale` on resize, no `object` and no help `topic`, and it requires every name and label to be in the request's own quote. On `nl_a` development a perfect reader in this format gets 76.3% right against Opus and 23 wrong (cost score 17.6), before any model error. A fine-tune would learn to write what the format cannot carry.
- **Its prompt is 1,790 tokens of instructions.** In one WASM thread that made decoding about 2.5 times slower than with a short context (prototype report: about 1,150 against 450 ms per token on the VM), and it caused the 6-minute first prefill. A fine-tuned model does not need the instructions.
- **It cannot see the drawing.** It gets the names only (`userContent(names, text)`). 33.6% of `nl_a`'s requests need more than the message writes.

So the plan changes two things in order, each measured: what the model writes, which also cuts the prompt, and its weights. The drawing comes after, as its own arm.

## 4. What is fine-tuned

- **Base weights: the shipped GGUF itself, dequantized to FP32** (`qwen_lib.load_gguf_weights`). Measured: every Q8_0 block round-trips through the reference quantizer, so an untrained model written back is the shipped file. The baseline being collected is therefore exactly the zero of every arm. The published `Qwen/Qwen3-0.6B` BF16 weights differ from the GGUF beyond quantization noise (section 2). Training on them would change the zero, and the gain would mix two things (D7).
- **LoRA, not full fine-tuning.** r = 16, alpha = 32 on q, k, v, o, gate, up and down in all 28 layers (196 modules); never the tied embedding (155.6M of the 596M parameters). Full fine-tuning with AdamW needs, for about 440M trainable parameters, FP32 master weights, FP32 gradients and two moments: about 6.6 GiB before activations and the embedding (arithmetic, not measured). It does not fit the 5.8 GiB free. Full fine-tuning without Adam is in the probe for completeness.
- **Return path**: merge the LoRA delta into the FP32 weights, re-quantize with the reference Q8_0 rule, and write into a copy of the shipped container at the same offsets (`write_gguf.py`). Tokenizer, chat template and metadata stay byte-identical. The size stays 639,446,688 B, under the 800,000,000 B limit with no other quantization. No external converter is needed. Self-test passed (section 2).
- **Training precision**: BF16 base and autocast on the GPU, LoRA weights and their optimizer in FP32. The base the model trains on is then the BF16 rounding of the exact Q8 values. Two checks measure what that costs:
  - Q0.6 zero arm: the untrained BF16 model, teacher-forced, against the shipped GGUF's per-token log-probabilities;
  - Q0.6 export: the merged model against its exported GGUF.
- **GPU (pending, Q0.5)**: `gpu_probe_qwen.py` measures LoRA at batch × length 4-32 × 256-1,024, with and without gradient checkpointing, and the two full variants. Estimate until then, by arithmetic: a LoRA step costs about 4 × 0.44 GFLOP per token (forward plus activation gradients through the frozen weights). One epoch of the first-run data (24,698 messages, about 250 tokens each in this format) is about 6M tokens, so about 30-60 minutes per epoch on this card.
- **Overfit gate.**
  - CPU check: 20 `nl_p1` rows, 100 updates, pass = every row's target decoded exactly. The loss of the 4-row batch on the target tokens: 0.615 at update 10, 0.152 at 20, 0.051 at 30, 0.00042 at 90. **Passed: 20 of 20 rows decoded exactly** at update 100 (loss on all 20 rows' target tokens 4.914 before, 0.00037 after). This says the format and the pipeline can be learned from the shipped weights; it says nothing about reading new text.
  - The gate the arms depend on (Q0.5, GPU): 200 rows of the arm's own data, at most 400 updates, ≥ 99% of the rows decoded exactly, before every run. This is the check that showed the first ModernBERT's underfit in minutes. It is run before any data work.

## 5. What the model reads and writes

**Output: one line per request**, the annotation's own `{trigger, type, args}`: `[get rid of] command action=delete target=Pump`, with `mention(...)` and `$new` inline as `ANNOTATION_SPEC.md` writes them (`lines_format.mjs`). Nothing when the message has no request.
- It is lossless on the gold, by construction: it is the annotation's own form. On `nl_a` development it reads back 392/392, also with the direction of a resize. The broken-on-purpose readers fail on the same path, so the scorer can tell. Every training row checked so far writes and reads back the same wires (`make_examples.mjs`). Its validator is not measured yet (Q0.4).
- **A word for smaller with no scale**: the annotation leaves `scale` out on 307 of the 959 resize requests of Q1's data ("just make it smaller"; `make_examples.mjs` over the first-run folders: 24,698 messages, 54,584 requests, the counts of the ModernBERT plan), and the engine's resize without a scale grows the shape. The training target writes the scale the engine replay uses (`scale=0.67`, the rule of `parity_lib.mjs` `goldProgram` and of `ANNOTATION_SPEC.md`). `make_examples.mjs` counts the rows it adds it to; L2's label fixes replace this when they exist. Every threshold in this plan is read with the direction of a resize compared (section 8).
- It is read by a small line parser, then the engine's own parser (`K.parse(goldProgram(...))`). Validation is the engine's legend check plus three rules: the trigger must be in the message, a name must be on the drawing or written in the message, and every key must be one its act takes. The JSON contract's rule "names and labels inside the request's quote" is dropped, because it blocked about 25 of the teacher's own correct labels. It becomes "the words of a label are in the message" (anywhere in it, not only in the request's quote), and the oracle counts what that still blocks on the gold (Q0.4). Accepting a label the message writes as number words ("twelve thirty" for 12:30) would need a word-to-number table. That is a hand-written equivalence AGENTS.md forbids unless it is a listed mechanical step. It is the ModernBERT plan's number-word question (its D2, arm L1), so it is offered only as a separate, approved step with what is lost without it measured (D1).
- **Why the trigger, not the span**: the scorer pairs requests by action and values first, and uses spans only to break ties (`training/sketch/layer_common.mjs:131-134`). The trigger costs 3.8 tokens per request (16.5 against 12.7 without it) and gives the words a held request is about (AGENTS.md: say which words). The whole span costs 23.3.
- **Bounded output**: a GBNF grammar built from the legend (types, act names, keys per act, enum values; free text only inside quotes and `mention(label=…)`). wllama takes a grammar as llama.cpp does. Whether a grammar is needed after fine-tuning is measured in Q1: the share of outputs that fail the parser with and without it.

**Input: a one-line system prompt, then the drawing or the names, then the message** (`make_examples.mjs` `userTurn`):

```
<|im_start|>system
Write the diagram editor requests in this message, one per line.<|im_end|>
<|im_start|>user
Drawing:
@c1 command action=create shape=rectangle ... name=Grill
...

Message:
Walk-in: blue rectangle<|im_end|>
<|im_start|>assistant
<think>

</think>

[Walk-in] command action=create shape=rectangle color=blue name=Walk-in<|im_end|>
```

The thinking switch stays the template's own empty think block, exactly as the shipped reader renders it. Rows with no setup get "Names on the canvas: …" (Q1, Q2), as SOP-BERT reads names. The drawing (Q3) is `K.worldSOP` of the drawing the person sees: the same mechanical serialization in training and in the page, listed as a mechanical step and measured by what is lost without it (the Q3 control).

**What this does to the time per message** (token counts measured):
- the whole prompt: 1,824 → 178 tokens (p50), 2,089 → 449 (max). Most of it is cached between messages, so what counts is below.
- new prompt tokens per message, the part that is read each time:
  - shipped: 26 (p50) and 57 (p90), from the native records' `prompt_n`;
  - fine-tuned with names only: about the same;
  - fine-tuned with the drawing: 25 / 55 when the drawing is the cached prefix, 148 / 281 when it must be read again. The drawing changes after every executed message. Whether the cache keeps most of it (shapes appended at the end) is measured in Q0.7;
- output for 1-2-request messages: 17 tokens (p50), 36 (p95);
- context while decoding: about 1,850 tokens → about 200-450. That is where the shipped reader loses most of its time: 1.53 against 0.64 s per token here.

The time model per message is `new prompt tokens × prefill time per token + output tokens × decode time per token at that context`; section 6 fills it in. The 6-minute first prefill of the shipped reader disappears: the fixed part is 30 tokens.

## 6. Back to the browser

1. **Export**: `write_gguf.py --weights merged.pt` (section 4). Size 639,446,688 B, unchanged by construction. No other quantization is proposed. A smaller file (Q4) would change the model the calibration was fitted on, and it is not needed under the limit.
2. **Runtime**: wllama 3.8.1 as shipped, one thread, `n_gpu_layers: 0` (owner's settings of 2026-11-04, QWEN3_PLAN A).
   - `n_ctx` falls from 6,144 to 1,024. The longest fine-tuned prompt measured is 449 tokens; the KV cache at FP16 is 112 KiB per token, so 112 MiB instead of 672 MiB.
   - `max_tokens` falls from 2,048 to 256. The longest gold output on `nl_a` is 206 tokens. The shipped reader ran past 512 tokens on 8 of 98 messages, and a trained model can loop too. A cut output is held whole, as now, and the share of cut outputs is reported with every arm.
   - A request that does not fit is held, as now.
3. **Parity**: Q0.2 for the shipped model, and the same gate for every exported arm. Smoke test so far: 6 of 8 raw outputs identical, native b12099 against wllama b11364 (6.1).
4. **Time per message** (6.1 has the measurements). The model below is for a fine-tuned 1-2-request message, from rates measured on this laptop in one thread **under load**:

   | case | new prompt tokens | output tokens | estimate |
   |---|---:|---:|---:|
   | drawing cached, p50 | 25 | 18 | 25 × 0.5 + 18 × 0.64 ≈ 24 s |
   | drawing cached, upper (p90 prompt, p95 output) | 55 | 37 | ≈ 51 s |
   | drawing read again, p50 | 148 | 18 | 148 × 0.35 + 18 × 0.64 ≈ 63 s |
   | drawing read again, upper (p90 prompt, p95 output) | 281 | 37 | 281 × 0.35-0.5 + 37 × 0.64 ≈ 122-164 s |
   | names only (Q1, Q2), p50 | about 35 | 18 | ≈ 29 s |
   | the shipped reader, measured | 26 (cached prompt) | 81 median | 94-198 s; 874 s for a runaway |

   - Unloaded the rates are lower; how much lower is not measured (the ModernBERT session loaded the CPU all evening).
   - The prototype's VM decoded at about 450 ms per token at a 41-token context.
   - The owner's Mac: not measured (D5).
5. **What tens of seconds per message mean.**
   - The reader cannot be the one that acts while the person waits.
   - It can only be what the page has now: a second reader that answers later in its own tab, or one that reads only the messages the fast reader held. That is a use the owner decides (D5).
   - On these numbers the research bar (10 s p95) is not met in one WASM thread, with or without fine-tuning. Faster needs another runtime path (WebGPU, in wllama 3.8.1 but switched off by the owner's setting; multithreading needs headers GitHub Pages cannot send).
   - It is not a reason to drop the experiment before its quality is known. It is the reason the time is measured first (Q0.7) and the adoption bar includes time.

### 6.1 Measured in the browser (wllama 3.8.1, headless Chromium 148, i7-12700H, one thread, loaded)

`wllama_bench.mjs`, evidence `wllama_bench.q8-shipped.json`. Load average 23-35 on 20 threads during the run (the ModernBERT session's CPU jobs and this plan's native collector and overfit test). The runtime reported 1 thread, not multithreaded, libllama `b11364-46ca246`.

| | prompt tokens read | prefill | generated | decode | per message |
|---|---:|---:|---:|---:|---:|
| Shipped reader, first message | 1,844 | 554 s (300 ms/token) | 176 | 236 s (1.34 s/token) | 790 s |
| Shipped reader, 6 later messages | 14-41 new (1,804-1,827 cached) | 1.32-1.72 s/token | 49-76 | 1.35-1.81 s/token | 94-198 s |
| Shipped reader, a runaway | 11 new | | 558 | 1.54 s/token | 874 s |
| Short prompt (30-token system prompt + drawing + message), 6 `nl_a` messages, 40 tokens forced | 334 first, then 17-43 new (217 cached) | 0.35 s/token for the first 334; 0.47-0.52 s/token for new tokens after the cache | 40 | 0.59-0.70 s/token, 0.64 overall | 32-46 s (144 s for the first) |

Native b12099 against wllama b11364, same settings (`parity_smoke.json`):
- raw output byte-identical on 6 of 8, then 5 of 7 in a native rerun with top-2 log-probabilities (native repeats itself on 7 of 7);
- 920 shared tokens: |Δ log-probability| p99 0.12, largest 0.49; on outputs that are identical, the largest is 0.72;
- divergences: `col-0001` at a near tie (0.06 nats), `col-0007` at 0.37 nats.

So the two runtimes do not compute the same probabilities. This is a different build (b12099 against b11364) and also native CPU code against WASM SIMD; which of the two causes it is not known. A confidence fitted on these native records would not be the browser's. Q0.2 decides with b11364 native if allowed (D3). An unloaded rerun of the timing is part of Q0.7.

## 7. Confidence

- **Source**: the runtime's own token probabilities (llama.cpp `n_probs`, pre-sampling, verified for the pinned build in the prototype). Never a number the model writes about itself.
- **Signals per request** (declared before any fit; `top_logprobs: 2` instead of 1, so that the margin is there; same runtime cost):
  - the shipped score: the minimum over the request's fields of the mean token log-probability;
  - the log-probability of the act tokens;
  - the smallest top-1 minus top-2 margin over the request's value tokens;
  - the mean log-probability of the trigger words;
  - the request's index and the number of requests in the message;
  - the message length in tokens;
  - a field's token without a probability makes the request held, as now.
- **Fit**: `calibrate_qwen.mjs`, a new file. It uses the same protocol as `calibrate_arm.mjs`: five message folds, fold-local percentile tables, the L2 grid {.01, .1, 1, 10}, the cost-10 threshold chosen on out-of-fold scores, fail closed. It fits on the calibration parts of fresh2, short3 and `nl_a`, never on a development or test part. `calibrate_arm.mjs` cannot be used as it is: `fitModel` reads the 24 encoder features of `calibrate_modernbert.mjs` NAMES, and a record without them gets a missing value read as percentile 1, a constant confidence (`neural-confidence.js:111-112`). `confidence()` itself is reused: it reads the feature list from the file.
- **Tests before use** (`test_qwen_calibration.mjs`):
  - shuffled scores give AUROC 0.5 ± 0.05 and a threshold that asks everything;
  - a fit on outcomes that are all right refuses;
  - records with a missing signal are never executed.
- **A held request is explained** from the weakest field and the trigger: "not sure about the colour in 'paint the big one'". The field name maps to the legend question, and the trigger is the quoted words. The prototype's generic sentence for a reason with a digit is avoided (QWEN3_PLAN B5).
- **Where calibration comes from.**
  - **Native records, only if the parity gate passes** (Q0.2). The smoke test fails it with b12099 (section 6.1). About 1,100 calibration messages would take 4-8 hours on the loaded CPU for the shipped reader, minutes to an hour on the GPU (not measured), less for the fine-tuned format (3x fewer tokens, capped at 256).
  - **Otherwise, in the browser runtime itself**: wllama 3.8.1 in headless Chromium, as the page runs it, in parallel instances of one thread each (`wllama_bench.mjs` is the start; this machine has 20 threads). At the loaded per-message estimates of section 6 (about 24-63 s for a fine-tuned message), 8 instances would read 1,100 messages in about 1-2.5 hours (estimate). The records are then the browser's own, and parity is not needed for calibration, only for training-side checks.

## 8. Measuring: the same sets, the same scorer, and what changes for a reader that writes text

- **Sets** as `training/neural/parity/sets.mjs` and the ModernBERT plan section 4:
  - `nl_a`: calibration and development halves;
  - fresh2 and short3: calibration and test parts;
  - `collected_1`, `scenes_test`;
  - the final set once, at Q5 (D9).
  Nothing is trained on them. The examples are reported only. `scenes_r3` and `scenes_r3b` (Q2's data) hold the texts of 792 built-in example messages, so from Q2 on the examples' numbers are fit, labelled as such per `training/neural/parity/SPLIT.json`.
- **Same records**: `collect_qwen.mjs` writes `arm_lib.mjs` `buildRecord` records, plus a `qwen` field: raw output, validation, scores, tokens with their top-2 log-probabilities, timings. Its manifest is the one `loadRecords` requires: complete, with count and hash, the SHA-256 of the scoring code it imported, and the overlap check below.
- **Training and evaluation overlap**: an evaluated message with the id of one of the arm's training examples is refused. One with the same text is refused, or with `--allow-text-overlap` marked in its record (`in_training`) and reported apart. This is the rule of `collect_set.mjs`. ModernBERT's M1 found such overlaps on the same data: 5 `nl_a` messages, 28 in fresh2 + short3, 2 in `scenes_test`. A generative model can copy a message it trained on.
- **The scoring variant**: every threshold in this plan is read with the direction of a resize compared (`score_arm.mjs` `direction`), against Opus on `nl_a`, with `either` reported beside. `docs/js/bench-canon.js` skips `scale`, so the `today` variant scores a shape grown on "shrink" as right.
- **Pinned scorer**: `score_qwen.mjs` writes the SHA-256 of `score_arm.mjs`, `arm_lib.mjs` and the code they import into its output, and `collect_qwen.mjs` into its manifest. Another session still changes those files. Every comparison re-scores both arms with the same code (e.g. SOP-BERT's 9.2% became 8.7% with the scorer of 21:13).
- **What must change for a generative reader**:
  - `collect_set.mjs` takes only `modernbert`, `sop` and `rules`. Qwen has its own collector, which talks to a llama-server (native) or to wllama (browser).
  - `score_arm.mjs` `scoreArm` refuses a reader without a confidence file unless it is the Rules (`:219-220`). The baseline and every-request-executed scores call `scorePart` directly (`score_qwen.mjs`). At the gate it takes the Qwen confidence file, whose `artifacts` must equal the records' (already checked there).
  - `calibrate_arm.mjs`: section 7.
  - `compare_arms.mjs` reads score files and works as it is.
  - Spans: a produced request's span is its trigger's place in the message. Pairing does not need more (section 5). The record's `cause` field (cutter or heads) means nothing for Qwen. The root-cause analysis uses: format or parse, validation, act, value, reference, extra request, missing request.
  - Seen and unseen triggers: the arm's own `trigger_inventory.json`, built from its training rows' triggers as for the encoders.
- **Floors, published with every result**: a reader that writes nothing (0 right, cost 0), and the broken-on-purpose readers of the format oracle (section 2). `score_qwen.mjs` refuses to print a result when its own floor is not exactly empty in every view. That check was added after the review found the floor inheriting the reader's cached teacher view; the bug is fixed.
- **The baseline (Q0.3)**, the shipped reader natively:
  - **sample, snapshot of 22:05** (`score_qwen.mjs --partial`, `baseline_q8_shipped.partial-2205.json`; every validated request executed; the run was stopped at 22:15 and resumes from its file):

    | set, part | messages | right | wrong | extras | cost score | writes nothing |
    |---|---:|---:|---:|---:|---:|---:|
    | `nl_a` development, against Opus | 27 | 0/61 | 8 | 11 | −311 | 0 |
    | `nl_a` calibration, against Opus | 26 | 1/32 | 6 | 13 | −591 | 0 |
    | `collected_1`, against the gold | 52 | 3/44 | 13 | 13 | −584 | 0 |

    5 of the 105 outputs fail validation as a whole (all in `collected_1`): 4 filled the cap of 16 requests, 1 was cut at the token limit. 101 requests are blocked one by one, by the validation rules section 3 lists. 8 outputs exceed 512 generated tokens. Time per message p50 / p90: 4.6 / 31 s on `collected_1`, 10.9 / 72 s on `nl_a` development (loaded CPU, nice 19);
  - the full run of all sets goes to the GPU after 07:00 (minutes).
  - Read as fixed in `training/qwen/finetune/PREREG_BASELINE.md` (written before it finished).

## 9. Data

**What exists for this reader** (`make_examples.mjs`; counts from `data_inventory.txt` and section 2):

| data | messages | drawing | use |
|---|---:|---|---|
| The first-run list (11 + 12 folders of `ALL_DATA.md`/`EXTRAS`), the encoders' data | 24,698 | names only | Q1: the same data as SOP-BERT and ModernBERT M1 |
| ModernBERT M2 folders: `scenes_r3`, `scenes_r3b`, `opus_r3_gaps`, `opus_tgt_1/2`, `ops_groups`, `ops_positions`, `opus_short_r2` | about 3,700 | names only | Q2 |
| `nl_p1` (being labelled; snapshot by SHA-256 of each file at the run) | 706 texts; 627 usable now, 587 with a drawing (4 kept rows whose drawing replay failed get the names, flagged); Opus labels and gpt-6.1-sol second labels on all 706 | setup and sessions | Q2, Q3 |
| `nl_a`, fresh2, short3, `collected_1`, `scenes_test`, `nl_b` | | | never trained on |

Only `nl_p1`-style rows carry a drawing. The drawing arm (Q3) therefore learns from about 600 rows unless Q4 writes more. That is the main data gap for this reader.

**The blind labelling pilot** (`pilot_score.mjs`; 40 messages of `nl_a`'s calibration half, non-session, paraphrase rows capped at their 28.3% share; one brief, `ANNOTATION_SPEC.md` only; first pass, no engine; scored on each row's setup by engine effect, loose tolerance, answers compared):

The first teacher of `nl_a` is Opus 5.5 medium, the same model and effort as the Opus annotator here. So the columns against Opus, and "either", include the annotator's agreement with itself. **The accuracy measure is the other family's teacher.**

| annotator | same effect as the other family's teacher (all, of 40) | same, rows that need the drawing (of 15) | same effect as either teacher | per requested action, against Opus's labels | effect equal to its own family's first pass | tokens, time |
|---|---:|---:|---:|---:|---:|---:|
| Haiku 5.5, medium | 27 (GPT) | 8 (GPT) | 30/40 | 35/52 = 67.3% | 29/40 (Opus) | 139,660, 154 s |
| Sonnet 5.5, medium | 32 (GPT) | 11 (GPT) | 33/40 | 37/52 = 71.2% | 30/40 (Opus) | 121,577, 129 s |
| Opus 5.5, medium | 32 (GPT) | 12 (GPT) | 38/40 | 45/52 = 86.5% | **37/40** (Opus) | 120,852, 164 s |
| gpt-6.1-sol, high | 33 (Opus) | 11 (Opus) | 36/40 | 42/52 = 80.8% | 33/40 (GPT) | 43,050 (Codex) |
| gpt-6-astra, xhigh | 33 (Opus) | 10 (Opus) | 34/40 | 40/52 = 76.9% | 29/40 (GPT) | 44,490 (Codex) |
| the `nl_a` GPT labels, same rows | | | | 41/52 = 78.8% | | |

All five wrote every row, changed no text, and every wire writes and reads back in the line format. The "needs the drawing" split here uses a wire check (a teacher's wires hold a mention, or a name the message does not write), not the word check behind the 33.6%.

**What the pilot shows, and what it does not:**
- **Accuracy across families does not separate Sonnet, Opus, GPT and Astra:** 32-33 of 40, and 10-12 of 15 on the rows that need the drawing. Haiku is lower (27, 8). 40 messages cannot resolve a difference of 1-2.
- So the ModernBERT pilot's finding, that Sonnet labels as well as Opus, is not contradicted on long natural messages. Its Sonnet-for-second-labels choice was already changed to GPT by that session (runlog).
- What separates them is **self-consistency**: Opus repeats its own first pass on 37/40 messages, GPT on 33/40. That matters more for a model that copies its labels than for an encoder with heads, together with:
  - **one dialect**: rows with the same effect but other wires (Opus 6, GPT 5, Sonnet 5 of 40) split the probability between two outputs and lower the token probabilities the confidence is built from.

**Decision, with D6:**

| job | model, effort | why |
|---|---|---|
| Training texts, most | Sonnet 5.5, medium | Texts only, saved before any label. Texts have no right answer, and the pilot was about labels. As AGENTS.md assigns data writing |
| Terse, typo-heavy, dictated texts | Haiku 5.5, medium | Variety and cost; texts only |
| One writing session in four | Opus 5.5, medium | Keeps that writer's style in the mix |
| First labels, the training targets | **Opus 5.5, medium** | **A dialect choice, not an accuracy result**: as accurate as the others across families (32/40), and the most self-consistent (37/40), so a model that copies it sees one answer per message. It is also the dialect of `nl_a`'s first teacher, which flatters it on `nl_a`; that is why every result is also read against the other teacher, and the final set against both. Sonnet 5.5 medium is the cheaper alternative the pilot does not rule out (D6) |
| Second labels, independent check | gpt-6.1-sol, high (Codex) | 33/40 against the other family, and a different family, so its disagreements mean something. **Never training targets**: one dialect |
| Disagreements | Opus 5.5, high; gpt-6-astra xhigh as a third opinion | Few rows. Not measured |
| The final set's texts (D9) | gpt-6.1-sol, high, as writer | A writer family not used for training texts (the ModernBERT plan's rule). Its texts are the harder ones: the teachers agree on 68.3% of requests in GPT-written `nl_a` texts against 78.3% in Opus-written ones |

The writer and annotator separation of AGENTS.md is kept:
- texts are saved before any label;
- the coordinator checks that the annotated texts are byte-identical to them;
- a disagreement stays in the data with a flag, and is never dropped;
- every folder has a README naming the model, effort and session evidence.

**Cost of a round** of 1,500 messages, from the pilot's tokens: first labels by Opus at about 3,000 tokens per message is about 4.5M tokens. Second labels by GPT at about 1,100 per message is about 1.6M Codex tokens. Texts: about 15 writing sessions. Estimates. The weekly Claude limit is shared with the ModernBERT session (D6).

## 10. The arms: one change each

The rules of AGENTS.md (Experiments) apply to every arm:
- each arm is written out and shown to the owner before it runs;
- a miss stops the line and is reported;
- no setting is chosen on held-out data;
- a root-cause analysis follows every evaluation, separately for seen and unseen triggers.

Every arm is followed by its overfit-gate record, its own-rows fit and its export parity. GPU work runs one arm at a time, with the GPU lock.
Every threshold is read with the direction of a resize compared, against Opus on `nl_a` (either teacher beside), with both arms re-scored by
the same pinned scorer (section 8). "No loss shown" means: the paired difference has its 95% interval below 0 on none of the sets named.
**Order: Q0.7 (time) first.** It does not depend on training, and it can end the browser path before anything else is spent.

### Q0. Tools, baselines, gates (no training)

1. `collect_qwen.mjs` (written; runs). `score_qwen.mjs`: `scorePart` per set and part, floors beside it.
2. **Native against browser, a gate.**
   - At least 30 messages from the calibration parts, shipped model, `top_logprobs: 2`.
   - **It passes when:**
     - ≥ 90% of the raw outputs are byte-identical;
     - on identical tokens, the 99th percentile of |Δ log-probability| ≤ 0.02;
     - every divergence happens where the native top-1 / top-2 margin is < 0.1 nats (a near tie, not a different model). The margin is taken before the grammar, so the second token may be one the grammar forbids; that makes the rule stricter, not looser;
     - on identical outputs, every token's |Δ log-probability| ≤ 0.02, which bounds the difference of every request score (a mean of them).
   - Tool: `parity_check.mjs` (written; checks all four).
   - Native b11364 (wllama's own libllama) is preferred (D3); b12099 is what is on this machine and **already fails this gate on the smoke sample** (section 6.1).
   - **On a miss**: calibration, and every evaluation that feeds a threshold, runs in the browser runtime in parallel headless instances (section 7), with its time reported. Native records are used only for development numbers and labelled as such.
3. The baseline on all sets, the shipped reader, natively (GPU after 07:00). Also its drawing variant (`DRAWING=setup`): does the untuned model use the drawing? Reported, not gating.
4. The format oracle and the example builder (done). The line parser and **validator** as the page will run them, run in the oracle on the gold of `nl_a` and of every training folder. **It passes when** ≥ 99.5% of the gold requests pass the validator and read back to the same wires, every loss listed by cause. **On a miss**: the validator rule that blocks the gold is changed before D1 is put to the owner, and the oracle is run again. A validator that blocks correct gold would train the model to be held.
5. GPU probe, and the GPU overfit gate on 200 rows (section 4). **It passes** at ≥ 99% of rows decoded exactly within 400 updates. **On a miss**: stop. The next proposal (a higher learning rate, or r = 32) is a new declaration.
6. **Two parity checks, 50 messages each, teacher-forced on the native run's prompt and output tokens:**
   - **zero arm**: the untrained model in BF16 (the training base), against the shipped GGUF's per-token log-probabilities. It measures what training on BF16-rounded Q8 values costs;
   - **export**: the merged model in FP32, against its exported GGUF.
   - **Each passes when** the greedy outputs are identical on ≥ 95% of messages and the 99th percentile of |Δ log-probability| ≤ 0.05.
   - This is the generative form of the ModernBERT plan's PyTorch-against-Node check.
7. **Time on the reference machine.**
   - The shipped model, with a 30-token system prompt and 16-46 generated tokens, in wllama, one thread. Not loaded, on this laptop and on a machine the owner names (D5).
   - p50 and p95 per message for 1-2-request messages, the prefill rate and the decode rate.
   - The fine-tuned model's time is the same computation (same weights shape). So the time bar of Q5 can be judged before any training, with one caveat: a trained model can loop. `max_tokens` 256 bounds it, and the share of cut outputs is reported per arm.
   - Also measured: how much of the drawing the prompt cache keeps from one message to the next in a session (`nl_a` sessions, the drawing replayed).
8. The per-request score for the line format: `tokensOf` / `scoreRequests` locate fields by JSON offsets, so splitting a line into its act, `key=value` fields and the end of the line for scoring is new code, with its tests. `calibrate_qwen.mjs` and its tests (section 7). Code review of all Q0 code (`code-reviewer`, Opus 5.5, max, as the ModernBERT plan).

### Q1. Fine-tuning on the encoders' data (the recipe and the format)

- **Change.** LoRA as section 4, the line format and short prompt of section 5, names only (no drawing). The first-run data: the same 24,698 messages and 54,584 requests as its manifest. The labels are the same except 307 resize targets, which carry the scale their shrink word implies (section 5). SOP-BERT was trained without it. So Q1 is also reported with the `today` scoring, which does not compare the direction, and the SOP-BERT trained on the same relabelled rows by the ModernBERT plan's L2 arm is the second control if it ran. Recipe fixed once, not tuned: lr 2e-4, cosine decay after 3% warm-up, 2 epochs, 32 rows per update, AdamW without weight decay, seed 0, loss on the output and its `<|im_end|>` only.
- **Hypothesis.** The pretrained model's English plus the same labels (and the implied scales) read natural language better than SOP-BERT on the same messages.
- **Measure.** The sets of section 8, every request executed and at its own cost-10 gate. The own-rows fit on 1,000 training rows. Seen and unseen triggers. The control is the shipped SOP-BERT, which was trained on these rows, and M1 if it passed.
- **It worked when all hold:**
  - (a) on 1,000 of its own training rows, ≥ 95% of requests right by the scorer;
  - (b) `nl_a` development, every request executed: Q1's right share minus SOP-BERT's (8.4% against Opus with the direction, current scorer), lower end of the 95% interval above 0. The interval resamples as `compare_arms.mjs` does: the session, else the paraphrase group, else the message, because messages inside one are not independent. `compare_arms.mjs` compares cost scores only; the right share is the same computation with a cost of 0, a small extension made in Q0.1 and reviewed with it. This is where reading shows: SOP-BERT's gate on `nl_a` is negative (−6.4), so a difference of gated cost scores passes a reader that does almost nothing (the review measured: 8 right and 0 wrong would pass);
  - (c) `nl_a` development at Q1's own cost-10 gate, absolute floors, so that doing nothing fails: cost score > 0, ≥ 5% of requested actions right, ≤ 5% of executions wrong;
  - (d) fresh2 + short3 test: Q1 minus SOP-BERT, paired cost score at each one's gate, lower end above −10 (the M1 rule: not much worse on the old language);
  - (e) parse or validation failures ≤ 1% of messages, and outputs cut at 256 tokens ≤ 1%.
- **On a miss:**
  - (a) fails: the recipe underfits. This is reported, and a new declaration follows.
  - (b) or (c) fails: the Qwen line stops. The encoders give the same reading at a fraction of the cost (section 11).
  - (d) or (e) fails: reported; the owner decides whether Q2 goes on (a loss on short commands is what AGENTS.md says makes a reader useless).
- Time: about 1-2 hours on the GPU for 2 epochs (estimate; probe pending), then the native collection of all sets (under an hour on the GPU).

### Q2. The natural-language data that exists

- **Change.** Q1's data plus the M2 folders and `nl_p1` (snapshot hash), names only. The control is SOP-BERT trained on the same list, or the ModernBERT arm on the same list if one ran.
- **Hypothesis.** Natural messages widen what it reads.
- **It worked when:**
  - the cost score on `nl_a` development minus Q1 has its 95% interval above 0;
  - it is below 0 on none of fresh2, short3, `scenes_test`.
- **Learning curve, also:** the natural folders at 25%, 50% and 100%, seeds 0 and 1. This decides Q4.

### Q3. The drawing in the prompt (D2)

- **Change.** The user turn holds `K.worldSOP` of the drawing, where the row has one: 587 `nl_p1` rows, and the scene sessions if their drawings can be replayed. The rest keep names.
- **Hypothesis.** Requests that need the drawing are read right far more often, with nothing lost elsewhere.
- **Measure.** On `nl_a` development, the requests that need the drawing (word check, 33.6%) against the rest. The time per message at the longer prompt (178 tokens p50, 449 max).
- **It worked when:**
  - on the requests that need the drawing, right share minus Q2's (every request executed) has its 95% interval above 0;
  - on the rest, no loss shown (the paired interval of the cost score is not below 0);
  - the confidently-wrong rate at the gate (wrong executions over executions) is not higher than Q2's by more than 1 point.
- **Control**: the same model at test time with the drawing replaced by names. This is the "what is lost without this step" AGENTS.md asks of a mechanical step.

### Q4. New data, only if the data says so

- **Runs only if** going from 50% to 100% of the natural folders raised the cost score on `nl_a` development by ≥ 2 points with its interval above 0, or the root causes of Q3 name forms the data lacks (the owner's rule for M3, runlog).
- **Change.** One round of about 1,500 messages by section 9, mostly with drawings, plus paraphrase groups.
- **It worked when:**
  - the cost score on `nl_a` development rises by ≥ 2 points with its interval above 0;
  - the unseen-trigger and paraphrase numbers do not fall;
  - no loss is shown on fresh2, short3, `scenes_test`.
- A second round needs a new declaration.

### Q5. The final model and the adoption decision

1. The final set, read once (D9). `nl_b` is being written now for ModernBERT (its folder appeared at 21:43), before any Qwen arm runs. If it is shared, no Qwen tool, brief, root-cause analysis or data round reads `nl_b` or ModernBERT's `nl_b` results before Q5, and the briefs say so. Otherwise Qwen gets its own final set, written by the same rules when Q4 ends. Then: export, parity (Q0.6), the browser run of the frozen fixture with every reader ready (`run_live.cjs`), `regress.sh`, an independent runtime check (`implementation-verifier`).
2. **"Detects the intention as well as the teachers"**, with c = the teachers' agreement per requested action on the final set. The bars are those the ModernBERT run log restated (`MODERNBERT_RUNLOG.md`), so the two readers face the same bar:
   - every request executed: right ≥ 0.75 c;
   - at the cost-10 gate: right ≥ 0.5 c and ≤ 2% of executions wrong;
   - "as well as" literally is right ≥ c against each teacher, reported beside.
   - Nothing in this plan's evidence says a 0.6B model reaches c. The plan says so now so that a miss is not a surprise.
3. **Adoption is separate** (section 11).

## 11. The honest comparison and when to stop

**Same sets, same scorer, same calibration protocol, paired differences** (`compare_arms.mjs`), on the same data list wherever both readers trained on it. Beside every cost score:

| | Qwen3 fine-tuned | ModernBERT | SOP-BERT |
|---|---|---|---|
| Download | 639,446,688 B (unchanged) | about 150 MB | about 68 MB |
| Memory while loaded | about 1.41 GiB measured for the shipped reader at `n_ctx` 6,144. About 0.86 GiB at 1,024 (minus 560 MiB of KV; arithmetic) | measured in its plan | |
| Time per message | section 6 | 537 ms median (its plan) | 71 ms median |
| Reads the drawing | yes (Q3) | needs M4 | no |

**Qwen is worth adopting only when all hold:**
- on the final set, its cost score at the gate beats the best encoder arm by ≥ 5 points with the 95% interval above 0 (the ModernBERT plan's adoption bar);
- it is not worse on fresh2, short3 and short commands at the gate (the Rules comparison of AGENTS.md);
- its p95 time for 1-2-request messages on the reference machine is within the bar of D5 (the research proposal was 10 s).

**Stop, and report:**
- the overfit gate fails (Q0.5);
- native-to-browser parity fails and browser calibration is not affordable (Q0.2);
- Q1 does not read more of `nl_a` development than SOP-BERT with every request executed (Q1 b), or fails the absolute floors at its gate (Q1 c): the language advantage did not show on the same data;
- the time bar cannot be met even with the short prompt (Q0.7), and the owner does not want a slow second reader (D5). The time does not depend on training, so this can be known before Q1. The plan runs Q0.7 first.
- If the encoders reach the same `nl_a` number in the ModernBERT run, Qwen must still beat them by the adoption bar. Matching them at 9 times the download is a stop.

## 12. Who does what

| work | who |
|---|---|
| This plan and its review | Opus 5.5, max (owner) |
| Code review of everything that changes a number | `code-reviewer`, Opus 5.5, max |
| Trainer, the reader's format and validation, the browser path | Opus 5.5, high (AGENTS.md) |
| Running trainings, collections, evaluations, root-cause analyses | Sonnet 5.5, medium |
| Mechanical checks | Haiku 5.5, medium |
| Export parity and the runtime check | `implementation-verifier` |
| Data | section 9 |

Agents leave changes in the working tree; the coordinator reviews and commits. Nothing is pushed. Long runs are reported when they finish.

## 13. Decisions for the owner

| # | decision | recommendation | needed before |
|---|---|---|---|
| D1 | **The reader's output and prompt.** One line per request with its trigger, a 30-token system prompt, a grammar from the legend, and the validation of section 5 (a label's words must be in the message), instead of the JSON contract and its 1,790-token prompt. This changes `docs/js/qwen-contract.js` once Q1 passes. Separately: whether labels the message writes as number words are accepted, which needs the number-word step of the ModernBERT plan's L1 as a listed mechanical step | Yes to the format: the JSON contract caps a perfect reader at 76.3% on `nl_a` (23 wrong) and costs 3x the tokens. The number words follow your answer on L1 | Q1 |
| D2 | The drawing as an input of the Qwen reader (Q3): a new input, on the scope of section 10 | Decide after Q2 | Q3 |
| D3 | The native runtime for parity and collections. llama.cpp b11364 is wllama 3.8.1's own libllama. Its release binaries were refused by this session's permission policy ("code from external"). Your local b12099 build already fails the parity gate on a smoke sample (section 6.1). Native CPU code against WASM may differ even at b11364 | Allow b11364 (one download from the ggml-org GitHub release, SHA-256 checked) and run the gate. If it also fails, calibrate in the browser runtime in parallel instances (section 7) | Q0.2 |
| D4 | The thresholds of section 10, and whether the bar is read with every request executed or at the gate. They can change now or after Q0, not after a result | As written: the ModernBERT run log's restated bars, so both readers face the same | Q1 |
| D5 | **The time bar and the reference machine.** The reader runs in one WASM thread with no GPU (your settings of 2026-11-04). If it stays at tens of seconds per message, is it a second reader that answers later or reads only what the fast reader held? Or is it stopped? Multi-threading needs headers GitHub Pages cannot set. WebGPU is in wllama 3.8.1 but off by your setting | Name the machine and the bar (the research proposed 10 s p95 for 1-2 actions). Allow measuring WebGPU as a separate, reported variant | Q0.7 |
| D6 | Data generation: the budget (the weekly Claude limit is shared with the ModernBERT session; Codex for second labels); **who writes the training labels**, Opus 5.5 medium (a dialect choice: as accurate as Sonnet across families on the pilot, 32/40 each, and more self-consistent) or Sonnet 5.5 medium (the same accuracy on the pilot, lighter on the limit); the terms of use of the vendors' outputs, as the ModernBERT plan's D5 | Opus medium for labels if the budget allows, otherwise Sonnet medium; the budget is your call | Q4 |
| D7 | Train from the shipped GGUF's dequantized weights rather than the published BF16 checkpoint, which is measurably not its exact source | Yes: then "no training" is the shipped file and every gain is measured from the reader that ships | Q1 |
| D8 | GPU time: the ModernBERT session holds the card until 07:00 and its arms take it one by one; its trainer stops if it finds the lock held (`finetune_modernbert.py:48-51`). Qwen arms go after it, or between its arms only when its session says so | After it, one at a time | Q0.5 |
| D9 | **The final set.** `nl_b` is being written now for ModernBERT, before any Qwen arm. Share it, with a rule that nothing of Qwen's reads it or ModernBERT's results on it before Q5? Or write Qwen's own final set when Q4 ends, by the same rules (about 600 messages, gpt-6.1-sol as writer, both teachers)? | Share `nl_b` with the rule: both readers are then compared on one set. If ModernBERT's `nl_b` results are published before Qwen's Q5, Qwen's own set | Q4 |

## 14. Reproducing the numbers

Scripts: `training/qwen/finetune/` (uncommitted). Outputs: `reports/evidence/qwen3-finetune-plan/`. Task cache (not in git): `~/.cache/diagram-vss-qwen/`.
- The GGUF: the pinned URL of `QWEN3_PLAN.md` B1.
- The base: `Qwen/Qwen3-0.6B` revision `c1899de2…` (`model.safetensors`, `config.json`, `tokenizer.json`).
- The native runtime: `~/learningAI/local-llm/runtime/llama-b12099/llama-server` (b12099, `bee23322f`), started with `CUDA_VISIBLE_DEVICES= --device none -ngl 0 -c 6144 -b 512 -np 1 --jinja -t 6 --seed 0`.
- Python: the ModernBERT task venv, read-only use (numpy, torch, transformers, tokenizers).

| numbers | command |
|---|---|
| GGUF against the official weights | `python weights_match.py GGUF model.safetensors OUT.json`; `python weights_error.py GGUF model.safetensors OUT.json` |
| Q8_0 round trip | `python requant_roundtrip.py GGUF OUT.json` |
| Writer self-test | `python write_gguf.py --gguf GGUF --out /tmp/x.gguf` (must print the shipped SHA-256) |
| Token budgets | `SERVER=… node token_budget.mjs OUT.json` (default `nl_a`; `FOLDERS=dir,…` for training folders) |
| Format ceilings, floors, broken readers | `node format_oracle.mjs OUT.json nl_a` |
| Native baseline | `SERVER=… GGUF_SHA256=9465e63a… node collect_qwen.mjs --train-data ~/.cache/diagram-vss-modernbert/arms/baseline/train-data OUT.jsonl nl_a collected_1 [fresh2 short3 scenes_test]` |
| Browser parity and time | `node wllama_bench.mjs --gguf GGUF --native RECORDS.jsonl --out OUT.json --n 8 --short 6`; the gate: `node parity_check.mjs NATIVE.jsonl BENCH.json OUT.json` (native records collected with `TOP2=1`) |
| Qwen records scored, floors | `node score_qwen.mjs [--partial] OUT.json RECORDS.jsonl…` |
| SOP-BERT re-scored with the current scorer | `node training/neural/parity/score_arm.mjs ~/.cache/diagram-vss-modernbert/arms/baseline/sop.cal-fresh2-short3-nl_a.confidence.json OUT.json ~/.cache/diagram-vss-modernbert/arms/baseline/sop.jsonl` |
| Training examples | `node make_examples.mjs OUT.jsonl training/sketch/llm_train/nl_p1/opus` |
| Overfit test | `CUDA_VISIBLE_DEVICES= python overfit_test.py --examples EX.jsonl --gguf GGUF --base BASE --out OUT.json --rows 20 --steps 100` |
| Pilot | `node pilot_score.mjs OUT.json name=FILE.jsonl …` (the pilot's rows are in `~/.cache/diagram-vss-qwen/pilot/`, not in git) |
| Teachers by writer | `node teachers_by_writer.mjs OUT.json` |
| GPU probe (pending) | the command in `gpu_probe_qwen.py`'s docstring, with the GPU lock |

## 15. What was not verified, and the risks

- **GPU**: memory, throughput and the GPU overfit gate are not measured; the training times are estimates.
- **Parity**: native b12099 against wllama b11364 fails the gate on a 7-message smoke sample (section 6.1). b11364 native is not available (D3). Whether b11364 native matches WASM is unknown.
- **Time on a user's machine**: only this laptop (loaded) and the prototype's VM. No Mac.
- **The baseline** is a sample at the time of writing. The full run is Q0.3.
- **Writers**: no writer pilot was run. Texts have no right answer. The choice rests on the ModernBERT plan's reasons and on the teachers' agreement by writer.
- **LLM-written messages are cleaner than real ones** (the ModernBERT plan's largest risk, and this one's). `collected_1` has 26 real messages. The owner declined more real messages for the ModernBERT run (runlog, D8).
- **All test data comes from models close to the teachers.** A reader that imitates Opus is judged by Opus and GPT.
- **Overfitting the dialect**: training targets are one annotator's forms, and it is the dialect of `nl_a`'s first teacher. The final set read against both teachers is the guard, and every `nl_a` result is also reported against the other teacher.
- **Drawings in the training data**: 83 `nl_p1` rows have a drawing the engine could not fully replay (unknown setup values, failed earlier session steps). 79 of them are session steps the validator marks unreliable and are left out; 4 are kept with the names instead of the drawing, flagged.
- **The parity margin** is taken before the grammar (section 10, Q0.2).
- **Looping**: the shipped reader ran past 512 tokens on 8 of 98 messages. A trained model can loop too; `max_tokens` 256 and the reported share of cut outputs bound it.
- **Forgetting**: LoRA keeps the base frozen, but 2 epochs on 24,698 short, legend-worded messages may still narrow what it reads. The unseen-trigger split per epoch is reported.
- **Calibration may not carry over** between native and browser (parity), between long and short messages, and between the arms. It is refit per arm.
- **Quota**: Q0 and Q1 cost only code review and agent time; Q4 is the expensive step.
