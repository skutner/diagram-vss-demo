# Qwen3-0.6B Q8_0 as a sixth browser reader: prototype and live test

Date: 2026-11-04. Repository `skutner/diagram-vss-demo`; site https://skutner.github.io/diagram-vss-demo/.
Plan, fixed settings and acceptance criteria, written before the evaluation: [training/qwen/QWEN3_PLAN.md](../training/qwen/QWEN3_PLAN.md).

**The reader works in the browser, and it is safe. It is not useful yet.** Qwen3-0.6B Q8_0 loads on GitHub Pages and runs on the CPU in
one WASM thread. Its model and runtime files are hash-checked, and thinking is switched off through the chat template. Every output is
validated, and nothing it proposes executes. The five existing readers drew exactly what they drew before.

Three facts limit its use:
- **Quality.** Of the 10 actions in the frozen live fixture, Qwen3 proposed 3 correctly, 6 wrongly and 1 in a form the validator
  blocked. With no calibration, all 10 were held.
- **Speed.** On the test machine (a 4-vCPU Intel Xeon cloud VM, headless Chromium 153) each short message took 74–178 s (median
  104 s). The first load took about 8 minutes, most of it the first reading of the 1,805-token fixed prompt.
- **Calibration.** Its pre-grammar token-probability score is available, but no calibration exists, so the gate holds everything.

Fine-tuning is not justified as the next step (last section).

## What was asked and where it stands

| requirement | status |
|---|---|
| Official `Qwen/Qwen3-0.6B-GGUF` `Qwen3-0.6B-Q8_0.gguf`, revision `23749fef…`, 639,446,688 B; checksum, embedded tokenizer and template verified | done: SHA-256 `9465e63a…bb031` (Hub LFS hash) recomputed by `sha256sum` and by the browser on download and on every load; tokenizer and template read from the file and pinned |
| wllama 3.8.1 (v3 API) in an isolated worker, `n_gpu_layers: 0`, `n_threads: 1`, CPU verified, thinking off by the template | done: own module worker; runtime reports one thread, not multithreaded; WebGPU adapter stubbed to null by wllama; rendered prompt ends with the template's empty think block |
| Existing Transformers.js runtimes unchanged; five readers' weights, gates, votes and default behaviour preserved | done: no file of theirs changed; Qwen3 loads only on request; their after-turn drawings, turn summaries and details on the fixture equal the five-reader live record |
| Bundle < 800,000,000 B; runtime and RAM measured separately; GGUF not committed | done: 639,446,688 B + 1 small JSON; runtime 9,095,407 B; RAM below |
| GitHub Pages subpath; no custom headers or service worker | done: single-threaded, so no isolation is needed |
| Canonical legend, bounded schema, ordered commands with names, values, references, spans | done |
| Complete validation before execution; unknown fields never dropped; invalid/truncated output never executes; no generated code | done (77 unit tests; live: 11 outputs validated, 3 requests blocked, none executed) |
| Existing clarification and dependency handling; no synonym tables; no hidden Rules fallback | done |
| Confidence from the runtime's real probabilities; missing confidence an explicit hold | done: pre-grammar log-probabilities (source-verified); no calibration exists → every request held with that reason |
| Independent review; focused runtime verification | done: design review before implementation (findings and changes in the plan, section E); development checks in the real browser |
| Frozen eleven-message scenario on Pages with six readers, intentions, holds, results, SOP/SVG, six screenshots, grading, timing, memory, hardware | done (two runs; the first exposed a details-view defect, fixed and repeated) |

## Setup

