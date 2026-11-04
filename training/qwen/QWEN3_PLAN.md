# Qwen3-0.6B Q8_0 as a sixth browser reader: design and preregistration

Written 2026-11-04, before implementation and before any evaluation run. Source at writing: `d7a4938`.
Research basis: `reports/browser-models-under-800mb.md` and `reports/evidence/browser-models-under-800mb/`.

This file separates (A) what the owner's request makes mandatory, (B) the fixed design and settings chosen for it,
and (C) the preregistered live experiment. Research proposals that are not requested here (a native/browser parity
study, a calibration set of 400 messages, a fresh test set of 1,000 messages, other models) stay proposals (section D).

## A. Mandatory requirements (owner's request, 2026-11-04)

- One new reader, Qwen3-0.6B Q8_0, official `Qwen/Qwen3-0.6B-GGUF`, file `Qwen3-0.6B-Q8_0.gguf`, revision
  `23749fefcc72300e3a2ad315e1317431b06b590a`, 639,446,688 bytes. Checksum and embedded tokenizer/chat template verified.
- Runtime: wllama 3.8.1 (v3 API), in an isolated worker, `n_gpu_layers: 0`, `n_threads: 1`, CPU only; thinking disabled
  through the chat template's own `enable_thinking` switch. Existing Transformers.js runtimes untouched.
- Its own tab, canvas, context, history, loader, cache and lifecycle. Rules, VSS, SOP-BERT, VSS-BERT and ModernBERT keep
  their weights, confidence gates, votes and default behaviour.
- Canonical legend + bounded structured output; ordered commands for the existing engine (several requests, names, values,
  references, original-text spans); complete validation before anything executes; never run generated code; no hand-written
  synonym tables; no hidden Rules fallback.
- Confidence: the runtime's real probabilities, never self-reported; missing confidence is an explicit hold.
- Model bundle < 800,000,000 bytes; runtime bytes and RAM measured separately; the GGUF is not committed to GitHub.
- GitHub Pages subpath; no custom headers, no service worker.
- Live test on `https://skutner.github.io/diagram-vss-demo/` with all six readers, the frozen eleven-message fixture
  (`training/sketch/diagram_e2e_cases.json`, unchanged) and default confidence levels.

## B. Design and fixed settings

### B1. Artifacts (pinned; checked before use)

