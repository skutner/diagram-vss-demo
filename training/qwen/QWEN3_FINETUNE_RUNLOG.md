# Qwen3-0.6B fine-tuning plan: run log

The durable record of running `QWEN3_FINETUNE_PLAN.md`: the owner's decisions, what is running, each arm's declaration before it runs and
its result after. Newest state first in "Now"; the rest is append-only. Evidence: `reports/evidence/qwen3-finetune-plan/`. Models, data,
checkpoints and runs: `~/.cache/diagram-vss-qwen/` (not in git). Nothing here reads `nl_b` (texts, labels or analyses).

## Now

14:33, 2026-11-06. **Done for this session. Q1 ran and missed (c) and (e): the Qwen line stops, as declared.** Nothing is running; GPU
free; no server left running. Nothing committed.

| step | result | verdict |
|---|---|---|
| Q0.7 time (this laptop, wllama, 1 thread) | names p95 14.7 s, drawing p95 31.3 s | miss: second reader (D5) |
| Q0.2 native against browser | 20/32 identical, p99 0.183 | fail: browser calibration (D3) |
| Q0.4 validator | `nl_a` 99.10% (98.5% with unreliable rows), `nl_p1` 98.99% | miss; Q1 ran by the delegated decision (a) |
| Q0.5 overfit | 199/200 | pass |
| Q0.6 zero arm / export | 40/50, p99 0.157 / smoke 21/50; Q1's export 40/50, p99 0.174 | miss; reported, not gating, by the delegated decision (a) |
| Q1 (a) own rows | 98.8% | pass |
| Q1 (b) `nl_a` dev right share minus SOP-F0-s0 | 16.8% - 9.9% = +6.9 [+3.6, +10.3] | pass |
| Q1 (c) `nl_a` dev at the gate | cost -5.6, 4.6% right, 18.2% of executions wrong | **miss** |
| Q1 (d) fresh2+short3 at the gate minus SOP-F0-s0 | +27.1 [+20.8, +33.2] | pass |
| Q1 (e) unreadable or invalid outputs / cut | 1.39% / 0.05% | **miss** / pass |

## The owner's decisions, 2026-11-06 (the plan's section 13, approved as written)

| # | decision |
|---|---|
| D1 | The output: one line per request with its trigger, the 30-token system prompt, a grammar from the legend. Labels: "the words of a label are in the message". Number words through L1's table as a listed mechanical step, reported with and without it |
| D2 | The drawing in the prompt (Q3): yes, if Q2 passes |
| D3 | llama.cpp b11364 release binaries (CPU and CUDA 12.8) from ggml-org's GitHub may be downloaded, checked against the release SHA-256 digests, and run. If the permission system refuses, ask the owner; no workaround. If parity still fails, calibrate in the browser runtime in parallel instances (plan section 7) |
| D4 | The thresholds as written |
| D5 | Reference machine: this laptop, unloaded, wllama 3.8.1, one thread. Bar: 10 s at p95 for messages with 1-2 requests. WebGPU measured as a separate, reported variant. If the bar is missed, the line continues as a second reader, and every report says so |
| D6 | First labels Opus 5.5 medium, second labels gpt-6.1-sol high (Codex). At most one data round (Q4), only if its entry rule holds. Stop data work if the weekly limit runs low |
| D7 | Train from the dequantized shipped GGUF |
| D8 | The GPU: one job at a time, with the lock `~/.cache/diagram-vss-modernbert/locks/GPU-905b8484-3b1e-30f6-defd-05d44f00f692.lock` (`flock -n`) |
| D9 | Qwen gets its own final set, written by gpt-6.1-sol high from `training/sketch/llm_bench/NL_TEST_SPEC.md` when Q4 ends, labelled blind by both teachers. Nothing tuned on it; read once at Q5 |

Also from the owner's brief:
- L2's overlay (`training/neural/parity/LABEL_FIXES_L2.jsonl`, `label_fixes_l2.py`) gives the training targets' implied scales. It replaces
  the plan's `scale=0.67` shortcut in `make_examples.mjs`; the rows it changes are counted.
- Same-data controls: `~/.cache/diagram-vss-modernbert/arms/F0-s*` and `SOP-F0-s*` (data list `arms/data/F0`) wherever Qwen trains on that list.
- `docs/js/drawing-lines.js` against `K.worldSOP`: compared by tokens and effect only as a reported variant in Q3, one change at a time.
- Not edited by this session: `training/neural/**`, `docs/js/drawing-lines.js`, `training/sketch/llm_bench/nl_a/`, `nl_b/`,
  `training/sketch/llm_train/nl_p1/`. What is needed is copied into `training/qwen/`.

Times in this log are from `date` and file times. (Corrections 08:13 and 09:25: several headings first carried estimated times, ahead of the clock; they now carry
the evidence files' times.)

## State found at the start (07:21-07:30, observed)

- `git log`: HEAD `1fa93a5` (07:18 today, "ModernBERT parity plan: run end to end; goal not reached"). It committed the files the brief
  calls uncommitted (`training/neural/parity/score_arm.mjs`, `arm_lib.mjs`, `docs/js/neural.js`, `docs/js/neural-confidence.js`,
  `docs/js/drawing-lines.js`) and this plan's `training/qwen/finetune/` scripts. `git status`: only `training/laptop/node_modules` and
  `training/qwen/FINETUNE_IMPLEMENT_PROMPT.md` untracked. SHA-256s are still pinned in every manifest.
- GPU: free (13 MiB used, no compute process). Load average 0.36 / 0.22 / 0.13 on 20 logical CPUs (`uptime`).
- `~/.cache/diagram-vss-qwen/runtime/b11364-{cpu,cuda}`: empty folders (the download was refused last session).

## Arms

(Declarations and results are appended here as they run.)

### Q0.7. Time per message on the reference machine: declared before the run (07:30; amended 07:33, before the run)

- **What runs.** The shipped GGUF (`9465e63a…`) in wllama 3.8.1 (`docs/vendor/wllama-3.8.1`, libllama b11364), headless Chromium
  (`chromium_headless_shell-1223`), one thread, the reader's load settings except `n_ctx` 1,024 (plan section 6.2), this laptop with no
  other job running. The prompt a fine-tuned reader uses: the 30-token system prompt and `make_examples.mjs` `userTurn`.
- **Messages.** `nl_a` messages whose gold (Opus) has 1 or 2 requests, in set order, not session steps; the first 40 of the calibration
  part. Two input variants in separate runs: names only (Q1, Q2) and the drawing as `K.worldSOP` of the setup (Q3).
- **Output length.** The untrained model's own output is not what a trained one writes, so generation is forced (`ignore_eos`) to the
  gold's length in the line format (lines with trigger, in the GGUF's tokens), as a trained model that writes the gold would.
- **Measured.** Per message: wall time of `createChatCompletion`, new prompt tokens, cached tokens, prefill and decode rates. p50 and p95
  per variant. Plus the session cache: 2 `nl_a` sessions replayed step by step with the drawing after each step's gold, cached tokens
  per step.
- **Request**: as the deployed reader will send it: temperature 0, seed 0, `logprobs`, `top_logprobs: 2`, `cache_prompt`, thinking off,
  `ignore_eos` with `max_tokens` = the gold's line tokens + 1. No grammar (it does not exist yet; see the addendum).
- **Cache state measured.** Messages run one after another in one loaded model. A message reuses what its prompt shares with the previous
  one: always the system prompt; the drawing too when two consecutive messages have the same setup. Both cases are in the sample as
  they come, and the cached tokens of each are recorded. The `session` run gives the case of a drawing that changes after each step.
- **Unloaded condition**: nothing else runs (no agent running node or python, no download, no GPU job). Recorded: load average per
  message, AC power, CPU governor and platform profile. Model load is excluded from the per-message time and reported apart.
- **Grammar addendum, declared now:** when the GBNF grammar exists (Q0.4/Q1), the same names and drawing runs are repeated with it and the
  change of the decode rate is reported. The verdict below is read on the time **without** the grammar (the run now); the grammar run is
  reported beside it and, if it is slower, every later time number names both.
- Tool: `training/qwen/finetune/time_bench.mjs` (new). Smoke run of 2 messages before the run (07:31; tool check, not a result): prefill
  144 ms per token, decode 245 ms per token, load average 0.36-1.16.
- **Threshold (D5):** p95 of the per-message time <= 10 s for 1-2-request messages, per variant (names; drawing).
- **On a miss:** the line continues as a second reader (D5), and every later report says so. WebGPU is measured after, as a separate
  reported variant (same messages, `n_gpu_layers` 99), and does not change this verdict.

### D3: the b11364 release binaries (07:26, observed)