| item | pin or value | checked how |
|---|---|---|
| model | `Qwen/Qwen3-0.6B-GGUF` `Qwen3-0.6B-Q8_0.gguf`, revision `23749fefcc72300e3a2ad315e1317431b06b590a`, 639,446,688 B, Apache-2.0 | SHA-256 `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031` = the Hub's LFS hash: with `sha256sum`, and by the browser while downloading and on every load from its cache |
| embedded tokenizer and template | GGUF v3, `qwen3`, 28 blocks, BPE `gpt2`/`qwen2`, 151,936 tokens, EOS `<|im_end|>` 151645, chat template 4,100 characters (SHA-256 `57f1fd00…`) with the `enable_thinking is false` branch | read from the file by `training/qwen/gguf_meta.mjs` ([metadata](evidence/qwen3-browser-prototype/gguf-metadata.json), [template](evidence/qwen3-browser-prototype/gguf-chat-template.jinja)); the browser compares the runtime's template, vocabulary, layers and EOS with these pins |
| runtime | wllama 3.8.1 (npm integrity verified, gitHead `b68fd64`), libllama `b11364-46ca246`; self-hosted `index.min.js` 331,458 B and `wllama.wasm` 8,763,949 B (MIT) | SHA-256 of both pinned; the worker hashes them and runs the checked bytes; the CDN compat build is disabled |
| load | `n_gpu_layers: 0`, `n_threads: 1`, `n_ctx: 6144`, `n_batch: 512`, `n_parallel: 1`, `jinja: true`, `seed: 0` | the runtime reports 1 thread, not multithreaded |
| request | `temperature: 0`, `seed: 0`, `max_tokens: 2048`, `chat_template_kwargs.enable_thinking: false`, JSON-schema `response_format`, `logprobs` with `top_logprobs: 1`, `post_sampling_probs: false`, `verbose`, `return_tokens`; 30-minute limit | the runtime echoes them per request (in each turn's details) |
| prompt | built from the legend: 52 acts with their keys (SOP-BERT's learned `act_keys`), 38 keys with their legend questions and canonical values, in SOP Lang's key order, and 2 annotated training messages as examples; 7,103 characters, 1,805 tokens with the check sentence | SHA-256 `1d11a4c2…` pinned in `docs/model/qwen3/reader.json`; the page rebuilds it from its own legend and refuses to run on a mismatch |

## How it is built

- **Files.** `docs/js/qwen-worker.js` (the module worker: download, hashes, cache, wllama), `docs/js/qwen-reader.js` (page side,
  lifecycle, gate), `docs/js/qwen-contract.js` (prompt, schema, strict JSON parser, validation, wires, score), `docs/js/qwen-sha256.js`,
  `docs/model/qwen3/reader.json` (written by `training/qwen/make_reader.mjs`), `docs/vendor/wllama-3.8.1/`, and the Qwen3 block of `docs/js/ui.js`.
- **Isolation.** wllama runs inside the reader's own worker, and starts its own inner worker. The tab has its own world, engine and
  undo history (`K.createSystem()`), its own gate and its own queue (`qwenJob`), through which every change to its drawing goes:
  messages, SOP Lang and toolbar turns, Do it anyway, the Rules drawing it starts from, a scenario's new area, capability switches.
  It is not in `READ_ORDER`, the cross-readings, the votes, VSS-BERT or the align targets. The five readers reply without waiting for it.
- **Opt-in.** Nothing is downloaded unless the user presses **Load Qwen3** or the URL lists `qwen` in `?models=`.
- **Cache.** The model goes from the pinned Hub URL into the origin private file system as `<sha>.gguf.part`, hashed while written,
  renamed only when size and SHA-256 match, and hashed again on every load. Web Locks keep two tabs from writing or deleting at once.
- **Lifecycle.** States idle / loading / ready / failed. A non-streamed generation cannot be interrupted inside wllama. Stop and the
  time limit therefore terminate the worker. Every open call is rejected with its reason and the request in progress is held. Unload
  calls `wllama.exit()` (raced against 5 s) and terminates the worker.
- **Contract and validation.** The output is `{"requests": [{"id", "text", "do", "args"}], "not_understood": [...]}`. A shape is a
  `name`, a `ref` to an earlier create of the same output, a `context` reference (filled by the shared rule `NeuralKit.NEXT_CONTEXT`),
  or a `like` description (a `mention` wire).
  - Before anything can run, the whole output is checked: finish reason, no hidden reasoning, strict JSON (the runtime grammar's
    ```` ```json ```` fence excepted), only the contract's fields, fewer than 16 requests, unique ids.
  - Then each request is checked: a legend act; only keys that act takes; legend values; a verbatim, non-overlapping quote; names on
    the drawing or in the quote; names, labels and other texts in the quote; references only to earlier creates; and no combination
    the engine would read otherwise.
  - A failure holds the whole output, or that request and the requests that use it. A blocked request has no wires.
- **Score.** The runtime returns each emitted token's probability over the raw logits of the full vocabulary, unaffected by the
  sampler chain and the grammar (pinned llama.cpp `server-context.cpp` `populate_token_probs`; the reviewer confirmed this, with one
  exception for unfinished UTF-8 characters, which is handled).
  - A request's score is the minimum, over its fields, of the mean token log-probability. Fields are the act; each argument (key and
    value); shape items; and the decision to stop adding arguments or requests.
  - It is a ranking number, not a probability of being right, and never called a confidence.
- **Gate.** No readings of calibration messages exist, so no threshold can be chosen by the repository's rule (cost-10, out of fold).
  Every request is therefore held at every level, with that reason; this is the same behaviour as ModernBERT's gate with missing
  calibration. Do it anyway runs one validated reading through the same engine. A request that failed validation cannot run.

## Verification before the live run

- **Independent review** (Opus, effort high) of the lifecycle, isolation and validation design before implementation. It found five
  blocking problems, among them a fall-through in `ui.js` that would have run a sixth reader without a gate, and a clarification
  question from Qwen3 able to stop the five readers. All were fixed before any evaluation; [plan, section E](../training/qwen/QWEN3_PLAN.md).
- **Contract tests**: 77/77 (`node training/qwen/test_qwen_contract.mjs`).
- **Real runtime, development messages** (annotated training messages, never the fixture), in local headless Chromium on the same VM:
  - Load from the network, and reload from the cache: re-hash 6.8 s, start 5.2 s.
  - A 41-token prompt decodes at about 450 ms/token with and without grammar and probabilities, against about 1,100–1,250 ms/token
    with the 1,805-token prompt in context. The long context, not the grammar, makes generation slow
    ([decode speed](evidence/qwen3-browser-prototype/dev/decode-speed.json)).
  - Lifecycle in the real page: Do it anyway changed only Qwen3's drawing. Stop held the reading in progress ("stopped by you", no Do it
    anyway). A message sent while Qwen3 was stopped was read by the five readers and not by it. Try again loaded from the cache.
    Unload took the summed browser RSS from 2.67 to 1.28 GiB. Clear cache emptied the folder
    ([lifecycle](evidence/qwen3-browser-prototype/dev/app-lifecycle-check.json), [clear](evidence/qwen3-browser-prototype/dev/clear-cache-check.json)).
- **Found in development and changed before the live run** (each in the plan):
  - The runtime's JSON-schema grammar allows a ```` ```json ```` fence around the JSON. Exactly that wrapper is now accepted.
  - The grammar keeps a schema's key order, and the legend's order put `name` and `count` before `shape`, so they could never be
    written. The keys now follow SOP Lang's canonical order, taken from the engine's serializer.
  - A held request showed a generic clarify.js sentence, because the chat drops any reason containing a digit ("Qwen3"). The reason no
    longer names the model.
  - `n_ctx` was set to 6,144 from the measured prompt.
- **Legacy readers.** With the new `ui.js` and without Qwen3, their 55 after-turn drawings on the frozen fixture are identical to the
  five-reader live record ([comparison](evidence/qwen3-browser-prototype/dev/legacy-five-local-compare.json)).
- **Regression**: `bash training/sketch/regress.sh` exit 0, the same table as the previous reader commits
  ([table](evidence/qwen3-browser-prototype/regress/table.txt)).

## Live test on GitHub Pages

**Method.** The frozen fixture ([`diagram_e2e_cases.json`](../training/sketch/diagram_e2e_cases.json), unchanged): ten requested actions
and one unsupported-language control.
- **Where:** directly on https://skutner.github.io/diagram-vss-demo/?models=rules,vss,neural,combined,modernbert,qwen.
- **Harness:** the six-reader harness [`diagram_e2e_live6.mjs`](../training/sketch/diagram_e2e_live6.mjs), run by
  [`run_live.cjs`](../training/qwen/run_live.cjs) in a fresh Chromium profile. The five-reader harness is kept as it was.
- **Settings:** default levels; no Do it anyway; nothing tuned.
- **Model:** downloaded from the pinned Hugging Face URL (302 to its CDN, then 200).
- **Per turn:** the harness waits until Qwen3 has finished the turn, then records every reader's reply, details, drawing SOP and SVG,
  and Qwen3's wires, validation, gate and evidence. Six final screenshots are taken.

Two runs:
- **Run 1** (deployed `65e13e6`, 10:38–11:06 UTC) exposed one defect of the new code: the details sheet rendered empty for every reader
  once Qwen3 had read a turn (11 page errors in its console). It was fixed in `f6c329e`.
- **Run 2** (deployed `f6c329e`, 11:22–11:51 UTC) is the complete one. Qwen3's 11 raw outputs and scores are byte-identical in both
  runs, so greedy decoding here is repeatable.

**Identity.** Before and after run 2, 14 served files (the page, `ui.js`, `logic.js`, `neural.js`, the four Qwen3 modules, both wllama
files, `reader.json`, `versions.json`, two confidence files) were checked. Both the cache-busted and the plain URLs had the SHA-256 of
the files of `f6c329e`, and the Hub returned the pinned revision, size and hash for the model. The Pages deployment job of `f6c329e`
succeeded.

### Acceptance criteria (fixed before the run)

| # | criterion | result |
|---|---|---|
| 1 | deployed commit and served assets equal the committed files | **met** (14 files, before and after the run) |
| 2 | six tabs ready, identical initial drawing | **met** (all six ready after 485 s; one initial SOP) |
| 3 | GGUF SHA-256 recomputed in the browser; CPU only, one thread | **met** (`9465e63a…`; `n_gpu_layers 0`, 1 thread, not multithreaded; WebGPU adapter stubbed to null) |
| 4 | thinking off | **met** (all 12 rendered prompts end with `<|im_start|>assistant\n<think>\n\n</think>\n\n`; no reasoning text) |
| 5 | every output validated; no model output executed | **met** (11 outputs validated; 3 requests blocked; 0 Qwen3 wires executed; Qwen3's drawing never changed) |
| 6 | the five readers' after-turn drawings equal the five-reader record | **met**: 55/55 drawings, and also 55/55 per-turn summaries and 55/55 details sections (timings removed) |
| 7 | no HTTP status ≥ 400 for model or runtime assets | **met** (156 responses, none ≥ 400; the console is empty) |

### Per requested action: what was executed

The five earlier readers did exactly what they did in [the five-reader run](diagram-e2e-five.md), so their grades are those of
[its assessment](evidence/diagram-five-101edd9/assessment.json). Qwen3 executed nothing by design.

| reader | right / 10 | asked | other not done | wrong | extras |
|---|---:|---:|---:|---:|---:|
| Rules | 9 | 0 | 1 | 0 | 0 |
| VSS | 8 | 2 | 0 | 0 | 0 |
| SOP-BERT | 7 | 3 | 0 | 0 | 0 |
| VSS-BERT | 3 | 3 | 4 | 0 | 0 |
| ModernBERT | 1 | 9 | 0 | 0 | 0 |
| **Qwen3** | **0** | **10** | 0 | **0** | **0** |

### Qwen3's proposals (not executions)

Graded by the rule written before the run: right only with the gold action, every gold value and target, and nothing that would change
the drawing or the answer.

| action | Qwen3's validated wires | proposal | score (weakest field) | first cause |
|---|---|---|---:|---|
| a1 red circle E2EAlpha | `create shape=circle color=red name=E2EAlpha` | **right** | -0.075 (name) | |
| a2 blue rectangle E2EBeta | `create shape=rectangle name=E2EBeta label=E2EBeta position=top anchor=Backdrop` | wrong | -4.691 (position) | value dropped (blue), values invented |
| a3 arrow E2EAlpha → E2EBeta | `create shape=triangle color=blue position=between anchor=E2EAlpha,E2EBeta` | wrong | -3.085 (shape) | action (create, not connect) |
| a4 E2EAlpha green | `set color=green target=E2EAlpha` | **right** | -0.073 (color) | |
| a5 E2EBeta below E2EAlpha | `create shape=triangle color=blue position=below anchor=E2EAlpha` | wrong | -1.755 (shape) | action (create, not move) |
| a6 rename E2EBeta → E2EGamma | `rename name=E2EBeta target=E2EGamma` | wrong | **-0.016** (target) | roles swapped |
| a7 label "Review queue" | `label kind=shape label="Review queue" target=E2EGamma` | **right** | -1.696 (kind) | (`kind=shape` checked: same drawing) |
| a8 "that shape" yellow | `set color=yellow target=Backdrop` | wrong | -0.292 (color) | a named shape instead of the referred one |
| a9 row of E2EAlpha, E2EGamma | `arrange template=steps title="E2EAlpha and E2EGamma" target=E2EAlpha,E2EGamma` | wrong | -0.181 (template) | value (template, not layout=row) |
| a10 path Start → Done? | blocked: `check` with `property=position` | blocked | -3.338 (property) | action (check, not path); validation caught it |

Proposals: 3 right, 6 wrong, 1 blocked, 0 missing. An independent check by a separate agent, which first graded the raw record by the
same rules, agreed on all 60 executed outcomes, all 10 proposal grades and the control
([audit](evidence/qwen3-browser-prototype/live-2-f6c329e/independent-audit.json)). Every one was held. The replies say why: "this reader has no calibrated confidence
threshold yet, so it does not act on its own", and the a10 reply carries the validation reason without Do it anyway.

The unsupported control produced two proposals, both blocked; there was no mutation:
- an `improve` with `property=color` on MainTitle (improve takes no `property`);
- a `list` whose quote is the prompt's own line "Names on the canvas: …" (not in the message).

The score did not single out the wrong readings: the highest score of the run (-0.016) belongs to the swapped rename. With nine
dependent proposals no AUROC is computed.

Because nothing of Qwen3's executed, its own drawing stayed the starter diagram. Its later proposals were therefore read against a
drawing without E2EAlpha or E2EBeta. They were graded against the message, as the rules say.

### Root causes of Qwen3's wrong and blocked proposals

| first cause | count | where it sits | actions |
|---|---:|---|---|
| action chosen wrongly (create for an arrow or a move; check for a path question) | 3 | model (prompted, untuned) | a3, a5, a10 |
| roles or values wrong (swapped rename; template for a row; blue dropped, values invented) | 3 | model | a6, a9, a2 |
| reference resolved to a canvas name instead of the referred shape | 1 | model, and the contract: the prompt gives the names on the drawing but not the last shapes (the reader would fill a `context` reference itself) | a8 |
| the prompt's scaffold quoted as a request (control) | 1 | prompt format; caught by validation | control |

None of these causes is in the runtime, the grammar or the validation. Validation caught every structural error, and it cannot see a
wrong but well-formed choice.

### Time

On a 4-vCPU Intel Xeon @ 2.10 GHz cloud VM (Docker, Ubuntu 24.04), headless Chromium 153.0.8010.12, one WASM thread, run 2:

| step | time |
|---|---:|
| model download from Hugging Face (639 MB, hashed while written to OPFS) | 22.9 s (run 1: 24.4 s) |
| runtime start (`loadModel`) | 8.9 s |
| first check: the 1,805-token fixed prompt read for the first time (372 s at 4.85 tokens/s) and 55 tokens generated (62 s) | 434 s |
| ready from page open | 485 s |
| a later load from the cache (development check): SHA-256 again + start | 6.8 + 5.2 s, then the first check again (≈440 s) |
| per message, Qwen3, full validated request (11 messages) | 74–178 s, median 104 s (run 1: 71–174 s, median 100 s) |
| per message, the five other readers' reply, in parallel with Qwen3's queue | median 1.5 s |

Per Qwen3 message, the runtime reused 1,821 cached prompt tokens. It read 14–58 new tokens (12–50 s, about 0.8 s per token at this
context length) and generated 55–138 tokens at 0.84–0.87 tokens/s. The research's proposed limit for 1–2-action messages, 10 s at the
95th percentile, is missed by about an order of magnitude on this machine.

### Memory

Summed resident memory of all the browser's processes (sampled every 2 s; shared pages counted more than once):

| phase | summed RSS | largest single process |
|---|---:|---:|
| the five readers loading (first 30 s) | median 1.24 GiB | 1.66 GiB |
| Qwen3 download and start | peak 3.26 GiB | 2.85 GiB |
| six readers resident, messages | median 2.67 GiB, max 2.79 GiB | 2.39 GiB |
| after Unload of Qwen3 | 1.36 GiB (from 2.77 GiB) | 0.95 GiB (from 2.35 GiB) |

Qwen3 accounts for about 1.41 GiB of resident memory while loaded. That is its 610 MiB of weights, a 672 MiB FP16 KV cache at
`n_ctx` 6,144, and the runtime. The OPFS cache holds 639,446,872 B on disk. The page's JavaScript heap stayed at about 97 MB (`performance.memory`), since
the model lives in the worker.


## Limitations

- **The fixture is small and dependent.** It has ten literal actions. Qwen3's 3 right proposals out of 10 are an observation, not an
  accuracy estimate. No AUROC or risk–coverage curve is computed: it would mean nothing on nine validated proposals.
- **Calibration is missing.** No calibration, fresh test or native-CPU parity study was run; these remain the plan's proposals. The
  native llama.cpp build for a same-VM baseline was refused by this environment's permission policy and was not attempted another way.
- **Hardware.** All times and memory figures are from one cloud VM: an Intel Xeon @ 2.10 GHz with 4 vCPUs and 15.7 GiB, in Docker,
  running headless Chromium 153. They are not Apple M1 results. Prompt processing on this VM is slow (about 4.8 tokens/s in one
  thread), so a laptop may well be several times faster; that is unmeasured.
- **Memory.** It is measured as summed resident memory of the browser's processes, which counts shared pages more than once. WASM heap
  size is not readable from the page here.
- **Scope.** The score is defined and recorded, but its relation to correctness is unknown. Only one model, one prompt and one runtime
  path (CPU, one thread) were tested. WebGPU, multithreading, Qwen3.5 and SmolLM2 are untested.
- **Deployment.** The first Pages deployment job reported a GitHub 502 although the files were served. Its re-run stayed queued and
  could not be cancelled. Both live runs checked the served files by SHA-256 before (and the second also after) running.

## Is fine-tuning justified?

**Not as the next step.**

Fine-tuning would address what the run shows is wrong with the proposals: action choice, roles and values. The repository has 24,698
annotated messages, and the same data gave SOP-BERT 7 of 10 right on this fixture. A tuned model would also not need most of the
1,805-token prompt, which would roughly double decoding speed (≈450 instead of ≈1,150 ms/token) and remove the 6-minute first prefill.

It would not fix what blocks use:
- **Latency.** Even at short context, a one-request message needs about 60–90 output tokens in this JSON form, so 30–40 s on this VM in
  one thread. The research's proposed limit is 10 s at the 95th percentile.
- **Calibration cost.** Before its gate could execute anything, it would need readings of at least about 400 calibration messages
  through this runtime: more than 11 hours on this VM at the measured speed.
- **Training memory.** Full fine-tuning of 0.6B parameters does not fit the 6 GiB training GPU; LoRA on the source checkpoint, then
  merge, re-quantize and prove parity, is a separate project.

The cheaper evidence first:
1. The same frozen run on the target laptop, to learn the real latency.
2. A more compact output format (fewer tokens per request).
3. If latency becomes acceptable: a preregistered LoRA proposal with calibration on the fresh2/short3 calibration part and a fresh test,
   as in the plan's section D.

## Evidence

- Plan, fixed settings, review findings: [training/qwen/QWEN3_PLAN.md](../training/qwen/QWEN3_PLAN.md)
- **Live run 2 (complete)**, [live-2-f6c329e/](evidence/qwen3-browser-prototype/live-2-f6c329e/):
  - `record.json` (raw), `summary.json` (grading digest), `assessment.json` (per-action grades);
  - `legacy-compare.json`, `memory.json`, `run-metadata.json` (hardware, browser, screenshot hashes);
  - `deployed-identity-before.json` and `-after.json`;
  - six screenshots: [Rules](evidence/qwen3-browser-prototype/live-2-f6c329e/rules.png),
    [VSS](evidence/qwen3-browser-prototype/live-2-f6c329e/vss.png),
    [SOP-BERT](evidence/qwen3-browser-prototype/live-2-f6c329e/neural.png),
    [VSS-BERT](evidence/qwen3-browser-prototype/live-2-f6c329e/combined.png),
    [ModernBERT](evidence/qwen3-browser-prototype/live-2-f6c329e/modernbert.png),
    [Qwen3](evidence/qwen3-browser-prototype/live-2-f6c329e/qwen.png).
- Live run 1 (details-sheet defect): [live-1-65e13e6/](evidence/qwen3-browser-prototype/live-1-65e13e6/)
- Development checks (training messages, local copy of the model): [dev/](evidence/qwen3-browser-prototype/dev/)
- GGUF metadata and chat template: [gguf-metadata.json](evidence/qwen3-browser-prototype/gguf-metadata.json), [gguf-chat-template.jinja](evidence/qwen3-browser-prototype/gguf-chat-template.jinja)
- Regression: [regress/](evidence/qwen3-browser-prototype/regress/)
- Reproduce:
  - `node training/qwen/test_qwen_contract.mjs`
  - `node training/qwen/make_reader.mjs --check`
  - `node training/qwen/run_live.cjs --url '<site>?models=rules,vss,neural,combined,modernbert,qwen' --out <dir>`
  - `node training/qwen/live_summary.mjs <dir>/record.json`
  - `node training/qwen/check_deployed.mjs <commit>`