| artifact | pin | check |
|---|---|---|
| model | `https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf` | 639,446,688 bytes, SHA256 `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031` (the Hub's LFS sha256; recomputed in the browser on every load) |
| runtime | npm `@wllama/wllama@3.8.1`, integrity `sha512-Pl7BEJhPU8OHnV/yhn3DFZYhLLOdSHh+4TND79WCftHnlUAdQPAsyc/CfIOY+4mVxvf5VW3Xw3Uf7BBfotS1gw==` (verified), gitHead `b68fd64`, libllama `b11364-46ca246` | self-hosted copies of `esm/index.min.js` and `esm/wasm/wllama.wasm` under `docs/vendor/wllama-3.8.1/`, SHA256 in a manifest; compat mode (CDN) disabled |

The model is downloaded from the pinned Hub URL (CORS allows `https://skutner.github.io`; checked), hashed while it is
written to the origin private file system (OPFS, folder `qwen3-reader/`), and loaded from the verified file. A file whose
size or hash does not match is deleted and never loaded. If OPFS is unavailable, the bytes are hashed and kept in memory for
the session only (reported as "not cached").

### B2. Runtime settings (fixed before any run)

`n_gpu_layers: 0` (wllama then skips WebGPU initialisation), `n_threads: 1`, `n_ctx: 6144` (8192 before the measurement below), `n_batch: 512`, `n_parallel: 1`,
`jinja: true`, `seed: 0`; per request `temperature: 0`, `seed: 0`, `max_tokens: 1024`, `chat_template_kwargs:
{enable_thinking: false}`, `cache_prompt: true`, `logprobs: true`, `top_logprobs: 1`, `post_sampling_probs: false`,
`verbose: true`, `return_tokens: true`, `response_format: {type: "json_schema", ...}` (B4). KV cache FP16 (default).
A request stops after a wall-clock limit of 15 minutes (aborted, held as "stopped"). Compat mode is off; a browser without
JSPI or Memory64 gets an explicit "not supported" state.

Measured during development (before the live run; development messages from the annotated training data, not the fixture):
the fixed prompt plus the first check is 1,805 tokens; its cold prefill takes about 375 s on this VM (4.8 tokens/s), and later
messages reuse 1,786 cached tokens. Generation runs at about 0.9 tokens/s with that context, against about 2.2 tokens/s with a
41-token prompt; the grammar and the token probabilities cost nothing measurable (same 452 ms/token with and without them on the
short prompt), so the slowdown is the attention over the long context in one WASM thread. `n_ctx` is therefore set to 6,144
(1,805 fixed + up to 2,048 generated + room for a long message and the names; FP16 KV 672 MiB instead of 896 MiB at 8,192); a
request that does not fit is refused by the runtime and held.

Observed before implementation (local headless Chromium 153 on this cloud VM, the real GGUF and wllama): the rendered prompt
ends with `<|im_start|>assistant\n<think>\n\n</think>\n\n`, the template's own branch for `enable_thinking=false`;
`isMultithread()` false, 1 thread; WebGPU not initialised; prefix caching reuses the shared prompt prefix. Single-thread
speed on this VM: about 4.8 prompt tokens/s and 2.3 generated tokens/s.

### B3. Lifecycle and isolation

- Opt-in: nothing is downloaded unless the user presses **Load Qwen3** on its tab, or the page URL's `models` parameter
  lists `qwen` (the live harness). The five existing readers' startup is unchanged.
- `docs/js/qwen-worker.js`, a module Worker owned only by the Qwen reader: download, hash, cache, `Wllama` object,
  completions. wllama starts its own inner worker inside it. The main thread never touches wllama.
- States: `idle` → `loading` (download / verify / start / first check) → `ready`; `failed` (with the reason and
  **Try again**); **Unload** calls `wllama.exit()` then terminates the worker (back to `idle`, drawing kept); **Clear cache**
  unloads first, then deletes the OPFS folder. A stale result after unload/retry is discarded (token counter).
- First check before `ready`: one fixed sentence read end to end (nothing executed). It warms the shared prompt prefix and
  verifies: the rendered prompt ends with the empty think block, no reasoning text, a token probability for every
  generated token, and that the output passes validation. A failed check is `failed`, not `ready`.
- Own queue: the Qwen reader is not in `READ_ORDER`. Each message (typed, SOP Lang, buttons) is appended to Qwen's queue
  after the five readers have replied; Qwen reads it with its own drawing (names and last shapes) at its turn, runs its gate
  and its own engine, and posts its reply when done. The other tabs never wait for it. Do it anyway on a Qwen request
  goes through the same queue. Its world, undo/redo, pending question and held list are its own (`K.createSystem()`).
- It does not take part in `crossReads`, votes, VSS-BERT or any other reader's gate.

### B4. Output contract

The prompt is built from the live legend (`engine.legend`): every action/ask/fact/rule the shipped SOP-BERT config lists
(`docs/model/neural/sop-bert/config.json` `reader.act_keys`, learned from the annotated training data), with the keys each
takes, restricted to legend keys (the non-legend `position2`, `anchor2`, `region` and the 248-value help `topic` are left out),
and each key's legend question and canonical values. Two annotated training messages are given as examples, chosen by a fixed
rule (B6). No cue words or synonyms are in the prompt. The prompt's SHA256 is recorded with every reading.

The JSON schema (given to the runtime as `response_format` and explained in the prompt):

```
{"requests": [ {"id": "r1", "text": "<the request's words, copied exactly>", "do": "<act>", "args": {<key>: <value>, ...}} ... ≤16 ],
 "not_understood": [ "<words copied exactly>" ... ≤8 ]}
```

- `do`: one enum of all acts. `max_tokens` 2048 (raised from 1024 after the review: 16 requests can exceed 1024 tokens);
  time limit 30 minutes. Types follow the legend: an `action` value → `command`, an `ask` value → `question`,
  `fact`, `rule`.
- `args`: every key optional, `additionalProperties: false`; enum keys take the legend's values; numbers are JSON numbers;
  `at` is `[x, y]`; `items`/`items2`/`parents` arrays of strings; `name`, `label`, `title`, `about` strings.
- Shape-valued keys (`target`, `from`, `to`, `anchor`, `linked`, `members`) take a list of 1–8 items, each exactly one of
  `{"name": "<a name>"}`, `{"ref": "r1"}` (what an earlier create of this message made), `{"context": "<the words, e.g. it>"}`
  (a shape from the conversation, filled by the existing context rule from the reader's last shapes, as SOP-BERT's
  `context` fill), `{"like": {<color|notColor|shape|quantifier|recency>: value}}` (a `mention` wire; renamed from `describe` after the review, which is also a question act).

### B5. Validation (all before execution)

Found during development: the runtime's grammar for a JSON-schema response (`common/chat-auto-parser-generator.cpp` at the pinned
commit) allows the JSON alone or inside one ```` ```json ... ``` ```` fence, and the model used the fence on a long message. Exactly
that wrapper is accepted (blanked to spaces, offsets unchanged); anything else around the JSON is invalid.

