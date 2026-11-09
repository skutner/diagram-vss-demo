Implement `training/qwen/QWEN3_FINETUNE_PLAN.md` in the repository at /home/skutner/browserLLM/diagram-vss-demo: fine-tune Qwen3-0.6B so that it detects what people mean from natural language, measured on the same sets and with the same scorer as the encoders. The built-in examples are a check, not the target.

**Read first, in this order**
- `AGENTS.md`: its rules bind everything. Pre-register every arm before it runs. A miss stops the line, with no "one more try". Agents never commit.
- `training/qwen/QWEN3_FINETUNE_PLAN.md`: the plan, reviewed twice at Opus max. Its arms Q0-Q5, gates, thresholds and stop rules are fixed. Change them only by my decisions below.
- `training/qwen/finetune/README.md` and `PREREG_BASELINE.md`: the scripts already written and measured. Reuse them, do not rebuild them.
- `training/neural/MODERNBERT_RUNLOG.md`: the ModernBERT run, which finished at 04:54 on 2026-11-06. Read its decisions, its arm results on `nl_a`, fresh2 and short3, and its tools. **Do not read anything about `nl_b`** beyond the aggregate numbers at the top of that file. That means no `nl_b` texts, no labels and no root-cause analyses.

**What changed since the plan was written** (check each one yourself before relying on it)
- The GPU is free: the ModernBERT session is done. Still take the lock for every GPU job: `flock -n ~/.cache/diagram-vss-modernbert/locks/GPU-905b8484-3b1e-30f6-defd-05d44f00f692.lock`. Run one job at a time.
- ModernBERT's L1 (number words, by table) and L2 (the implied scale) passed. Use L2's overlay, `training/neural/parity/LABEL_FIXES_L2.jsonl` (with `label_fixes_l2.py`), for the training targets. It replaces the plan's `scale=0.67` shortcut in `make_examples.mjs`. Count the rows it changes.
- ModernBERT M3 (`nl_p1`) and M4 (the drawing as input) missed their `nl_a` bar. The final ModernBERT and SOP-BERT read 7.4% and 8.8% of `nl_b`; the teachers agree on 69.6%.
  - Same-data controls exist in `~/.cache/diagram-vss-modernbert/arms/`: `F0-s*` and `SOP-F0-s*`, with their data list in `arms/data/`. Use them as controls wherever Qwen trains on the same list.
- `nl_b` has been read and its results published, so the plan's D9 applies: Qwen gets its own final set (see decisions).
- `docs/js/drawing-lines.js` (M4's compact drawing serializer, a listed mechanical step) exists. The plan measured `K.worldSOP`. Compare the two by tokens and by effect only as a reported variant in Q3, one change at a time.
- The native llama.cpp b12099 on this machine already fails the parity gate against wllama (5 of 7 outputs identical; log-probabilities differ by up to 0.72; plan section 6.1).
- Files with an unknown current state, which you must check before using them: `training/neural/parity/score_arm.mjs`, `arm_lib.mjs`, `docs/js/neural.js` and `docs/js/neural-confidence.js` were changed by the ModernBERT session and are uncommitted. Pin their SHA-256 in every manifest, as the plan says. **Do not edit** them, anything else under `training/neural/`, `docs/js/drawing-lines.js`, `training/sketch/llm_bench/nl_a/`, `nl_b/`, or `training/sketch/llm_train/nl_p1/`. Copy what you need into `training/qwen/`.

**My decisions** (the plan's section 13; these are approved as written here)
- D1, the output: one line per request with its trigger, a 30-token system prompt, a grammar from the legend. Labels: the plain rule, "the words of a label are in the message". Number words, through L1's table as a listed mechanical step, reported with and without it.
- D2, the drawing in the prompt (Q3): yes, if Q2 passes.
- D3, native b11364: you may download the llama.cpp b11364 release binaries from ggml-org's GitHub (CPU and CUDA 12.8 builds), check their SHA-256 against the release digests, and run them. If the permission system still refuses, ask me in chat; do not work around it. If parity still fails, calibrate in the browser runtime in parallel instances (plan section 7).
- D4, the thresholds: as written.
- D5, time:
  - the reference machine is this laptop, unloaded, wllama 3.8.1 in one thread;
  - the bar is 10 s at p95 for messages with 1-2 requests;
  - measure WebGPU as a separate, reported variant;
  - if the bar is missed, continue as a second reader, and say so in every report.
- D6, labels: first labels by Opus 5.5 medium, second labels by gpt-6.1-sol high (Codex). At most one data round (Q4), and only if its entry rule holds. Stop data work if the weekly limit runs low.
- D7, the base: train from the dequantized shipped GGUF.
- D8, the GPU: one job at a time, with the lock.
- D9, the final set: Qwen gets its own, written by gpt-6.1-sol high from `training/sketch/llm_bench/NL_TEST_SPEC.md` when Q4 ends and labelled blind by both teachers. Nothing tuned on it; read once at Q5.
- Scope for this session: Q0 in full, then Q1 if every Q0 gate passes. Stop after Q1 and report. **Hard stop:** every long job has a timeout that ends it by 06:45 on 2026-11-07.

**How to work**
- Keep a run log, `training/qwen/QWEN3_FINETUNE_RUNLOG.md`, in the ModernBERT run log's form. It holds:
  - my decisions above;
  - each arm's declaration before it runs: hypothesis, measure, threshold;
  - each result after it, and every miss as a miss.
- Keep it current, so that a stop at any moment leaves the state readable.
- Order:
  1. Q0.7, time on this laptop, unloaded. It can end the browser path.
  2. Q0.2, parity.
  3. Q0.3, the full baseline on the GPU, natively: all sets, plus the drawing variant.
  4. Q0.4, the line validator, run in the format oracle.
  5. Q0.5, the GPU probe (`gpu_probe_qwen.py`), then the 200-row overfit gate.
  6. Q0.6, the zero-arm and export parity checks.
  7. Q0.8, line-format scoring, `calibrate_qwen.mjs` and their tests.
  8. A code review of all Q0 code (`code-reviewer`, Opus 5.5, max) before any number from it is used.
- Every number names the command and the evidence file (`reports/evidence/qwen3-finetune-plan/`). Every comparison re-scores both arms with the same pinned scorer, reading the direction of a resize against Opus, with "either teacher" beside it. Publish the writes-nothing floor beside every result.
- Data, models, checkpoints and runs stay outside git, in `~/.cache/diagram-vss-qwen/`. Python uses the ModernBERT venv `~/.cache/diagram-vss-modernbert/venv` read-only; add packages only in your own target folder. Chromium is at `~/.cache/ms-playwright/chromium_headless_shell-1223/`.
- Do not run `claude-p-credits`. Read usage from the events you get; do not poll it. Codex is available (`gpt-6.1-sol` high, `gpt-6-astra` xhigh, via `codex exec` in an isolated folder). Agent models and efforts follow AGENTS.md and the plan's section 12.
- Talk to me as AGENTS.md "Talking to the owner" says: literal, short, numbers with their source.

**Report back with:**
- what ran and what each gate gave, against its pre-registered threshold;
- Q1's result, or why the line stopped before it;
- the time per message on the reference machine;
- what you could not verify;
- the files you changed (uncommitted), and the decisions you need from me next.

Separate what you observed from what you inferred.