`gh api repos/ggml-org/llama.cpp/releases/tags/b11364` lists `llama-b11364-bin-ubuntu-x64.tar.gz` (CPU, 17,637,212 B) and
`llama-b11364-bin-ubuntu-cuda-12.8-x64.tar.gz` (171,329,376 B). Both downloaded by `curl` into the empty
`~/.cache/diagram-vss-qwen/runtime/dl/`; `sha256sum` equals the release digests (`7ccbd9c9…`, `0b815d92…`; `dl/SHA256SUMS.observed`).
Extracted into `runtime/b11364-cpu/` and `runtime/b11364-cuda/`. No permission refusal.

### Q0.2. Native b11364 against the browser: declared before the run (07:42)

- **Runs.** Native: `runtime/b11364-cpu/llama-b11364/llama-server`, CPU, with wllama 3.8.1's load settings as far as its code shows
  (`docs/vendor/wllama-3.8.1/index.min.js`): `-c 6144 -b 512 -np 1 --jinja --seed 0`, `--kv-unified`, flash attention, `n_ubatch` and the
  KV cache type at the runtime's defaults (wllama passes them undefined), 1 thread (wllama single-thread is always 1). Collected by
  `collect_qwen.mjs` with `TOP2=1`. Browser: `wllama_bench.mjs` on the same messages, one thread, not timed (parallel instances allowed).
- **Messages.** The first 32 messages of the calibration parts in set order (fresh2, short3, `nl_a`), shipped model and prompt.
- **Gate (the plan's Q0.2, unchanged):** >= 90% raw outputs byte-identical; p99 |Δ log-probability| <= 0.02 on the shared tokens; every
  divergence at a native top-1/top-2 margin < 0.1 nats; on identical outputs every token |Δ| <= 0.02. Tool: `parity_check.mjs`.
- **On a miss (D3):** calibration and every evaluation that feeds a threshold run in the browser runtime in parallel one-thread instances;
  native records are used only for development numbers and labelled as such. A miss does not stop Q1.

### Q0.4. The line validator in the format oracle: declared before the run (07:42)

- **What runs.** `training/qwen/finetune/lines_oracle.mjs` (new) with `lines_reader.mjs` (new): the gold of `nl_a` (both parts) and of every
  training folder (F0's 23, M2's 8, `nl_p1`), written as lines and read back by the reader's parser and validator (rules in the head of
  `lines_reader.mjs`). The keys per act and per description are learned from F0's gold (Q1's training data), not written by hand.
- **Pass:** >= 99.5% of the gold requests pass (not held, same wires back), on `nl_a` and on every training folder, with the plain label rule
  (D1). Reported beside it: the same with L1's number table, and the scored ceiling on `nl_a`.