Found during development (four training messages in the real page): the model never wrote `name` or `count`. The runtime's grammar
keeps a schema's property order, and the legend's own order put `count` and `name` before `shape`, which the model writes first.
The keys (schema, prompt lists, examples) now follow SOP Lang's canonical order, taken from the engine's serializer (`logic.js`
`serialize`): `count`, `shape`, `size`, `color`, `outline`, ..., `name`, `label`, ..., `target`, `from`, `to`, ..., `position`,
`anchor`. Also found: a held Qwen3 request showed clarify.js's generic sentence ("right most of the time…") because the chat drops a
reason containing a digit and the reason named "Qwen3"; the reason no longer names the model.

Whole output; any failure holds every request of the message, without Do it anyway:
runtime error, abort or time limit; `finish_reason` other than `stop` (truncation); non-empty reasoning text; text that is
not strict JSON; a top-level or request key outside the contract (never dropped silently); more than 16 requests; ids not
`r<n>` or not unique.

Per request; a failure blocks that request (no Do it anyway) and everything that refers to it:
`do` not an act; a key not in that act's keys; a type or enum value outside the legend; a quote that is not a verbatim,
non-overlapping substring of the message read (its UTF-16 span is recorded); a `ref` to an id that is not an earlier `create`
of this output; a `context` whose words are not in the message or with no last shape to fill it; an empty or invalid
`describe`; a non-finite number, a count that is not a positive integer, a point that is not two numbers.

Mapping: a name equal (case-insensitively) to the name of an earlier create of the same output becomes a reference to
that create's wire, as SOP-BERT and the Rules do; `describe` becomes a `mention` wire before the request; `context`
takes the reader's last shapes, updated within the message by the shared rule `NeuralKit.NEXT_CONTEXT`. `not_understood`
quotes are verbatim-checked and reported as not understood. The wires go to the same `engine.run` as every reader;
destructive requests also pass `K.holdDestructive`.

### B6. Prompt examples

The first two messages of `training/sketch/llm_train/opus_train_c/msg_01.jsonl` whose gold wires all convert to the
contract (ids `ot-0601`, `ot-0602` at writing): annotated training data, not the fixture, not invented. Converted by
`training/qwen/make_reader.mjs` into `docs/model/qwen3/reader.json` together with the act keys and the artifact pins.

### B7. Confidence and the gate

- The runtime's probabilities: in the pinned llama.cpp (`tools/server/server-context.cpp` `populate_token_probs`,
  `server-common.cpp` `get_token_probabilities`), with `n_probs > 0` and `post_sampling_probs: false` the probability of
  an emitted token is a softmax at temperature 1 over the model's raw logits for the full vocabulary. It is computed after
  sampling, from logits the CPU sampler never modifies (the sampler works on a copy; backend sampling is off for this case),
  so it does not depend on the sampler chain or the grammar: grammar-forced tokens get their unforced probability.
  Exception (found by the review): a token that leaves a UTF-8 character unfinished gets no probability entry, and the next
  entry carries the whole character with only its own probability. The entries are matched to the generated token ids
  (`return_tokens`); such an entry, and any entry without `top_logprobs`, has no probability, so its fields have no score.
