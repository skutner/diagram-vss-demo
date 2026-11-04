# Qwen3 reader inputs (experimental)

`reader.json` holds everything the experimental Qwen3 reader is fixed to (`training/qwen/QWEN3_PLAN.md`). It is written by
`node training/qwen/make_reader.mjs`; do not edit it by hand.

- The model: `Qwen/Qwen3-0.6B-GGUF`, file `Qwen3-0.6B-Q8_0.gguf`, revision `23749fefcc72300e3a2ad315e1317431b06b590a`, 639,446,688 bytes,
  SHA-256 `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031` (Apache-2.0). It is not in this repository: the browser
  downloads it from that URL, checks its size and SHA-256 while writing it to its private file system, and checks the SHA-256 again on
  every load. Its embedded chat template's SHA-256 is pinned too.
- The runtime: wllama 3.8.1 (`docs/vendor/wllama-3.8.1/`, MIT), SHA-256 of both files pinned; the worker checks them before running them.
- The settings of the runtime and of each request (CPU only, one thread, thinking off through the chat template, temperature 0).
- The act keys (from `docs/model/neural/sop-bert/config.json`, learned from the annotated training data) and the two prompt examples
  (annotated training messages), and the SHA-256 of the prompt and of the JSON schema they give with the legend: the browser rebuilds
  both from its own legend and refuses to run when either differs.
