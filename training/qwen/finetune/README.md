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
| `PREREG_BASELINE.md` | how the shipped reader's baseline is read, written before it finished |