- Score of a request (a ranking score, not a probability of being right, and never called a confidence): the minimum, over
  its semantic fields, of the mean log-probability of the tokens of that field. Fields: the `do` value; each argument (its
  key name and its value); inside shape items the item kind and its value; inside `like` each key and value; and `end`, the
  brace that closes `args` and the separator after the request (the decision to stop adding arguments or requests). Not
  scored: `id`, the quote, other JSON punctuation and the mandatory keys. A field with a token lacking a probability → score
  missing.
- There is no calibration for this reader: no Qwen readings of the calibration messages exist, so no threshold can be
  chosen by the repository's protocol (cost-10, out-of-fold). **Every request is therefore held at every level**, with the
  reason "no calibrated threshold"; the score is shown in the details. Do it anyway runs one validated reading, as for the
  other readers. A missing score is a further explicit reason.
- This is a feasibility gate. It cannot produce a right or a wrong execution by itself.

## C. Preregistered live experiment (fixed before the run)

Hypothesis: the pinned Qwen3-0.6B Q8_0 runs as a sixth reader on the GitHub Pages site, on CPU in one browser thread,
produces validated proposals for the frozen fixture, and its integration leaves the five existing readers' outcomes unchanged.

Run: the frozen fixture on the deployed site, URL `?models=rules,vss,neural,combined,modernbert,qwen`, fresh browser profile,
default levels, no Do it anyway, nothing tuned (prompt, model, settings, thresholds stay as committed). The harness waits for
Qwen's reply to each message before the next message. Every turn records proposed wires, validation, holds, engine results,
reply, drawing SOP and SVG per reader; screenshots of the six final drawings.

Integration acceptance (each must hold, else the report says which failed):
1. The deployed commit and the served Qwen assets match the committed files (SHA256).
2. Six tabs ready; identical initial drawing SOP.
3. The GGUF SHA256 recomputed in the browser equals the pin; `n_gpu_layers: 0`, one thread, not multithreaded.
4. Thinking off: rendered prompt ends with the empty think block; no reasoning text.
5. Every Qwen output is validated before execution; no model output of Qwen's executes during the run (no Do it anyway is
   pressed; SOP Lang and toolbar turns would run in Qwen's world, but the fixture has none).
6. The five existing readers' 55 after-turn drawing SOP strings equal those of the five-reader live record
   (`reports/evidence/diagram-five-101edd9/record.json`).
7. No HTTP status ≥ 400 for model or runtime assets.

Measured and reported, not used to tune anything: per requested action, the executed outcome (right / wrong / asked /
other not done; extras separately), as in `reports/diagram-e2e-five.md`; separately, whether Qwen's validated proposal was
right, wrong or missing per action (a proposal is not an execution); validation failures by cause; per-request scores;
download, hash, start and first-check times; per-message full-request latency, prompt/cached/generated tokens and token rates;
memory where observable (browser process RSS on this machine, JS heap); the actual hardware and browser.

Grading rules (written before the live run):
- Executed outcome per requested action, as the fixture's instructions and `reports/diagram-e2e-five.md`: right / wrong / asked
  (held by a gate) / other not done (engine rejected, missing prerequisite, not read); unrequested executed actions are extras.
  The five other readers are graded exactly as in the five-reader record; their after-turn drawings are also compared byte for
  byte with it (acceptance 6).
- Qwen3's proposal per requested action (not an execution): **right** when its validated wires have the gold action and every
  gold value and target, and no other value that would change the drawing or the answer (an unrequested `outline=none`, for
  example, makes it wrong); a target given as a `context` reference counts as right only for the pronoun case, where the
  fixture itself asks for one; **wrong** when the action differs, a gold value or target is missing or different, or a
  drawing-changing value is added; **blocked** when it failed validation (with the cause); **none** when no request was proposed
  for that action. Intent is judged against the message, not against Qwen3's own drawing (in which, by design, nothing earlier
  was executed). For the unsupported control, a proposed request is reported as a held extra.