- **On a miss** (the plan's rule): the validator rule that blocks the gold is changed, the change written here, and the oracle run again,
  before Q1. A validator that blocks correct gold would train the model to be held.

### Q0.3. The shipped reader's full baseline, natively on the GPU: declared before the run (07:46)

- **Run.** `collect_qwen.mjs` (the shipped prompt, JSON schema, `qwen-contract.js` validation and wires) through
  `runtime/b11364-cuda/llama-b11364/llama-server`, `-ngl 99`, GPU lock held, `-c 6144 -b 512 -np 1 --jinja --seed 0`, on `nl_a`,
  `collected_1`, fresh2, short3, `scenes_test` (all parts). Then the drawing variant (`DRAWING=setup`) on `nl_a` and `scenes_test`.
  Seen / unseen triggers by F0's inventory (`arms/data/F0/trigger_inventory.json`), the list Q1 trains on.
- **Scored** by `score_qwen.mjs` (every validated request executed, both views on `nl_a`, today and direction), the writes-nothing floor
  beside every number. Read as fixed in `training/qwen/finetune/PREREG_BASELINE.md` (before any of it ran). Reported, not gating.
- **Labelled** as native GPU numbers (b11364 CUDA), not the browser's: development numbers, never a threshold's input.

### Q0.5. GPU probe and the overfit gate: declared before the run (07:46)

- **Probe**: `gpu_probe_qwen.py` as its docstring, with the lock. Reported: memory and throughput per case. Not gating.
- **Overfit gate** (the plan's Q0.5): `overfit_test.py --device cuda --rows 200 --steps 400 --batch 4` on the first 200 rows with a request
  of Q1's own examples (F0 list, names only, L2 overlay). Its fixed settings: LoRA r=16, alpha=32, AdamW lr 2e-4, no weight decay, batch 4,
  seed 0, BF16 autocast. **Passes** at >= 99% of rows (>= 198 of 200) decoded exactly after 400 updates. **On a miss: stop**; the next
  proposal is a new declaration.

### Q0.7: result (07:53). Miss: the line continues as a second reader (D5)

`node time_bench.mjs --variant names|drawing|session --n 40` (07:34-07:53), evidence `q07_time.{names,drawing,session}.json`. wllama
3.8.1, libllama b11364, 1 thread, not multithreaded, headless Chromium 148. Model load 1.9 s (excluded). AC power on, governor powersave,
platform profile performance, load average at most 1.58 during the runs (20 logical CPUs). No grammar.

| variant (1-2-request `nl_a` messages) | n | p50 | p95 | max | prefill ms/token | decode ms/token | new prompt tokens (median) |
|---|---:|---:|---:|---:|---:|---:|---:|
| names only (Q1, Q2) | 40 | 8.7 s | **14.7 s** | 18.4 s | 145 | 201 | 37 |
| drawing (`K.worldSOP`, Q3) | 40 | 18.9 s | **31.3 s** | 37.9 s | 136 | 221 | 117 |
| session steps, drawing after each step's gold | 8 | 23.0 s | 44.8 s | 44.8 s | 136 | 227 | 119 |

- **Bar: p95 <= 10 s. Missed by both variants.** By D5 the line continues as a **second reader** (it answers later, or reads what the fast
  reader held), and every later report says so. Nothing is tuned on this.
- Cache: unrelated consecutive messages reuse only the system prompt (24-26 tokens); 5 of 40 drawing messages shared the previous
  message's setup and reused 115-221 tokens. In the 2 sessions the cache kept 22-172 tokens of a 150-340-token prompt: the drawing changes
  in the middle, so most of it is read again (median 119 new tokens).
- These are unloaded rates: prefill 136-145 ms per token, decode 201-227 ms per token, against 350-520 and 640 under load (plan 6.1).
- **WebGPU**: in `chrome-headless-shell` `navigator.gpu` exists and `requestAdapter()` returns null. The full Chromium is tried next.
- **WebGPU variant (07:55-08:04, reported, not gating).** The full Chromium (`chromium-1223/chrome-linux64/chrome`, flags
  `--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan`, on a 127.0.0.1 page) gets an adapter: NVIDIA, Ampere. With it and
  `n_gpu_layers: 99`, wllama 3.8.1 measured the same rates as on one CPU thread (`q07_time.webgpu.names.json`: p50 8.6 s, p95 14.7 s,
  prefill 145, decode 202 ms per token). So the runtime did not offload to WebGPU here. Why (the vendored single `wllama.wasm`, the
  page's settings, or a missing option) was not found within the time box (no native log reached the console). **Not measured: the time
  with WebGPU.** The drawing variant was stopped as redundant.

### Q0.4: first run (08:01). Miss, by a defect and two rules; changed before the second run

`node lines_oracle.mjs q04_lines_oracle.json --keys F0` (evidence overwritten by the second run; the first run's console is quoted here):
`nl_a` 672/800 = 84.0%; 21 of 32 folders under 99.5%. Causes, in order:
- **a defect of `lines_reader.mjs`** (not a rule): the per-request legend check parsed a request holding `$new` alone, where `$new` became
  `$null` ("reads $null before it is defined"): 40 on `nl_a`, about 1,350 in the folders. Fixed: `$new` stands as a placeholder name in
  that check; the wiring is `toNodes`' (unchanged).
- **the key table was learned from F0's raw gold**, without L2's overlay (so `resize` had no `scale`, 13 on `nl_a`) and without the other
  folders' forms (`mention(label=…)` 39 on `nl_a`, `create width/distance` in `scenes_r3`, `check/fact region` in `ops_positions`). Changed:
  learned from the gold of every training folder (F0, M2, `nl_p1`) with L2's overlay applied, the data the arms train on. Still learned.
- **an empty text value** (`label=""`, "remove the label", 138 in `synth_rules_ops`) was held as "no words". Changed: an empty value passes;
  a value with no word characters must be written in the message.
Rule kept as declared: every word of a label/name is a word of the message.

### Q0.4: final run (08:08). Miss on `nl_a` and `nl_p1`, by D1's label rule and keys no training row has

Changes after the first run, each written before its rerun: (1) the `$new` defect; (2) keys learned from every training folder with L2's
overlay (52 acts, 9 description keys, from 28,136 rows / 61,390 wires; `~/.cache/diagram-vss-qwen/arms/act_keys.ALL.json`); (3) empty
label passes; (4) the drawing's labels (shape and edge labels, `lines_reader.mjs` `drawingLabels`) count as known names and as the words of
a description's label; (5) the oracle's own context: names on the drawing as replayed at each session step; rows marked `unreliable`
(never trained on, `make_examples.mjs`) reported apart, not in the gate. (4) and (5) give the validator what the page has (the drawing).

`node lines_oracle.mjs q04_lines_oracle.json --keys ALL --keys-out …/act_keys.ALL.json`, plain label rule (D1):

| gold | requests (reliable rows) | pass | share | 99.5% |
|---|---:|---:|---:|---|
| F0's 23 folders (Q1's data) and M2's 8 folders | each | each | 99.96-100% | pass, all 31 |
| `nl_p1` | 791 | 783 | 98.99% (99.37% with L1's number table) | **miss** |
| `nl_a` (both parts) | 777 | 770 | 99.10% (same with the table) | **miss** |

- `nl_a`'s 7: labels whose words the message does not write (teacher normalized: "1946", "3s", "scope", a name), 4, by **D1's rule**; and
  3 key combinations no training row has (`disconnect target`, a description with `anchor`, `count label`).
- `nl_p1`'s 8: labels not in the message 5 (D1's rule), names neither on the drawing nor in the message 2, 1 label with no words.
- Unreliable rows apart: `nl_a` 23 requests, `nl_p1` 36 (25 pass).
- Ceiling through this validator, `nl_a` development against Opus: 387/392 right, 0 wrong (today and direction); calibration 401/408.
- **Reading.** The rule the plan lets me change is changed; what still holds the gold is D1's approved rule (a label's words are in the
  message) and forms absent from every training row. Changing D1 is the owner's. **Q0.4 is a miss as declared.** Q1's own data (F0) passes
  in every folder. Whether Q1 may run with this validator is put to the owner with the other Q0 results; Q0 goes on meanwhile.

### Q1's data, built before any Q1 decision (08:10, observed)

`node make_examples.mjs ~/.cache/diagram-vss-qwen/arms/Q1/examples.jsonl --names-only --label-fixes training/qwen/data/LABEL_FIXES_L2.jsonl
--acts <F0 reader.json acts> <F0's 23 folders (lists.mjs)>`: 24,698 messages, 54,584 requests, 0 left out, names only. L2's overlay
(a byte copy of `training/neural/parity/LABEL_FIXES_L2.jsonl`, SHA-256 `2e1aa05f…`): 509 of its 559 lines apply (50 name rows outside
this list), as `arms/data/F0.out` reports for F0; 509 resize lines in 504 rows carry the overlay's `scale`. Checked against `arms/data/F0/train.jsonl`: the same 24,688 ids with requests, the same
number of requests for every id, and 10 messages with none. So Q1 trains on F0's messages and labels: `F0-s*` and `SOP-F0-s*` are
same-data controls. The plan's `scale=0.67` shortcut is not used (`implied_shrink_scale_added` 0).

### Q0.6 zero arm: declared before the run (08:16)

- Native records: the shipped GGUF in the line-format prompt (names), b11364 CPU, 4 threads (`collect_lines.mjs`, server on port 8097), the
  first 50 messages of `nl_a`'s calibration part. No grammar, so a native token is the model's own argmax (temperature 0), which PyTorch's
  argmax can be compared with.
- `teacher_forced.py --dtype bf16` on the GPU (lock): the training base (dequantized GGUF in BF16) teacher-forced on those prompts and outputs.
- **Passes** (the plan's Q0.6): greedy identical on >= 95% of messages (>= 48 of 50) and p99 |Δ log-probability| <= 0.05.
- **On a miss:** it is reported and the line stops before Q1 (a training base that does not reproduce the shipped model makes "no training"
  something else than the shipped reader).

### Q1: declared before the run (08:20). Runs only if every Q0 gate passes, or by the owner's decision on the misses

- **Change.** LoRA (section 4) from the dequantized shipped GGUF on Q1's examples (above: F0's 24,698 messages and 54,584 requests, L2's
  overlay, names only), the line format and the 30-token system prompt. Recipe fixed in the plan, not tuned: r=16, alpha=32, 196 modules;
  lr 2e-4, linear warm-up over 3% of updates, cosine decay; 2 epochs; 32 rows per update (1,544 updates); AdamW, no weight decay; seed 0;
  loss on the target and its `<|im_end|>` only; BF16 base and autocast, gradient checkpointing; micro-batches of <= 8,192 padded tokens
  (memory only). Tool `train_qwen.py --merge`, then `write_gguf.py --weights merged.pt`. Every long job ends by 06:45 on 2026-11-07
  (`--deadline`, `timeout`).
- **Records.** Every number that feeds a threshold (calibration parts, and the parts read at the gate) is collected in the browser runtime
  (`collect_lines.mjs BACKEND=wllama`, wllama 3.8.1, one thread per instance, parallel instances, n_ctx 1,024, max_tokens 256, no grammar)
  if Q0.2 fails; natively (b11364 CPU) if it passes. Without the grammar is the headline; with the grammar is collected after, on `nl_a`
  development, for (e) and the grammar-time addendum of Q0.7. Validator: `lines_reader.mjs` with `act_keys.ALL.json`, plain label rule (D1);
  the number table reported beside (re-validation of the same outputs).
- **Confidence.** `calibrate_qwen.mjs --cal fresh2,short3,nl_a` (the F0 arms' fit `cal-fresh2-short3-nl_a`), the threshold at cost 10.
- **Scorer.** `score_arm.mjs scoreArm` with that confidence file (pinned SHA-256s in every output); comparisons by `compare_qwen.mjs`
  (= `compare_arms.mjs`, plus the right share). Against Opus with the direction of a resize compared; either teacher beside.
- **Controls.** Gating: **SOP-F0-s0** (SOP-BERT trained on the same list and labels, seed 0, `cal-fresh2-short3-nl_a` fit), re-scored with
  the same scorer. Reported beside: SOP-F0-s1, -s2, F0-s0..s2 (ModernBERT, same list), the shipped SOP-BERT. Writes-nothing floor beside all.
- **It worked when all hold** (the plan's Q1, control as above):
  - (a) on 1,000 of its own training rows (a seed-0 sample), >= 95% of requests right by the scorer (native, a development number);
  - (b) `nl_a` development, every request executed, against Opus with direction: Q1's right share minus SOP-F0-s0's, lower end of the 95%
    interval above 0 (`compare_qwen.mjs` right share, session/group/message resampling);
  - (c) `nl_a` development at Q1's own cost-10 gate: cost score > 0, >= 5% of requested actions right, <= 5% of executions wrong;
  - (d) fresh2 + short3 test: Q1 minus SOP-F0-s0, paired cost score at each one's gate, lower end above -10;
  - (e) messages whose output has a line the parser cannot read, or is invalid as a whole (runtime error, hidden reasoning), <= 1%; outputs
    cut at 256 tokens <= 1%. (Requests the validator holds for their content are not failures; they are counted and reported by cause.)
- **On a miss:** (a) the recipe underfits: reported, a new declaration would follow (not in this session). (b) or (c): the Qwen line stops.
  (d) or (e): reported; the owner decides whether Q2 goes on. Every report says Q1 is a second reader (Q0.7).

### Code review of the Q0 code (`code-reviewer`, Opus 5.5, max effort; launched 08:22, report about 08:45). Verdict: ready after named fixes. Fixed by 08:51

The reviewer's findings (delegated; I checked B1 against the code before fixing). Its probes and runs are in the session scratchpad.
- **B1 (blocking)**: `$new` after a held create bound to an earlier create, and a name only a held create would make passed; the scorer
  then counted such a request right (bench-canon collapses references). **Fixed** in `lines_reader.mjs`: `$new` is the latest create or
  duplicate line (or an unreadable line after it) and is held when that line is held; names a held create/rename/duplicate would make are
  held unless on the drawing. Tests added (`test_qwen_lines.mjs`, 4 cases; the reviewer's probes showed the old code failing them).
- **I1**: the collector validated with names only, the oracle with names on the drawing and labels. **Fixed**: one `readerContext()` used by
  the oracle, `collect_lines.mjs` and `own_rows.mjs`.
- **I2**: the train/eval overlap check was opt-in. **Fixed**: `collect_lines.mjs` refuses to run without `--examples` (or `--untrained`);
  records carry `overlap_checked`. The reviewer counted 15 evaluated messages whose text is in Q1's rows (short3 test 4, `nl_a` development
  1: `nl-11-010`; they will be marked `train_text_overlap` and reported with and without).
- **I3**: the artifact key bound neither the backend nor the served file. **Fixed**: `GGUF=path` is required and hashed; the key includes the
  backend; a native server must report that file in `/props`.
- **M1** names matched as substrings ("Art" in "Start"). **Fixed**: by words. **M2** group names were in evaluation prompts but not in
  training prompts. **Fixed**: `make_examples.mjs` writes the row's names and group names (as `contextNames`).
- Not changed (reported by the reviewer below 80 confidence): the number-table variant also counts the inner word of "forty five"; the
  binary-table edge case of `table()`; calibration labels on `today` as `calibrate_arm.mjs` does; the rendered-prompt tail check is not in
  `collect_lines.mjs` (the reviewer verified the rendered prompt equals `qwen_lib.render` on 50/50 records).

After the fixes: `test_qwen_lines.mjs` all pass (40 checks), `test_compare_qwen.mjs` 4/4. The Q0.4 oracle gives the same numbers as before
(`nl_a` 770/777 = 99.10%, `nl_p1` 783/791 = 98.99%, every other folder >= 99.96%). Q1's examples rebuilt (SHA-256 `aa6f5028…`): 24,698
messages, 54,584 requests, 0 ids differing from F0, 509 L2 fixes; 22,175 prompts list names. Earlier Q0 numbers that do not use these files
(Q0.7, the Q0.3 shipped-reader collection, the Q0.2 parity run) are not affected.

### Q0.2: result (08:54). Fail: native b11364 does not compute the browser's probabilities

Native: b11364 CPU release build, 1 thread, `-c 6144 -b 512 -np 1 --jinja --seed 0 -kvu`, flash attention / ubatch / KV type at the runtime's
defaults (`runs/q02/server-cpu-8095.log`), `collect_qwen.mjs` with `TOP2=1`, the first 32 calibration messages (fresh2). Browser:
`wllama_bench.mjs` in 4 one-thread instances of 8 (`--from 0,8,16,24 --short 0`), merged. `node parity_check.mjs native32.jsonl
bench.all.json q02_parity_b11364.json` (evidence also `q02_wllama_bench.json`):

| condition | measured | bar |
|---|---:|---:|
| raw outputs byte-identical | 20/32 = 62.5% | >= 90% |
| p99 \|Δ log-probability\| on shared tokens (2,709) | 0.183 | <= 0.02 |
| largest \|Δ\| on identical outputs | 0.627 | <= 0.02 |
| divergences not at a near tie (< 0.1 nats) | 6 of 12 | 0 |

- So the same build (b11364) natively on this CPU and in WASM differ: the difference is not the build version. Native CPU kernels
  against WASM SIMD is what remains; not isolated further.
- **By D3: calibration, and every evaluation that feeds a threshold, run in the browser runtime** (`collect_lines.mjs BACKEND=wllama`, parallel
  one-thread instances). Native records (CPU or GPU) are development numbers only and are labelled so.

### Q0.3: result (08:59). The shipped reader's baseline, native GPU (development numbers)

`flock … bash q03_baseline.sh` (07:59-08:58), b11364 CUDA release build, CUDA runtime from `~/learningAI/local-llm/runtime/cuda-dependencies`
(SHA-256s in `runs/q03/cuda_libs.sha256`). Scored by `score_qwen.mjs` (every validated request executed); evidence
`q03_baseline_shipped.json`, `q03_baseline_drawing.json`. The writes-nothing floor is 0 right, 0 wrong, cost 0 on every part (the tool
refuses otherwise).

| set / part (requests) | right | wrong | extras | cost score | invalid outputs | >512 tokens |
|---|---:|---:|---:|---:|---:|---:|
| `nl_a` development, Opus (392) | 13 (3.3%) | 73 | 121 | -491.6 | 5 | 14 |
| `nl_a` development, either (412) | 13 (3.2%) | 73 | 121 | -467.7 | | |
| `nl_a` calibration, Opus (408) | 20 (4.9%) | 67 | 128 | -473.0 | 2 | 18 |
| fresh2 test (1,313) | 64 (4.9%) | 82 | 147 | -169.5 | 4 | 36 |
| short3 test (432) | 51 (11.8%) | 48 | 104 | -340.0 | 1 | 4 |
| `collected_1` (44) | 3 (6.8%) | 13 | 16 | -652.3 | 4 | 7 |
| `scenes_test` (163) | 25 (15.3%) | 60 | 44 | -622.7 | 2 | 3 |
| drawing variant: `nl_a` development, Opus | 12 (3.1%) | 62 | 118 | -456.1 | 2 | 10 |
| drawing variant: `scenes_test` | 30 (18.4%) | 49 | 33 | -484.7 | 4 | 5 |

Read by `PREREG_BASELINE.md`: below SOP-BERT (8.9% against Opus), so the prompt alone does not carry this language, and gains must be
compared with SOP-BERT trained on the same data (SOP-F0). The drawing barely changes the untrained model (3.1% against 3.3%). Directions
equal "today" everywhere (no resize right by value). Reported, not gating.

### Q0.6 zero arm: result (09:00). Miss: the line stops before Q1, as declared

`teacher_forced.py --records runs/q06/zero.native50.jsonl --dtype bf16 --n 50` (GPU, lock), evidence `q06_zero_arm.json`: greedy identical on
**40 of 50** messages (bar 48); |Δ log-probability| over 2,044 tokens p50 0.0000045, **p99 0.157** (bar 0.05), max 0.464. The 10 divergences are
at margins of 0, 0.125, 0.25, 0.375, 0.5, 0.75 nats: multiples of 0.125, the step of a BF16 number near the logits' size (inference).
- **Verdict: miss.** By the declaration, Q1 does not run on this base as it is. Nothing is tuned to pass it.
- Root cause, measured next as a diagnostic (not a rerun of the gate): the same records teacher-forced in FP32 (`--dtype fp32`), which
  separates the BF16 cost from the native-kernel difference (llama.cpp's Q8_0 matmul quantizes activations too).

### Q0.5: probe result, and the overfit gate's first run crashed (09:02)

- **Probe** (`gpu_probe_qwen.py`, evidence `gpu_probe_qwen.txt`, torch 2.15.0+cu132, 5.54 GiB free): LoRA, BF16 base, no checkpointing:
  batch 4 x 256 tokens fits (3.74 GiB, 0.28 s per update, 3,685 tokens/s); every larger case out of memory. LoRA with checkpointing: all
  three cases errored ("element 0 of tensors does not require grad"): the probe uses re-entrant checkpointing with a frozen embedding, the
  defect `train_qwen.py` avoids (`use_reentrant=False`). Full fine-tuning cases ran (AdamW FP32 3.70 GiB at 4 x 256 with checkpointing;
  SGD BF16 2.26 GiB); that AdamW fits contradicts the plan's arithmetic and was not looked into (not used).
- **Overfit gate, first run: crashed, not measured.** `overfit_test.py --device cuda` holds the base in FP32 and ran out of memory at the
  first update (`runs/q05/overfit.out`). A tool defect on this card. **Fix, declared before the rerun:** `--base-dtype bf16` holds the frozen
  base in BF16 with SDPA and non-reentrant checkpointing, as `train_qwen.py` (the arm's own trainer) does. Every fixed setting of the gate
  stays (200 rows, 400 updates, batch 4, lr 2e-4, r 16, seed 0, pass >= 198/200 decoded exactly).

### Q0.6 zero arm: root cause (09:03, diagnostic, the verdict stays a miss)

The same 50 native records teacher-forced in **FP32** (`--dtype fp32`, eager attention; `q06_zero_arm.fp32_diagnostic.json`): greedy
identical **40 of 50** again, p99 |Δ| 0.128 (BF16 0.157), max 0.357. 7 of the 10 diverging messages are the same as in BF16; the FP32 margins are
not multiples of 0.125 (0.02-0.46 nats). So BF16 is not the cause: exact FP32 PyTorch on the dequantized weights already differs from the
native b11364 CPU run as much. Inference: llama.cpp's Q8_0 kernels (activations quantized to 8 bits per block before the dot products) are
not the dequantized FP32 model. And Q0.2 showed that native CPU is not the browser either. So "no training" in PyTorch is the shipped
weights, but not the shipped runtime's numbers; the gate as written (against native CPU) cannot be met by any PyTorch precision here.
What would be meaningful instead (the owner's decision, not taken): measure the zero arm against the browser records themselves, with a
bar set for a runtime that quantizes activations, or accept the training-side difference and rely on browser calibration of every arm.

### Q0.5 overfit gate: result (09:10). Pass

`overfit_test.py --examples arms/Q1/examples.jsonl --rows 200 --steps 400 --batch 4 --device cuda --base-dtype bf16` (GPU, lock), evidence
`q05_overfit_gpu.json`: **199 of 200** rows decoded exactly (bar 198). Target loss 3.354 before, 0.0009 after; 0.30 s per update; peak 1.89
GiB allocated; 456 s in all. The one row not exact (`sm-0010`) writes the same keys of one request in another order (`shape` before
`color`); its wires are the same. (The script's own `passed: false` is its all-rows rule of the CPU test; the declared bar is 198.)

### Q0.6 export check, with a trainer smoke run: declared before the run (09:10). Not an arm

- `train_qwen.py --examples arms/Q1/examples.jsonl --max-updates 50 --merge` (Q1's recipe, stopped at 50 of 1,544 updates; GPU, lock,
  timeout): the trainer's first run. Reported: peak memory with the 8,192-token budget and checkpointing, whether the loss falls,
  `merged_modules` = 196. Then `write_gguf.py --weights merged.pt` (must stay 639,446,688 B), 50 native records of `nl_a`'s calibration part
  with the exported GGUF (b11364 CPU, `collect_lines.mjs --examples`), and `teacher_forced.py --weights merged.pt --dtype fp32`.
- **Bar (the plan's):** greedy identical >= 95% and p99 |Δ| <= 0.05. Expected to miss for the zero arm's reason; reported also against the zero
  arm's FP32 numbers (40/50, p99 0.128): does the export add divergence beyond them? This model is never evaluated as an arm.

### Q0.6 export check: result (09:15). Miss; the export to Q8_0 loses part of the update

- **Trainer smoke** (`runs/q06/export-smoke/`): 50 of Q1's updates, 159 s (3.0-3.3 s per update: all 1,544 updates of Q1 would take about
  85 min), peak 4.35 GiB, loss 0.586 at update 30 → 0.404 at 50, `merged_modules` 196. `write_gguf.py`: 639,446,688 B, 196 tensors changed,
  SHA-256 `d06a4c53…`. After 50 updates the exported model already writes the line format. `collect_lines.mjs` checked that the server
  serves that file (`/props`, review I3).
- **Export check** (`teacher_forced.py --weights merged.pt --dtype fp32`, `q06_export_smoke.json`): greedy identical **21 of 50**, |Δ| p50 0.006,
  **p99 0.335**, max 1.90. **Miss** (bar 48/50, 0.05), and much further off than the zero arm (40/50, p50 0.0000036, p99 0.128).
- Diagnostic: the exported GGUF's own weights, dequantized, teacher-forced the same way (`…dequantized_export_diagnostic.json`): 31/50,
  p50 0.0024, p99 0.125 (about the zero arm's p99). In `layers.10.mlp.down_proj` the LoRA change has an RMS of 1.36e-4 and re-quantizing
  to Q8_0 moves the weights by 1.12e-4 RMS; the exported change keeps a cosine of 0.68 with the trained change. So (observed, for this
  50-update model) re-quantizing to Q8_0 removes or distorts a large part of a small update; a longer run makes a larger change (not
  measured). The model the browser runs is the exported one; what PyTorch learned is not exactly it. Every arm must therefore be measured
  on its exported GGUF in the browser runtime, which D3 already requires.

### Delta review of the fixes (`code-reviewer`, Opus 5.5, max; report about 09:18). One blocking remainder, fixed by 09:22

- **B1 partly open (blocking)**: a held command line whose action is misspelled or missing (`action=creat`) did not count as a possible
  create, so `$new` (or `from=Valve`) bound to an earlier create and was scored right. **Fixed**: a held command whose action is missing or not
  a legend action counts as a line that may have made something (for `$new` and for the name it would make); the names follow the latest
  line that makes each name (reviewer's minor). 5 tests added; `test_qwen_lines.mjs` 44 PASS. Oracle rerun: the same numbers.
- I1, I2, I3, M1, M2: confirmed fixed by the reviewer. Minor fixed: the `/props` check refuses a relative `model_path`.
- Not fixed, recorded: a `mention(label=…)` that names a label made by a held line of the same output is not held by this rule (14 such
  descriptions in `nl_a` gold reuse a label made earlier in the message); multi-word names are matched as word sets (0 multi-word names in
  the sets). Reviewer's note: the run log's "40 checks" was 39 at the time (now 44).

### Q0.7 grammar addendum: how it is measured (09:30, before the run)

The declared way (the shipped model forced to the gold's length) cannot run under the grammar: with it, wllama generates 1 token and
stops (smoke, 2 messages; the shipped model's first token is not `[`). Measured instead, as a reported addendum: the 50-update export model
of the Q0.6 smoke (it writes the line format; natively, with and without the grammar, it gave the same 2-line output on a test message),
in wllama, one thread, idle machine, the same 40 names messages, stopping by itself (`--natural`, max 256), once without and once with the
grammar (`arms/grammar.ALL.gbnf`, 11,225 B). Reported: decode ms per token, p50/p95 per message, outputs that differ. The verdict of Q0.7 is
unchanged (read without the grammar).

### Q0.7 grammar addendum: result (10:16). Reported, not gating

`time_bench.mjs --variant names --n 40 --natural [--grammar arms/grammar.ALL.gbnf]` with the 50-update export model, wllama, 1 thread, idle
(load at most 1.69); evidence `q07_time.grammar_addendum.{none,grammar}.json`. No runtime errors: wllama accepts the grammar.

| | p50 | p95 | decode ms/token | tokens generated (40 messages) | outputs cut at 256 |
|---|---:|---:|---:|---:|---:|
| without grammar | 29.6 s | 66.6 s | 222 | 5,191 | 7 |
| with grammar | 61.6 s | 68.0 s | 232 | 6,415 | 25 |

- Per token the grammar costs about 4% (232 against 222 ms). Per message it costs far more here, because under the grammar this model
  writes on until the 256 cut in 25 of 40 messages (38 of 40 outputs differ). Natively on one test message both stopped after 2 lines.
- These times are of a model after 50 of 1,544 updates (it runs on even without the grammar: 7 cut); they are not a trained model's.
  The share of cut outputs with and without the grammar is part of Q1's criterion (e), measured on Q1's own model. Why the grammar makes
  it run on in wllama was not examined.

### The owner delegates the two open decisions; decisions taken (10:35)

The owner, verbatim: "you can ask the advisor (opus 5.5 max) to make the decisions for the open questions then you go on with training".
The advisor's decisions, recorded before anything trains:
- **Q0.4: (a).** Q1 runs with the validator as it is; D1's label rule stays. Held requests are the honest outcome ("not done / asked" is never
  an error); Q1's own data passes in all 23 F0 folders; the cost is bounded (ceiling 387/392 on `nl_a` development). Reported: 99.10% and
  98.5% (with the unreliable rows), and the held requests by cause.
- **Q0.6: (a).** Q0.6 is reported and does not gate Q1; Q1 is judged only on its exported GGUF in the browser runtime (D3). Two conditions:
  (1) Q1 (a), the 1,000 own rows, is measured on the exported GGUF (native server), never on the PyTorch model; (2) after export,
  `teacher_forced.py --weights merged.pt --dtype fp32` on 50 native records of Q1's exported GGUF, reported beside the zero arm (40/50, p99 0.128)
  and the plan's bar, information only.
- Before collection: the open false-pass of the delta review is closed (a `mention(label=X)` whose X only a held line of this output would
  create is held), with a test.
- Order: train (1,544 updates, deadline, lock) → merge → export → own rows (a) and export fidelity (native) → 20-message browser smoke →
  full browser collection on the sets SOP-F0-s0 holds (fresh2, short3, `nl_a`, `collected_1`, `scenes_test`), `--examples` with
  `--allow-text-overlap` (marked, reported with and without) → grammar run on `nl_a` development for (e) → `calibrate_qwen.mjs --cal
  fresh2,short3,nl_a` → `scoreArm` → `compare_qwen.mjs` against SOP-F0-s0 → root causes (seen and unseen apart) → verdict as declared.
- Fix applied (10:36): `mention(label=X)` held when only a held line of this output sets X; 2 tests; `test_qwen_lines.mjs` all pass; Q0.4 oracle numbers unchanged. Q1 training starts at 10:36.

### Q1 training: stopped by an out-of-memory error at update ~145; resumed with a smaller micro-batch (10:44)

At 10:43 the trainer ran out of GPU memory in a backward pass (a micro-batch's target logits: 1,000 MiB more were asked, 878 MiB free).
Loss by then: 3.83 at update 10, 0.185 at 100, 0.082 at 140. The micro-batch size is declared a memory setting only (the update's
gradient is the same sum over its 32 rows divided by its target tokens), so: `--token-budget 4096` and
`PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`, resumed from `ckpt.pt` (update 100; the order of rows, the learning-rate schedule
and the RNG state come from the checkpoint). The recipe is unchanged.
- Training finished (11:41): 1,544 updates, 3,412 s after the resume, peak 3.53 GiB, merged_modules 196; loss 0.055 at 500, 0.023 at 1,000, 0.007-0.022 at the end.
- 12:00: Q1 (a) own rows on the exported GGUF: 2,136/2,162 right (98.8%), 15 wrong, 8 extras, 0 cut (`q1/q1_own_rows.json`): **(a) passes** (95%). Export fidelity (`q1/q1_export_fidelity.json`, information): 40/50 greedy identical, p99 0.174 (zero arm 40/50, 0.128). Browser smoke, 20 `nl_a` messages: 0 errors, 0 cut, signals on every produced request, 1 unreadable line of 30. Full browser collection started (8 instances).
- 13:57: the browser collection stopped at 12:58 when the previous Claude session ended (1,634 of 1,941 records; every shard ends on a whole record; the code hashes in the shard manifests equal the files now). Resumed with the same command (`q1_eval.sh collect`); each instance skips the messages it has. A resumed instance starts with an empty prompt cache, which changes speed, not the request.

### Q1: result (14:25). Miss on (c) and (e): the Qwen line stops here, as declared. Second reader (Q0.7)

Records: `Q1-s0.gguf` (SHA-256 `b0dbb93d…`) in wllama 3.8.1, 8 one-thread instances, 1,941 messages (fresh2, short3, `nl_a`,
`collected_1`, `scenes_test`), merged by `merge_shards.mjs` into `arms/Q1/q1.browser.jsonl`. `calibrate_qwen.mjs --cal fresh2,short3,nl_a`:
678 calibration messages, 1,161 produced requests, all with signals; L2 0.1; out-of-fold AUROC 0.913; cost-10 threshold 0.9107.
Scored by `score_arm.mjs` (`q1/q1.score.json`), compared by `compare_qwen.mjs` with SOP-F0-s0 re-scored by the same scorer
(`q1/q1_minus_SOP-F0-s0.json`). Against Opus with the direction compared; the numbers equal the today view on `nl_a` development.

| criterion | Q1 | SOP-F0-s0 | bar | verdict |
|---|---|---|---|---|
| (a) own rows, exported GGUF | 2,136/2,162 = 98.8% | | >= 95% | pass |
| (b) `nl_a` dev, every request executed, right share | 66/392 = 16.8% | 39/392 = 9.9% | diff +6.9 [+3.6, +10.3] > 0 | **pass** |
| (c) `nl_a` dev at Q1's gate: cost score | -5.6 (18 right, 3 wrong, 1 extra of 22 executed) | -8.2 | > 0 | **miss** |
| (c) right share at the gate | 18/392 = 4.6% | 2.0% | >= 5% | **miss** |
| (c) wrong share of executions | 4/22 = 18.2% | 33.3% | <= 5% | **miss** |
| (d) fresh2 + short3 test, cost at each gate | 52.8 | 25.7 | diff +27.1 [+20.8, +33.2] > -10 | pass |
| (e) messages with an unreadable line or invalid output | 27/1,941 = 1.39% | | <= 1% | **miss** |
| (e) outputs cut at 256 tokens | 1/1,941 = 0.05% | | <= 1% | pass |

- Writes-nothing floor beside every number: 0 right, cost 0.
- Without the training-text overlap (15 messages marked; 1 in `nl_a` development): `nl_a` development every request executed 65/391; at the
  gate 17 right, 3 wrong, 1 extra, cost -5.9. Same verdict.
- Either teacher and the other sets: in `q1/q1.score.json` and `q1_minus_SOP-F0-s0.log`. Beside them: fresh2 test every request executed
  1,218/1,313 = 92.8% (SOP-F0-s0 81.0%), short3 test 82.4% (67.4%), at the gate +28.0 and +24.3 cost points over SOP-F0-s0, both intervals
  above 0. `scenes_test` every request executed 100/163 (gate cost 16.6); `collected_1` 15/44 (gate cost -61.4).
- **Reading, plainly:** Q1 reads more of the natural language than SOP-BERT trained on the same rows (16.8% against 9.9% with every request
  executed), and much more of the older language. At the cost-10 threshold on `nl_a` it executes 22 requests of 392 and 4 of them are wrong:
  the confidence does not separate right from wrong well enough there (AUROC 0.81 on `nl_a` development) to clear the absolute floors.
  By the declaration a miss on (c) stops the Qwen line; there is no retry.
- Root causes (`q1/q1_root_causes.json`, every request executed, `nl_a` development, 392 requested, 66 right): seen triggers: wrong value
  62, missing request 49, held by the validator 38, wrong value by reference 12; unseen: missing request 86, wrong value 40, held 30,
  reference 9; extras 131. (A request with the wrong act shows as an extra plus a missing request: the scorer pairs by act first.) The
  validator held mostly values outside the legend the model invented (`template`, `shape`, `topic`, `ask`, `action` values: 53 of the
  first errors), then unreadable key=value (7). So on natural language the model is right about the value or misses the request; it
  invents legend values the training data never had.
- Time: these records were collected 8 instances in parallel, not on the reference machine alone; they are not a time measurement.
  Q0.7's time stands: p95 14.7 s for names-only messages (second reader).
- Grammar run (information for (e); `q1_eval.sh grammar`, `nl_a` development only, 300 messages, browser, 8 instances): without / with the
  grammar: messages with an unreadable line or invalid 9 / 3; cut 0 / 1; requests held 130 / 49; requests produced (executed if all are)
  320 / 406; right 66 / 69. The grammar removes most unreadable and out-of-legend lines, and those become executed requests: 86 more
  produced for 3 more right. Not scored at the gate (the confidence was fitted without the grammar).

## After Q1

### The owner's next steps (14:58)

Asked "what should we do next?", the recommendation was: 1 commit; 3 a natural-language data round; 4, only if wanted, the plan's Q2 (Q1's
data plus `nl_p1` and the M2 folders), which needs the owner's override of Q1's stop rule. The owner, verbatim: "1,3 then 4".
- **1**: committed as `1e46fb6` (not pushed; the message was amended before any push to say which files are not reviewed yet).
- **3**: already running in the ModernBERT session (`nl_p2`, 1,518 messages, and its learning curve on the GPU; `MODERNBERT_RUNLOG.md`).
  Not duplicated here. It has the GPU first (the owner's order).
- **4**: the owner's "then 4" is taken as the override of Q1's stop rule for Q2, as described to him. Declared below.

### Q2: declared before the run (14:58)

- **Change from Q1:** Q1's data plus M2's 8 folders and `nl_p1` (adjudicated, `opus/`), names only, L2's overlay (559 of 559 lines apply on this
  list). `~/.cache/diagram-vss-qwen/arms/Q2/examples.jsonl`: 28,103 messages, 61,354 requests. Q1's recipe unchanged (2 epochs, 32 rows per
  update, so about 1,756 updates), with the 4,096-token micro-batch (memory only). `nl_p2` is not in Q2 (still being labelled; it gets its
  own declaration after the ModernBERT curve says whether this data moves a reader).
- **Same-data control: ModernBERT M3-s0** (F0 + M2s + M2n folders + `nl_p1`), the plan's "or the ModernBERT arm on the same list". Checked
  against `arms/data/M3/train.jsonl`: the same ids and per-id request counts except 33 `nl_p1` rows marked `unreliable` that M3 trained and
  Q2 leaves out (28 ids with requests, 36 requests, 0.06%), the plan's rule for unreliable session steps. 34 `nl_p1` resizes have no scale
  (L2's overlay does not cover `nl_p1`); M3 had the same labels. M3-s0 re-scored with the pinned scorer (`controls/M3-s0.score.json`):
  `nl_a` development every request executed 44/392, at its gate cost -7.4.
- **Records, confidence, scorer:** as Q1 (browser runtime, 8 instances, `calibrate_qwen.mjs --cal fresh2,short3,nl_a`, `score_arm.mjs`,
  `compare_qwen.mjs`), against Opus with direction, either teacher beside, the writes-nothing floor beside.
- **Hypothesis (the plan's):** natural messages widen what it reads.
- **It worked when (the plan's Q2, made precise now):**
  - `nl_a` development: Q2 minus Q1, paired cost score **at each arm's own cost-10 threshold**, 95% interval above 0;
  - below 0 on none of: `nl_a` development, fresh2 test, short3 test (the same paired comparison).
  - `scenes_test` is reported, not gating: its interval rests on 4 sessions and is unusable (the ModernBERT log measured an 8.1% false-pass
    rate there). Beside it: every request executed, and Q2 minus M3-s0.
- **The learning curve (25%, 50%, 100%, seeds 0 and 1) is cut for time, stated now:** 6 more trainings on a GPU the owner gave to the
  ModernBERT curve first. Q4's entry, which the curve decides, is not in this session's scope.
- **Before any Q2 number is used:** a scoped review of `merge_shards.mjs`, `root_causes_qwen.mjs`, `q1_eval.sh` and the held-label fix (it
  also covers what produced Q1's numbers; a defect there is corrected in Q1's entry, from the records' `qwen.raw`).
- **GPU:** asked of the ModernBERT session, not taken between its runs. If no slot opens by 03:00 on 2026-11-07, Q2 is recorded as not
  fitting and stops. On a miss: reported, no retry.

### Coordination with the ModernBERT session (15:14)

After the owner set both sessions to the same permission mode, the ModernBERT session answered: its queue of 7 curve runs holds the GPU
until about 19:30-19:45 (its marker: "C25-s1 train rc" in its `queue_curve.out`); nothing of its takes the GPU after that; its CPU
evaluations end about 20:10 (nice 10), and Qwen's browser instances at nice 10 may overlap. It owns the planning of the next data round for
ModernBERT (its curve decides it, results about 20:15); Qwen's own data and the SOP Lang question are this session's. So Q2's training
starts when that marker appears, with `flock -w` on the lock, and its browser collection runs at nice 10.

### Scoped review of the Q1 evaluation tools (`code-reviewer`, Opus 5.5, max): no blocking finding; fixes (15:18)

The reviewer reproduced Q1's numbers (`score_arm.mjs` re-run identical; calibration byte-identical; all 1,941 outputs re-validate with no
difference; the merged order, shard slices, examples and GGUF hashes as declared; SOP-F0-s0 re-scored identical). Delegated, not rerun by me.
- **Important, fixed:** a description label written quoted (`mention(label="main pump")`) escaped the held-label check and reached the
  engine with quote characters. `lines_reader.mjs` reads a quoted description value unquoted, in the check and in `programOf` (gold is never
  quoted: the Q0.4 oracle gives the same numbers). It fired 0 times in Q1 (the reviewer: the 2 quoted cases are wrong for other keys).
  Also fixed (the reviewer's lower-confidence risk): a plain name that only a held line's label would show is held. 3 tests added; all pass.
- **Minor, fixed:** `merge_shards.mjs` now refuses shards whose code, sets, part, inputs, keys, grammar or examples differ, and code that
  changed since a shard was collected (checked: it refuses Q1's shards against today's `lines_reader.mjs`; Q1's merged file was made before
  and stays valid); the merged overlap list is the union. `q1_eval.sh` stops when calibration fails (`pipefail`).
- **Minor, fixed, and Q1's reading corrected:** `root_causes_qwen.mjs` now classifies by the place of the words, one-to-one. On `nl_a`
  development (326 requested actions not right): wrong value (paired, same act) 123 (seen 74, unseen 49); wrong act (an extra of another
  act on its words) 56; missing, nothing on its words, 72; held by the validator, same act 44, another act 26; unreadable line 5; extras 131
  (`q1/q1_root_causes.json`, rewritten). **Correction of the Q1 entry above:** "right about the value or misses the request" was wrong: the
  largest cause is a wrong value (123 paired requests wrong against 66 right), then a missing request (72) and a wrong act (56).
- **(e), exact count (reviewer):** 26 messages with an unparseable line (1.34%) plus 1 cut; 23 if the 3 "key twice" lines are not parse
  errors. The bar is 19.4 messages: a miss under every reading. The Q1 entry's 27 counted the cut message twice.

### Research: a better way to make training data, and SOP Lang output (Opus 5.5, xhigh; read-only) (15:18)

The owner asked: "check if there is a better approach to generate better training data. maybe fine tune qwen3 to generate soplang code?"
Its findings (delegated; the evidence quoted in its report, kept in this session):
- **Observed:** Q1 was trained on no natural-language messages (14,058 of F0's 24,698 are template-generated; the rest legend-aware LLM
  writing). Q1 against either teacher 16.99%, against Opus 16.84%: the reference teacher barely matters. Requests with a seen trigger 19.1%
  right, unseen 14.5%: trigger words are a small lever. `nl_p1` + `nl_p2` cover only 12-17% of `nl_a`'s unseen-trigger requests.
- **Inferred:** the limit is the kind of text, not the labelling pipeline nor the teacher; forcing legend values (grammar) turns holds into
  confident mistakes.
- **Qwen3 writing SOP Lang directly: no gain.** The output costs the same tokens (16/44/231 against 16/46/206), the line format is already one
  mechanical step from SOP Lang, and it would lose the trigger (a confidence signal, the "say which words" rule, the trigger check) and make
  one bad reference fail the whole program. **Qwen3 as a writer or labeller of data: no.** It would write legend-worded text, and its labels
  (16.8% right on natural text) would feed its own errors back (circular).
- **Recommendation:** wait for the ModernBERT curve (about 20:15) and Q2. If the curve is flat or slowing: experiment W, the C100 list with
  every natural row repeated 4 times (about 26% of rows), ModernBERT seeds 0 and 1, measured as the curve, bar W minus C100 above 0 and fresh2
  /short3 not worse than -10 at the gate; port to Qwen only if it passes. If the curve is still rising: a third round of the `nl_p2` recipe,
  aimed at causes measured on `nl_a`'s calibration half and training rows, never development. Do not start: SOP Lang output, any model of
  ours writing or labelling data, choosing what to label by confidence, a new round before the curve's verdict.
- Its open questions for the owner: any further Qwen data arm needs the owner again; data arms judged with every request executed or at
  the gate (the gate executes 10-22 of 392 requests: little power); Q2 adds the M2 folders and `nl_p1` together, so it cannot say which moved
  Qwen.
- Sent to the ModernBERT session, which owns the next data round for ModernBERT (its curve decides it).

### 16:35 — Advisor decisions on the open questions (before any Q2 score exists)

- **How data arms are judged.** At each arm's own cost-10 threshold, as Q2's gate is already declared: Q2 minus Q1, paired, on nl_a dev, 95% interval above 0, no set below 0. "Every request executed" is reported next to it as a variant; if its sign disagrees, the report says so, but the gate decides. Later data arms (W, a third round) use the same rule; any change needs the owner.
- **Push of `1e46fb6`.** Not pushed. The owner's "push it" was never sent, and `1e46fb6` lacks the reader fixes made after it. After Q2's verdict: one follow-up commit (fixes plus Q2 log), then one question to the owner about pushing both. Observed: branch `main`, origin/main at `1fa93a5`, no `.github/workflows` directory.
- **Check (observed):** Q1 and Q2 calibrate the same way. Both go through `q1_eval.sh` (wllama collection, `calibrate_qwen.mjs --cal fresh2,short3,nl_a`), and `calibrate_qwen.mjs` is unchanged since 07:40, before Q1's calibration (14:14).

### 21:05: Q2 GPU part (observed, `~/.cache/diagram-vss-qwen/arms/Q2/q2_run.log`)
- 19:24 marker seen. 20:46 training rc 0: 1,758 updates, 2 epochs, 4,870 s, peak 3.51 GiB; final logged loss 0.048. Export rc 0. 21:00 native rc 0, fidelity rc 0.
- Own rows on the exported GGUF (`q2/q2_own_rows.json`): 2,203/2,277 right (96.8%), 37 wrong, 37 not done, 12 extras, 0 cut. Passes the 95% check.
- Export fidelity (`q2/q2_export_fidelity.json`, information only, as for Q1): 36/46 greedy identical, p99 0.161. The 50 native records went in, but the check scored only 46 (reason not yet looked at). Q1 was 40/50, 0.174.
- 21:00: GPU released. ModernBERT session told by message. Smoke and browser collection continue on the CPU.
- 21:55: a host RAM clash (observed by the ModernBERT session). Q2's 8 wllama browser workers use about 20 GB of the 31 GB of RAM, and swap was full. ModernBERT's W stopped on its memory guard; both its checkpoints resume. Agreed: W resumes after Q2's collection ends (about 23:30). Q2's grammar variant waits until W is done. Lesson: 8 browser workers do not fit beside a GPU training job on this host.
- 22:11: a Claude desktop app restart killed Q2's browser collection, because the job was a child of the session. 581 of 1,941 records carry "Target page, context or browser has been closed" (observed in `b.*.log`). The originals are kept in `~/.cache/diagram-vss-qwen/arms/Q2/killed-2211/`. The 581 failed records were removed and the manifests deleted, so `collect_lines.mjs` resumes and runs only those 581. The 1,360 kept records are untouched. That this restart affects no scored record is an inference: same GGUF, temperature 0, same code.
- 22:29: ModernBERT's W resumed on the host, about 1.5 h. Q2's re-collection and grammar variant start after W is done, as a job detached from the session (setsid) so another app restart cannot kill it.
- The ModernBERT session reports a GPU crash at 22:11:56: the kernel logged Xid 120 (GSP firmware) and Xid 154 ("GPU Reset Required"). The GPU needs a reset or reboot, so W cannot run. Q2's remaining steps (re-collection, then grammar variant) are CPU and browser only and started at once, detached (`arms/Q2/resume_2240.sh`). A reboot before they end would kill them.

### 23:20 — Q2 result: **miss** (the gate declared at 14:58)
Collection complete (observed): 1,941 records, 8 shards complete, 0 failures in the re-collection. Grammar variant on `nl_a` development: 300 records. Scoring: `ARM=Q2 TDLIST=M3 CONTROLS="Q1=… M3-s0=…" ./q1_eval.sh score`, rc 0. Files: `q2/q2.score.json`, `q2/q2_calibration.json`, `q2/q2_minus_Q1.{json,log}`, `q2/q2_minus_M3-s0.{json,log}`, `q2/q2_root_causes.json`.
- **Gate, `nl_a` development, Q2 minus Q1, at each arm's cost-10 threshold.** Opus gold: -3.57, 95% interval [-21.09, 12.30]. Either gold: -3.40 [-20.16, 11.73]. The interval is not above 0, so **Q2 misses**. Under the stop rule there is no retry. D2: Q3 (the drawing) runs only if Q2 passes, so Q3 does not run.
- **No set below 0 (each interval includes 0):** fresh2 test -0.99 [-8.54, 6.57]; short3 test +16.20 [-1.40, 30.68].
- **Reported, not gating:**
  - Every request executed, `nl_a` dev (Opus): Q2 -679.8 against Q1 -631.1, diff -48.7 [-139.5, 32.8]. Same sign as the gate, not significant.
  - Right share at the gate, `nl_a` dev: 6.1% against 4.6%, +1.5 [0, 3.1]. Every request executed: 19.1% against 16.8%, +2.3 [-0.7, 5.6].
  - fresh2 right share at the gate: +9.7 [7.3, 12.1].
  - collected_1 every request executed: +204.5 [26.5, 402.3].
  - scenes_test: 4 sessions, unusable.
- **Q2 minus M3-s0 (ModernBERT on the same list), `nl_a` dev, Opus gold:** at the gate -1.79 [-16.57, 10.95]. Every request executed: +459.4 [368.6, 561.9]. Right share every request executed: 19.1% against 11.2%.
- **Root causes, `nl_a` dev, every request executed (Opus gold), Q2 against Q1 corrected (both read from `q2/q2_root_causes.json` and `q1/q1_root_causes.json`):**
  - Right: 75 of 392 against 66.
  - Wrong value: 149 against 123.
  - Wrong act: 56 against 56.
  - Missing: 65 against 72.
  - Held: 38 against 70.
  - Unreadable: 9 against 5.
  - Extras: 125 against 131.
  - Q2's held lines are mostly bad keys (12), "ask" values that are not legend questions (6), malformed "at" values (6), triggers not in the message (5) and label words not in the message (5).
- **Reading:**
  - Observed: adding the M2 folders and `nl_p1` moved requests from held or missing to produced, mostly with a wrong value. At the cost-10 threshold the paired cost score did not move.
  - Inferred: as with Q1 and the ModernBERT arms, the limit on `nl_a` is the values the model writes for natural messages, not how many rows there are.
- **Integrity note:** the 22:11 kill split the collection into two runs, on the same GGUF and code (merge_shards accepted all 8 shards). The resume kept each session's drawing right: `collect_lines.mjs:147` plays the gold program (`playGold`) for every item, including skipped ones, so re-collected items were checked against the correct world (observed in the code). The GPU crash at 22:11:56 came after training and the GPU fidelity check had ended (21:00).
- D5: Qwen stays a second reader. It missed the 10 s p95 bar at Q0.7 (names 14.7 s, drawing 31.3 s).

### 2026-11-07 ~16:45 — Wrong-value diagnosis on `nl_a` development (owner's "yes", CPU only, no training)
Tool: `training/qwen/finetune/wrong_values.mjs`. It is approximate: a value counts as "written" when every one of its words appears in the message. Evidence: `reports/evidence/qwen3-finetune-plan/diagnosis/wrong_values.{Q1,Q2,C100-s0,C100-s1}.json`.

Each request that pairs with gold but is wrong gets one class, checked in this order:
1. A differing value is a shape name the message does not write: it needs the drawing.
2. Otherwise a legend value or paraphrase the message does not write.
3. Otherwise a `$` reference.
4. Otherwise every differing value is written in the message.

| arm | wrong (paired) | needs the drawing | legend value or paraphrase | a reference | only values written in the message |
|---|---|---|---|---|---|
| Q1 | 123 | 30 (24%) | 49 (40%) | 4 | 40 (33%) |
| Q2 | 149 | 34 (23%) | 61 (41%) | 4 | 50 (34%) |
| ModernBERT C100-s0 | 222 | 61 (27%) | 77 (35%) | 4 | 80 (36%) |
| ModernBERT C100-s1 | 226 | 56 (25%) | 76 (34%) | 5 | 89 (39%) |

**Observed (spot-check of 27 examples):**
- "Needs the drawing" means the message picks the shape by colour, place or role ("the red one", "the one down bottom"), and the names-only prompt does not contain those.
- "Legend value or paraphrase" is mostly the position word (near / above / rightof / between), plus mentions by label. Several of these are judgement calls where the gold is debatable ("up top by the logo": near against above).
- "Written" covers dropped connect labels ("start takes Idle to Running": label left out), swapped from/to, and labels cut or reworded.

**Inferred:**
- About a quarter of the wrong values cannot be fixed by text data. They need the drawing in the input.
- About a third are copy or assignment errors that more natural examples could reduce. That is the class Q2 and W tried and did not move at the gate.
- About two fifths are position or legend choices, where label noise caps what any data can reach.

**Not covered:** missing requests (65), held requests (38) and extras (125). The word match counts a common word ("below") as written even when it is not the user's choice.
- **Check (observed, `training/neural/MODERNBERT_RUNLOG.md`):** C100 knows the drawing by names only. The drawing as input was ModernBERT's M4, which missed its `nl_a` bar (6.3% against 60%; line 658). ModernBERT's own root causes reach the same reading: "a reference that needs the drawing" goes 82 → 93 → 100 over the curve (line 640). The C100 rows in the table stand.
- **Caveats:**
  - This classifies only the paired wrong values (149 for Q2). Extras (125), missing (65) and held (38) are not classified.
  - The gate runs at cost-10, where about 10-22 of 392 requests are executed. It mostly measures whether a model knows when it is right, and this diagnosis does not look at confidence. "The limit is the values" holds for every request executed, not for the gate.

### Decision (advisor, Opus, at the owner's request): no new training data
- Four results agree:
  - the curve slowed;
  - W missed;
  - Q2 missed;
  - the only class data could help (values written in the message) rose from 40 to 50 with Q2's data.
- About a quarter of the wrong values need the drawing, and about two fifths are position or legend choices with debatable gold.
- The one candidate the evidence supports is the input (the drawing), not data. For Qwen, D2 blocks Q3, and drawing input took 31.3 s p95. For ModernBERT, M4 (the drawing input) missed, and "the drawing input trained on natural data" is an owner option, not declared.
- **Nothing runs without the owner.**
- Optional CPU check, to size the label noise: rerun `wrong_values.mjs` on the 61 "legend or paraphrase" requests with the second labeller's gold.
- **Refinement from the ModernBERT session (its check, not rerun here):** `wrong_values.mjs` counts a gold value as "written" when it appears anywhere in the message. Checked against each request's own text instead, C100-s0's 80 "only values written in the message" split into 37 in the request's own words, 42 only in another sentence of the message, and 1 that moves to "needs the drawing". So about half of that class is a value taken from the wrong request (assignment), not a value miscopied from the request's own words. The "needs the drawing" share does not change.
- **The owner closed the ModernBERT natural-language line (`c266319`): no more data rounds, no drawing-input run.** With Q2's miss, both lines are closed.
