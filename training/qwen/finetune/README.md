# Qwen3 fine-tuning: measuring scripts

The measurements behind `../QWEN3_FINETUNE_PLAN.md`. Uncommitted. Outputs: `reports/evidence/qwen3-finetune-plan/`. Task cache (models,
runs, data, pilot rows; not in git): `~/.cache/diagram-vss-qwen/`. Python runs in the ModernBERT task venv
(`~/.cache/diagram-vss-modernbert/venv`, read-only use); Node scripts reuse `training/neural/parity/` (owned by the ModernBERT session).

| file | what |
|---|---|
| `weights_match.py` | the shipped GGUF against the official `Qwen/Qwen3-0.6B` safetensors, tensor by tensor (numpy only); also the GGUF reader used below |
| `weights_error.py` | how far the GGUF's Q8_0 weights are from the BF16 weights, against a standard Q8_0 of the same weights |
| `requant_roundtrip.py` | does every shipped Q8_0 block re-quantize to the same bytes |
| `qwen_lib.py` | the dequantized GGUF as Hugging Face weights, the model, LoRA, the chat rendering with thinking off |
| `write_gguf.py` | weights back into a copy of the shipped container; with no weights, the self-test (must give the shipped SHA-256) |
| `overfit_test.py` | LoRA on a few training rows, decoded back exactly (CPU or GPU) |
| `gpu_probe_qwen.py` | memory and throughput on the card (not run yet: needs the GPU lock) |
| `collect_qwen.mjs` | the shipped reader's contract through a native llama-server, records in the parity tools' format |
| `wllama_bench.mjs` | the shipped runtime in headless Chromium: parity with native records, time per message |
| `token_budget.mjs` | token counts of prompts, drawings and output formats with the GGUF's tokenizer (needs a llama-server) |
| `lines_format.mjs` | the candidate output: one line per request, `[trigger] type key=value ...` |
| `format_oracle.mjs` | the gold through each format's real parser to the scorer; floors and readers broken on purpose |
| `make_examples.mjs` | annotated rows to chat examples in the line format, with the drawing or the names |
| `score_qwen.mjs` | Qwen records scored per set and part, every validated request executed, with the writes-nothing floor (refuses a non-empty floor) and the scorer's hashes |
| `parity_check.mjs` | the native-against-browser parity gate of the plan's Q0.2 |
| `pilot_score.mjs` | the blind labelling pilot against the two teachers of `nl_a`, per action and by engine effect |
| `teachers_by_writer.mjs` | the teachers' agreement on `nl_a` by writer and kind |
| `lists.mjs` | the training folder lists of the arms (F0 = the encoders' first-run list, M2, `nl_p1`) |
| `lines_reader.mjs` | the reader side of the line format: parser, validator, the validator's context (`readerContext`), wires through `K.parse`, GBNF grammar; keys per act learned from training gold |
| `lines_oracle.mjs` | Q0.4: training and `nl_a` gold through the validator (pass >= 99.5%), with and without L1's number table |
| `line_scores.mjs` | per-request confidence signals from the runtime's token log-probabilities (top-2) |
| `collect_lines.mjs` | a line-format reader's records on the parity sets, native llama-server or wllama in headless Chromium (sharded) |
| `calibrate_qwen.mjs` | the calibrate_arm.mjs protocol with the Qwen signals |
| `compare_qwen.mjs` | a copy of compare_arms.mjs plus the right share (`test_compare_qwen.mjs` checks it reproduces the original) |
| `test_qwen_lines.mjs` | tests of the reader, the scores and the calibration |
| `time_bench.mjs` | Q0.7: time per message in wllama, forced to the gold's length in the line format |
| `train_qwen.py` | the LoRA trainer of the arms (resumable, deadline), merge onto the exact FP32 weights |
| `teacher_forced.py` | Q0.6: a PyTorch model teacher-forced on native records (zero arm, export) |
| `own_rows.mjs` | Q1 (a): the arm on 1,000 of its own training rows |
| `q03_baseline.sh` | Q0.3: the shipped reader on all sets, native GPU (b11364 CUDA), under the GPU lock |
| `PREREG_BASELINE.md` | how the shipped reader's baseline is read, written before it finished |