- Root causes of every wrong, blocked or missing proposal are classified by the first cause that explains them (prompt and
  examples, model semantics, schema/grammar, validation rule, context, runtime), with where the cause sits.

After the run (AGENTS.md): a root-cause analysis of Qwen3's wrong, blocked and missing proposals, and the `regress.sh` table in
the commit that changes reader code. The `models` URL parameter only decides whether Qwen3 loads; the five readers start as before.

Interpretation fixed in advance: this fixture has 10 dependent actions; it cannot estimate accuracy, calibration or AUROC.
Qwen's executed outcomes will be "asked" by design (B7). Fine-tuning is judged by what the run shows: if the warm per-message
latency on the test machine is far above the research's proposed limits (≤10 s p95 for 1–2-action inputs), fine-tuning does
not address the main blocker; if proposals are wrong in their semantics (actions, values, targets) rather than in format or
runtime, a fine-tuning proposal can address that, but it would first need the calibration and fresh-test protocol of D.

## D. Research proposals, not done here

Native llama.cpp CPU parity (token IDs and probabilities against the browser), a ≥400-message calibration of the score,
a ≥1,000-message fresh test, a multi-threaded or WebGPU path, other models (Qwen3.5-0.8B, SmolLM2-360M), fine-tuning.

## E. Independent review before implementation (2026-11-04) and what changed

An independent review (Opus, effort high, no repository changes) read this plan against `docs/js/ui.js`, `neural.js`, `logic.js`,
the pinned llama.cpp and wllama sources. Its findings and the changes made before any evaluation:

| finding | change |
|---|---|
| ui.js falls through to SOP-BERT's code and to "ready" for an unknown reader id | explicit `qwen` branches in `readPart`, `doPart0`, `isReady`, `offText`; an unknown id throws; Qwen without its gate executes nothing |
| a pending question of Qwen could make the five readers skip a message (`picks` in `run()`) | Qwen is not in `live`; it checks a reply against its own question when its turn comes |
| Qwen's drawing could change during a long reading (Do it anyway, drags, align, adopt, scenario frame, capability switch) | one serial queue (`qwenJob`) for every change to Qwen's drawing; not an align target; no drags while it reads; the Rules drawing it starts from is copied when it becomes ready and applied in its queue |
| unload/stop could leave the queue waiting forever | every open call is rejected when the worker is terminated; exit is raced against 5 s; a queued message is recorded as not read |
| invalid requests reach `engine.run` through `holdDestructive`'s dry run | blocked requests have no wires (display only) |
| context rule needs scalar values; SOP-BERT drops some combinations | one-item lists become plain values (already); `color`=`notColor`, a relative `position` without `anchor`, an `anchor` without `position` (except nearest, connected, check, arrange, equalize) are blocked, not changed |
| names, labels and context words not tied to the message | a shape name must be on the drawing, made by an earlier create of the output, or in the request's quote; `name`, `label`, `title`, `about`, `items` must be in the request's quote; `context` words in the quote; no commas or control characters in names |
| `maxItems` cuts silently | an output with 16 requests (or 8 not-understood parts) is held whole: what followed may be missing |
| `count` unbounded (undo count 1e9) | `count` 1 to 12, the engine's own cap |
| the score cannot see omissions; "confidence" label | `end` field added; the value is `score`, never `confidence` |
| memory of n_ctx 8192 (~0.94 GB KV FP16) | n_ctx is set from the measured fixed prompt (section B2 is updated with the measurement before the live run) |
| OPFS shared by tabs | download to `<sha>.gguf.part`, rename only after the SHA-256 matches, Web Lock exclusive for check/download/delete and shared while loaded; clear refuses while another tab uses it |
| `<|...|>` in user text | a message or name containing `<|` or `|>` is held without a model call |
| probability claim | verified in substance; wording corrected; the UTF-8 exception handled (B7) |
