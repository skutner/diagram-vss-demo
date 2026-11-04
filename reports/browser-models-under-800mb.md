# Browser models under 800 MB

**Test Qwen3-0.6B Q8_0 first as an isolated prompted reader.** Its official pinned GGUF is **639,446,688 bytes (639.447 MB; 609.824 MiB)**. Compare identical GGUF bytes on native CPU and browser CPU using **wllama 3.8.1, `n_gpu_layers:0`, initially `n_threads:1`, `enable_thinking=false`**. This minimizes first-test runtime assumptions, not demonstrated accuracy. Next candidates are hybrid Qwen3.5-0.8B Q4_0 and smaller English control SmolLM2-360M Q8_0. Ettin-68m is the supervised-encoder proposal, but its browser reader bundle is unverified. **No new model was downloaded or executed**; denied access leaves LFM/Gemma/Phi coverage incomplete. ([Exact Qwen3 file](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf); [inventories](evidence/browser-models-under-800mb/qwen-smol-artifacts.json))

## The limit applies to required model files, not RAM

Cutoff: **2026-11-04**. Public cards/releases, source and file metadata establish a **bounded, not exhaustive** survey of additional open-weight local-browser readers. Integration research inspected source `1667ead753b890dac553ef07d9b1246747c36d6e`; Rules, VSS, SOP-BERT/DistilBERT, VSS-BERT and ModernBERT remain frozen. ([Application](../README.md); [integration evidence](evidence/browser-models-under-800mb/integration-training-protocol.md))

**Each single new reader's complete required model bundle must be strictly below 800,000,000 bytes:** weights/graph, every external shard, tokenizer/config and required templates/indexes—not the combined installed five-plus-new-reader collection. Runtime JS/WASM, compiled model libraries and application code are **separate**, as are coexistence RAM, disk cache and compressed transfer. **MB = 1,000,000 B; MiB = 1,048,576 B**. Alternative precisions are not jointly mandatory; tokenizer auxiliaries are conservatively included. ([Model methodology](evidence/browser-models-under-800mb/qwen-smol-artifacts.json); [encoder methodology](evidence/browser-models-under-800mb/encoders-artifacts.json))

Manifests enumerate every inventoried path, bytes, immutable revision and metadata source. Instruction artifacts have exact resolve URLs; encoder URLs follow `https://huggingface.co/{repo}/resolve/{revision}/{path}`, with advertised hashes where available. **Metadata HTTP 200 and six representative HEAD 302 redirects with matching `x-linked-size` are not completed downloads, checksum verification or successful loads.** ONNX binaries/external references were not inspected: inventories remain provisional until graph and loader dependency checks. ([Instruction artifacts](evidence/browser-models-under-800mb/qwen-smol-artifacts.json); [encoder artifacts](evidence/browser-models-under-800mb/encoders-artifacts.json))

Official Liquid/Gemma/Phi searches received **`Permission denied: webfetch`**, not bypassed. Their latest eligible releases, complete bundles, sizes/licenses are **unverified—not excluded by size**. Independently collected evidence includes an **LFM2.5-350M config**, **LFM3/LFM3-VL** runtime-release mentions, a MediaPipe link to Gemma-3-270M conversion, and Phi architecture registry entries. None qualifies a complete bundle. Separately obtained SmolLM inventories remain valid despite that worker's denied Smol searches. ([Denial record](evidence/browser-models-under-800mb/liquid-gemma-phi-artifacts.json); [partial runtime evidence/sources](evidence/browser-models-under-800mb/runtimes.md))

## Several exact instruction-model inventories fit

### Prefer an official dense Q8 artifact for the first CPU comparison

Each GGUF inventory is **one file, zero extra tokenizer/config files**. GGUF supports embedded metadata/tokenizers/templates; Qwen3.5's conversion log records them, while other embedded fields still need inspection and runtime parity. Prefixes below identify full revisions in the manifest. ([GGUF specification](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md#tokenizer); [conversion log](https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF/blob/807dfd9a6fadbf703207aac3bfb0b2b3040d077c/convert.log); [manifest](evidence/browser-models-under-800mb/qwen-smol-artifacts.json))

| Candidate / selected GGUF | Publisher; revision prefix | Model subtotal = total bytes | MB / MiB | Decision |
|---|---|---:|---:|---|
| **Qwen3-0.6B Q8_0** | Qwen; `23749fefcc72` | **639,446,688** | **639.447 / 609.824** | First CPU/browser parity experiment |
| Qwen3.5-0.8B Q4_0 | ggml-org; `807dfd9a6fad` | 563,036,064 | 563.036 / 536.953 | Next hybrid challenger, text path |
| SmolLM2-360M-Instruct Q8_0 | HuggingFaceTB; `593b5a2e04c8` | 386,404,992 | 386.405 / 368.505 | Small English control |
| Llama-3.2-1B-Instruct Q4_K_S | bartowski; `067b946cf014` | 775,647,360 | 775.647 / 739.715 | Size candidate; distinct license |
| SmolLM2-1.7B-Instruct Q3_K_S | bartowski; `1f03464768bf` | 776,819,680 | 776.820 / 740.833 | Low-bit reserve, quality unmeasured |
| Qwen3-1.7B Q2_K | unsloth; `d7f544eead69` | 777,796,160 | 777.796 / 741.764 | Very low-bit reserve, quality unmeasured |

**Qwen3-0.6B is instruct, not Base**; disable default thinking with `enable_thinking=False`, not a reasoning-display setting. Newer post-trained Qwen3.5 originates as vision-language; selected conversions are text paths. It defaults non-thinking, warns of 0.8B thinking loops, and lacks official `/think`/`/no_think` soft switches. SmolLM2-360M primarily supports English; its publisher's function-calling claim concerns **1.7B**, not 360M. None guarantees correct diagram extraction. ([Qwen3 card](https://huggingface.co/Qwen/Qwen3-0.6B/blob/c1899de289a04d12100db370d81485cdf75e47ca/README.md); [Qwen3.5 card](https://huggingface.co/Qwen/Qwen3.5-0.8B/blob/2fc06364715b967f1860aea9cf38778875588b17/README.md); [SmolLM2 card](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct/blob/a10cc1512eabd3dde888204e902eca88bddb4951/README.md))

The Qwen researcher preferred Qwen3.5's recency/smaller cache. The coordinated choice **consciously favors official dense Qwen3 Q8**, reducing initial hybrid/low-bit assumptions. Qwen3.5 compiled support exists; its exact browser load remains unrun, not excluded by obsolete runtime assumptions. ([Assessments](evidence/browser-models-under-800mb/qwen-smol.md); [runtime source](evidence/browser-models-under-800mb/runtimes.md))

Discovery found **Qwen3.8**, smallest found **27B**, with no publisher result for Qwen3.9/Qwen4; inspected **SmolLM3-3B** has two BF16 source shards totaling **6,150,235,008 B**. No tiny newer-family bundle qualified; this does not exclude every possible conversion. ([Qwen search](https://huggingface.co/api/models?author=Qwen&search=Qwen3.8&limit=100); [SmolLM3 card](https://huggingface.co/HuggingFaceTB/SmolLM3-3B/blob/a07cc9a04f16550a088caea529712d1d335b0ac1/README.md))

### ONNX and MLC are alternative deployments, not interchangeable weights

“Aux” means tokenizer/config/template/cache indexes; `M+A` counts model/shard plus auxiliary files. All **11/9/7 MLC shards** and conservative alternative cache manifests are included; **compiled model-library WASM is required runtime separately**. ONNX dependency lists remain provisional. ([All exact files/revisions](evidence/browser-models-under-800mb/qwen-smol-artifacts.json))

| Artifact; revision prefix | Model/graph/shards B | Aux B; M+A files | Complete listed total B | MB / MiB |
|---|---:|---:|---:|---:|
| Qwen3.5 text ONNX q4; `25cdf33f386b` | 551,247,327 | 19,246,002; 2+5 | 570,493,329 | 570.493 / 544.065 |
| Same, q4f16 | 469,929,410 | 19,246,002; 2+5 | 489,175,412 | 489.175 / 466.514 |
| Qwen3 ONNX int8; `58ca03a5e7b3` | 617,687,478 | 13,582,662; 1+9 | 631,270,140 | 631.270 / 602.026 |
| Same, q4f16 | 569,789,750 | 13,582,662; 1+9 | 583,372,412 | 583.372 / 556.347 |
| SmolLM2-360M ONNX int8; `a10cc1512eab` | 364,564,558 | 3,377,006; 1+7 | 367,941,564 | 367.942 / 350.896 |
| Same, q4 | 387,943,246 | 3,377,006; 1+7 | 391,320,252 | 391.320 / 373.192 |
| Qwen3.5 MLC q4f16_1; `0ec138972555` | 423,937,664 | 23,237,839; 11+7 | 447,175,503 | 447.176 / 426.460 |
| Qwen3 MLC q4f16_1; `8c14ce481d4c` | 335,372,288 | 16,141,873; 9+7 | 351,514,161 | 351.514 / 335.230 |
| SmolLM2-360M MLC q4f16_1; `3a622fd89e02` | 203,614,080 | 3,625,854; 7+7 | 207,239,934 | 207.240 / 197.639 |

Unpacked Qwen3.5 ONNX q4 example: `onnx/model_q4.onnx` **482,783 B**, `onnx/model_q4.onnx_data` **550,764,544**, `config.json` **1,989**, `generation_config.json` **120**, `tokenizer.json` **19,226,111**, `tokenizer_config.json` **10,027**, `chat_template.jinja` **7,755**. Sum: **551,247,327 + 19,246,002 = 570,493,329 B**. The manifest gives all seven URLs at revision `25cdf33f386b487a25f3d743e86442517bdb77ff`. The chosen GGUF is simply `Qwen3-0.6B-Q8_0.gguf`, revision `23749fefcc72300e3a2ad315e1317431b06b590a`, subject to embedded-metadata checks. ([Manifest](evidence/browser-models-under-800mb/qwen-smol-artifacts.json))

### Actual near misses depend on the exact format and quantization

These are inventoried files, not parameter estimates. **BF16 is not FP32**; original multimodal Qwen3.5 differs from text GGUF. Sub-cap native safetensors do not prove a browser loader. ([Per-file comparisons](evidence/browser-models-under-800mb/qwen-smol-artifacts.json))

| Selected alternative | Model B + aux B; file counts | Total B | MB / MiB | Size result |
|---|---:|---:|---:|---|
| Qwen3.5 GGUF Q8_0 | 833,592,096 + 0; 1+0 | 833,592,096 | 833.592 / 794.975 | **Fails**, despite <800 MiB |
| Llama-3.2-1B GGUF Q4_K_M | 807,694,464 + 0; 1+0 | 807,694,464 | 807.694 / 770.277 | Fails; Q4_K_S fits |
| Official SmolLM2-1.7B GGUF Q4_K_M | 1,055,609,536 + 0; 1+0 | 1,055,609,536 | 1,055.610 / 1,006.708 | Fails; listed community Q3 fits |
| Llama-3.2-1B ONNX q4f16 | 1,089,755,422 + 11,635,416; 2+6 | 1,101,390,838 | 1,101.391 / 1,050.368 | Fails |
| Qwen3.5 text GGUF **BF16** | 1,557,662,496 + 0; 1+0 | 1,557,662,496 | 1,557.662 / 1,485.503 | Fails |
| Qwen3.5 original **BF16**, `2fc06364715b` | 1,746,942,600 + 22,963,046; 1+9 | 1,769,905,646 | 1,769.906 / 1,687.914 | Fails |
| Qwen3 original **BF16**, `c1899de289a0` | 1,503,300,328 + 15,882,037; 1+6 | 1,519,182,365 | 1,519.182 / 1,448.805 | Fails |
| SmolLM2-360M original **BF16**, `a10cc1512eab` | 723,674,912 + 3,377,006; 1+7 | 727,051,918 | 727.052 / 693.371 | Fits source inventory only |

Qwen3/Qwen3.5/SmolLM2 sources declare **Apache-2.0**; shortlisted GGUF metadata is public/non-gated. Some community ONNX/MLC license tags are absent: verify inherited/conversion terms, not assumed permission. Llama 3.2 has a distinct community license/use policy, including agreement and “Built with Llama” redistribution obligations. Meta's source is manually gated; Bartowski's conversion is non-gated, without removing license obligations. ([Cards/metadata](evidence/browser-models-under-800mb/qwen-smol.md); [Llama license](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/blob/067b946cf014b7c697f3654f621d577a3e3afd1c/README.md))

## Small encoders need trained structural heads

**Ettin-68m is a supervised-base proposal, not a qualified browser reader.** Native FP32 weights **273,868,198 B** + four tokenizer/config files **2,155,710 B** = **276,023,908 B (276.024 MB; 263.237 MiB)**. It has 19 layers, width 512, eight heads, local attention 128/global every third layer. Its official tree lacks ONNX; targeted community search found 17m/32m, not 68m, without proving universal absence. Existing local notes record Ettin-68m/32m source-card MIT declarations (`browserLLM/docs/browser_encoder_notes/contextual_encoders.md:97–99`), not manifest-level license verification. Exact native/conversion-pair license verification remains outstanding. Encoder manifests lack formal gating flags; public metadata is not a completed anonymous download. ([68m source](https://huggingface.co/jhu-clsp/ettin-encoder-68m/tree/ac19ae4bc51093b31c475665ac872a936d056cc2); [inventory](evidence/browser-models-under-800mb/encoders-artifacts.json))

These **base/embedding/MLM exports lack diagram heads**. The quantized variant is `model_quantized.onnx` (q8 naming), not proof of INT8 arithmetic; `model.onnx` alternatives are FP32-labelled, not binary-audited. Native Ettin/NeoBERT configs declare FP32; DeBERTa-small/all-MiniLM native dtypes remain unverified. Totals include listed tokenizer/config and matching external shards. ([Manifest](evidence/browser-models-under-800mb/encoders-artifacts.json))

| Published export; immutable revision prefix | Quantized model B + aux B; files | Quantized total B; MB / MiB | Full FP32-labelled model B + same aux B | Full total B; MB / MiB |
|---|---:|---:|---:|---:|
| Ettin-32m MLM; `37b0e13e9596` | 36,685,569 + 2,130,882; 2+3 | 38,816,451; 38.816 / 37.018 | 132,504,323 + 2,130,882 | 134,635,205; 134.635 / 128.398 |
| DeBERTa-v3-small; `cd592b4177c5` | 161,698,539 + 11,123,618; 1+6 | 172,822,157; 172.822 / 164.816 | 585,750,724 + 11,123,618 | 596,874,342; 596.874 / 569.224 |
| NeoBERT; `051788e9abde` | 223,170,098 + 945,040; 1+5 | 224,115,138; 224.115 / 213.733 | 887,944,219 + 945,040 | **888,889,259; 888.889 / 847.711: fails** |
| all-MiniLM-L6-v2; `751bff37182d` | 22,972,370 + 944,310; 1+5 | 23,916,680; 23.917 / 22.809 | 90,387,606 + 944,310 | 91,331,916; 91.332 / 87.101 |

Ettin-32m's cheap graph is **fill-mask**, not structural parsing. DeBERTa adds disentangled attention/SentencePiece; NeoBERT adds depth, RoPE/custom-export risk and native FP32 weights **980,567,608 B** over cap. all-MiniLM-L6-v2 is a sentence-embedding fine-tune, not a raw base or cosine-similarity diagram parser. Raw **MiniLM-L12-H384-uncased** has **133,483,028 B** native weights but no verified browser bundle. Existing local notes record NeoBERT/raw MiniLM source MIT declarations (`browserLLM/docs/browser_encoder_notes/contextual_encoders.md:62,95`); exact native/conversion-pair license verification remains outstanding. Neither size nor aggregate GLUE/retrieval scores establish diagram quality or latency. ([Export/source links](evidence/browser-models-under-800mb/encoders.md); [raw MiniLM](https://huggingface.co/microsoft/MiniLM-L12-H384-uncased/tree/44acabbec0ef496f6dbc93adadea57f376b7c0ec))

Train joint action/value and token span/role/cut heads on whole annotated messages, export the **actual reader**, then calibrate it. `makeReader` expects `reader` config, `seq_logits`, `token_logits`, a cut head, two empty-input special tokens and first-piece alignment. Check BPE prefix spaces, SentencePiece boundaries, padding IDs and UTF-16 offsets. Re-sum the final graph/files under cap; no proposed encoder has passed that qualification. ([Reader](../docs/js/neural.js); [tokenization](../training/neural/modernbert_tokenization.py))

## Browser CPU, browser GPU and native support are separate claims

Production uses **Transformers.js 3.8.1 / ORT `1.22.0-dev.20250409-89f8206ba4`, WASM**. ModernBERT is **uint8 storage/FP32 Basic arithmetic**, WebGPU unvalidated. Researched current **Transformers.js 4.3.2** (`028721487d55aac3c7f6bad8d87d1b3511a1027c`) depends on ORT **`1.31.0-dev.20260914-8d85527a0`**, not stable **1.31.1** (`6af1a932e2286d5c58166085d24c68783033edee`). Its LFM3/external-data fixes do not validate old artifacts. Keep existing readers unchanged; isolate new runtimes and match JS/WASM versions. ([Production](modernbert.md); [4.3.2 release](https://github.com/huggingface/transformers.js/releases/tag/4.3.2); [version metadata](evidence/browser-models-under-800mb/runtimes-assets.json))

| Candidate/path | Native CPU | Browser CPU | Browser GPU | Conversion-only or missing qualification |
|---|---|---|---|---|
| Qwen3-0.6B GGUF | llama.cpp implementation | wllama 3.8.1 WASM implementation; exact file unrun | wllama WebGPU implementation; unrun | Inspect embedded template/tokenizer and parity |
| Qwen3.5-0.8B GGUF | Documented llama.cpp example | Compiled qwen35 + SSM/delta CPU ops; unrun | Implemented hybrid ops with type/shape predicates; unrun | Hybrid state, quantization and template checks |
| SmolLM2 / Llama / low-bit GGUF reserves | Relevant llama architecture implementation | Same compiled family; exact GGUF architecture/kernels unrun | Separate wllama GPU verification needed | Do not infer SmolLM2 uses smollm3 architecture |
| Qwen3 / Qwen3.5 / SmolLM2 MLC | Not established by this WebLLM evidence | **No documented CPU fallback established** | Listed in WebLLM 0.2.87 with model libraries; unrun | MLC weights + matching library, not arbitrary GGUF |
| Qwen3 ONNX | ORT format path; exact artifact unrun | INT8 inventory exists; exact WASM unrun | Card demonstrates q4f16 WebGPU usage, not a test here | ONNX external deps/operator/dtype audit |
| Qwen3.5 / SmolLM2 ONNX | Exact graph unrun | Exact graph unrun | Exact graph unrun | Config/graph existence is weaker than backend support |
| Published encoder ONNX rows | Exact graph unrun | Exact graph unrun | Exact graph unrun | Need task heads/new export and backend parity |
| Ettin-68m / raw MiniLM native sources | Native source, no run here | No verified browser task bundle | No verified browser task bundle | Custom supervised export required |
| LFM / Gemma / Phi | Registry coverage only for listed architectures | No qualified complete bundle | No qualified complete bundle | Metadata gaps; not size exclusions |

Matrix entries are **source coverage, not new executions**. Pinned registry includes qwen3/qwen35/lfm2/llama, Gemma and Phi variants; CPU dispatch includes **SSM_CONV/SSM_SCAN/GATED_DELTA_NET**. No LFM3 mapping was established. GPU predicates restrict device/type/shape support. LiteRT.js needs `.tflite` conversion; MediaPipe LLM Web requires WebGPU. Neither adds a qualified bundle. ([Registry](https://github.com/ggml-org/llama.cpp/blob/46ca246de9bb1c35269722a6240d37d9dfd79cad/src/llama-arch.cpp); [operator/runtime sources](evidence/browser-models-under-800mb/runtimes.md))

### Pin the v3 runtime and count only the selected asset path

**wllama v3 uses llama-server/OAI-shaped requests/Jinja**, not obsolete v2 `samplingInit`/decode/tokenize APIs. npm head `b68fd6427063266176bb0054befe9ff70b3258f1` differs from tag `7ed17361caf221a84aa1e80ca85a3d6324f3af85`; both pin llama.cpp **`46ca246de9bb1c35269722a6240d37d9dfd79cad`**. Freeze package integrity/assets. **`n_gpu_layers:0` skips otherwise automatic GPU initialization.** ([Migration](https://github.com/ngxson/wllama/blob/b68fd6427063266176bb0054befe9ff70b3258f1/guides/intro-v3.md); [pins/source](evidence/browser-models-under-800mb/runtimes-assets.json))

| Separate runtime option | Raw asset bytes, outside model ceiling |
|---|---:|
| wllama modern: minified JS 331,458 + WASM 8,763,949 | **9,095,407** |
| wllama compat instead: same main JS + glue 171,615 + WASM 16,005,007 | **16,508,080** |
| Representative production Transformers.js JS + matching ORT glue/WASM | 22,528,676 |
| WebLLM 0.2.87 JS 6,814,447 + Qwen3 q4f16 model library 6,561,594 | 13,376,041 |

One modern WASM serves CPU single/multithread and GPU; workers are embedded. **Modern/compat are alternatives.** WebLLM pin: `6897fadc2bed9a5a7940265dd80220f83ca184e7`, `v0_2_87/base`, library commit `146ed9cd4b4062e967b017fd2291f7106b50599f`; dependencies web-runtime 0.28.0-dev1/XGrammar 0.1.27. These are raw representative inventories, not complete observed fetches. Transformers.js 4.3.2 requires separately inventoried ORT WASM. ([Runtime manifest](evidence/browser-models-under-800mb/runtimes-assets.json))

Set dtype explicitly: q8/int8/q4/q4f16 select distinct graphs, **not guaranteed compute precision**. Old production ORT MatMulNBits can dequantize into temporary FP32 weights/float GEMM without optimized WASM dispatch; do not extrapolate to every newer build. GPU operator subsets need separate audits. ONNX external-data paths must match embedded references. ([Fallback source](https://github.com/microsoft/onnxruntime/blob/89f8206ba4/onnxruntime/contrib_ops/cpu/quantization/matmul_nbits.cc#L432-L535); [external-data docs](https://onnxruntime.ai/docs/tutorials/web/large-models.html#external-data); [dtype evidence](evidence/browser-models-under-800mb/runtimes.md))

Parity includes tokenizer/rendered template, BOS/EOS/stops, thinking and sampling. Qwen3.5 MLC `qwen2` formatting/stops **151643/151645** differ from original EOS **248044**: **unresolved risk, not proven bug**. Validate token IDs/stopping. Native `/apply-template` and `/tokenize` exist; wllama v3 browser diagnostics must be established independently. ([MLC config](https://huggingface.co/mlc-ai/Qwen3.5-0.8B-q4f16_1-MLC/blob/0ec138972555613c1d7812a821778ad0398c8790/mlc-chat-config.json); [source/runtime links](evidence/browser-models-under-800mb/runtimes.md))

### Single-thread CPU is the realistic first hosting path

Threads require SharedArrayBuffer/atomics and isolation, normally **COOP `same-origin` + COEP**. GitHub Pages lacks arbitrary custom headers; a same-origin HTTPS COI service worker/reload is a documented workaround, **not approved here**. Start single-thread. Audit CORS/CORP redirects and CSP fetch/worker/`'wasm-unsafe-eval'` permissions, never generated-code execution. ([Threading/CSP sources](evidence/browser-models-under-800mb/runtimes.md); [COI workaround](https://github.com/gzuidhof/coi-serviceworker))

Modern requires **JSPI/MEMORY64**; compat uses Asyncify/no MEMORY64 with separate browser/performance limitations. **Actual build memory cap remains 4 GiB**. README warns of ~2 GB per-file limits/recommends ≤512 MB chunks: selected GGUF exceeds the recommendation, not 2 GB. Future splitting needs an all-shard/hash inventory and saves no total model/context RAM. GPU needs adapter/features/limits; baseline per-buffer binding/buffer limits are **128/256 MiB**, not VRAM. FP16 needs optional `shader-f16`; q4f32 is still GPU. ([Compat](https://github.com/ngxson/wllama/blob/b68fd6427063266176bb0054befe9ff70b3258f1/compat/README.md); [build/file/GPU sources](evidence/browser-models-under-800mb/runtimes.md))

wllama uses OPFS; existing encoders use versioned CacheStorage. Plan quota/eviction/private-mode loss and retry/clear controls; offline readiness includes runtime assets. Lazy-load, measure isolated/co-resident readers, and unload sessions/workers explicitly: clearing disk cache does not free live weights. ([Caching/storage/unload sources](evidence/browser-models-under-800mb/runtimes.md))

## A new reader must formalize intent before the engine acts

Read **whole 1–20-sentence messages**, including outside-span commentary, corrections, typos and short literal commands. Cover every action/question/value and names, labels, numbers, color/shape/size, position, `from`/`to`, target/anchor, descriptions/context. Build schema from legend **canonical values/types, not cue synonyms**. Preserve unresolved pronouns/“the new one” for reasoning; never guess targets. ([Legend](../README.md); [contract](evidence/browser-models-under-800mb/integration-training-protocol.md))

Proposed adapter: ordered records with half-open original **UTF-16** spans, SOP `{id,type,args}` nodes, status/reasons, confidence/dependencies and existing `unit`/`span` grouping. Earlier `mention` nodes support `{ref:"m1"}`. Own worker/session/cache, version, cutter/gate/context/canvas; use the **same engine**, never mutate `ACTIVE`, `crossReads`, votes, global options or legacy artifacts. Test late load/failure/unload, pruning, concurrency and serialization isolation. ([Reader](../docs/js/neural.js); [UI](../docs/js/ui.js))

**JSON parsing/per-action validation precedes `engine.run`.** Direct JSON bypasses parser SSA checks. Unknown legend keys only warn and are **not stripped**; supported non-legend `position2`/`anchor2`/`region` need reviewed extensions. Validate types/enums, unique IDs, definition-before-reference, spans and dependencies; hold unexpected meaningful fields, never silently delete them or execute generated JS. ([Parser/engine](../docs/js/logic.js))

Validate **whole generation/request before execution** because later text can correct earlier text. Then execute independent understood groups; hold uncertain groups and transitive explicit/named dependents. Engine rollback defaults **per wire**, not atomic message: independent successes remain; `partial:false` differs. Correct intent blocked by a missing shape is **not done/dependency-blocked**, not wrong execution. ([Engine](../docs/js/logic.js); [live example](diagram-e2e-five.md))

### Grammar prevents malformed output, not wrong diagram actions

wllama supports `json_schema` response format/grammar, template kwargs and logprobs. GBNF schema support is partial: remote refs, conditionals, `not`, `uniqueItems`, `contains`, `patternProperties` are unsupported, with numeric/ref restrictions and silently skipped constructs. Explain schema in the prompt too. WebLLM uses serialized-schema `json_object`/grammar APIs; XGrammar's different subset **supports patternProperties**. Independently validate a simple bounded schema: syntax constraints cannot prevent wrong values/targets or omissions. ([GBNF guide](https://github.com/ggml-org/llama.cpp/blob/46ca246de9bb1c35269722a6240d37d9dfd79cad/grammars/README.md#json-schemas--gbnf); [API/XGrammar sources](evidence/browser-models-under-800mb/runtimes.md))

**Self-reported confidence is invalid.** WebLLM masks grammar **before softmax**: returned processed logprobs are not raw semantic confidence. llama.cpp distinguishes pre/post-sampling probabilities, but exact wllama serialization/pre-grammar/forced-token scores remain unverified; no general raw-logit callback is documented. Prove score semantics before calibration or **hold/report the blocker**, without adding an unapproved classifier. Refusal, unsupported/unread, invalid/truncated output and runtime failures need explicit nonexecution reasons, not success claims. ([Masking source](https://github.com/mlc-ai/web-llm/blob/6897fadc2bed9a5a7940265dd80220f83ca184e7/src/llm_chat.ts#L2899-L3152); [probability evidence](evidence/browser-models-under-800mb/runtimes.md))

## Memory and response time cannot be read from download size

Single-sequence attention KV ≈ **`2 × layers × KV_heads × head_dim × cached_tokens × element_bytes`**, excluding padding/metadata; count prompt+generation. Weight/cache dtypes differ. Qwen3 config: **28 layers × 8 KV heads × 128 dimensions**, giving FP16 **112 KiB/token: 224/448/896 MiB at 2,048/4,096/8,192 tokens**; FP32 doubles. Card context 32,768 versus config 40,960 is not a browser-memory promise. ([Config](https://huggingface.co/Qwen/Qwen3-0.6B/blob/c1899de289a04d12100db370d81485cdf75e47ca/config.json); [card](https://huggingface.co/Qwen/Qwen3-0.6B/blob/c1899de289a04d12100db370d81485cdf75e47ca/README.md))

Qwen3.5: **six full-attention layers × two KV heads × 256**, FP16 **12 KiB/token, 48 MiB/4,096**, **plus eighteen recurrent/conv states** and scratch; config requests FP32 SSM state. Its 262,144 positions are not free context. LFM2.5 config similarly implies 12 KiB/token plus ten conv layers, without bundle qualification. SmolLM2's **32 × 5 × 64** implies **40 KiB/token FP16, 160 MiB/4,096**. All are conditional calculations, not peaks. ([Qwen3.5 config](https://huggingface.co/Qwen/Qwen3.5-0.8B/blob/2fc06364715b967f1860aea9cf38778875588b17/config.json); [LFM/Smol sources](evidence/browser-models-under-800mb/runtimes.md))

Illustrative Qwen3 subtotal: **609.824 MiB weights + 896 MiB KV = 1.471 GiB**; one assumed extra weight copy makes **2.066 GiB**, before tokenizer/runtime, activations/scratch, dequantization, logits and GPU staging/other readers. Copies are not inevitable: `Blob.slice` differs from full-file HeapFS. Logits = **`batch × positions × vocabulary × output_bytes`**; vocab 151,936 gives **0.58 MiB/FP32 position**, **1.16 GiB for 2,048 positions** if materialized. Inspect last-token-only behavior. ([Memory/file-access sources](evidence/browser-models-under-800mb/runtimes.md))

Encoders have **no autoregressive KV**, but sequence activations/head outputs and potentially quadratic attention remain. Their two cutter/request passes process tokens in parallel **within each pass**, not necessarily concurrently. Supervised heads offer a narrower, calibration-friendly output contract but require task training/export. Prompted LLMs offer flexible ordered-command output without initial task training, at the cost of serial generation and template/grammar/confidence overhead. This is a task-fit comparison, not accuracy superiority. LLM latency is **`T_prefill + N_output/r_decode + validation/engine time`**, plus cold transfer/compile/load; **no matched benchmark or candidate tok/s, peak RAM or latency was measured**. ([Two-call observation](diagram-e2e-five.md); [task-fit evidence](evidence/browser-models-under-800mb/integration-training-protocol.md))

Transfer-only Qwen3 arithmetic: **639,446,688 B × 8 / bandwidth = 255.8 s at 20 Mbit/s; 51.2 s at 100 Mbit/s**, excluding runtime/overhead/compile/load. Warm cache avoids transfer, not initialization. Separate disk, JS heap, WASM/GPU and RSS metrics; summed process RSS double-counts shared pages, not physical RAM. ([Bytes](evidence/browser-models-under-800mb/qwen-smol-artifacts.json))

## Training on Apparatus is plausible only within a measured budget

Apparatus inventory: **Ubuntu 26.04.1, i7-12700H 14c/20t, 30.57 GiB RAM, RTX 3060 Laptop 6,144 MiB**. A reset fault preceded the owner's reboot and successful historical 2026-11-04 ModernBERT run: Python **3.12.16/Torch 2.15.0+cu132/Transformers 4.57.6/tokenizers 0.22.2**, FP32/checkpointing, microbatch 1/accumulation 16, **24,698 messages/54,584 requests in 4,652.95 s**, no truncation. **Not current health or candidate-fit evidence**; no new GPU/SSH actions. Local inventory source: `browserLLM/docs/browser_encoder_notes/apparatus_finetuning.md:16–31,44–64`. ([Integration evidence](evidence/browser-models-under-800mb/integration-training-protocol.md); [run](modernbert.md))

Start encoder head-only training; consider full small-encoder/LoRA for measured semantic defects. FP32 Adam state is approximately **16 B/trainable parameter**, excluding activations: **1.00 GiB/67M, 2.23 GiB/149.7M**, versus **9.6 GB/nominal 0.6B**, already beyond 6 GiB. LoRA/QLoRA save base optimizer/gradient state, not backward activations; long sequences/vocabulary logits still dominate. ([Memory anatomy](https://huggingface.co/docs/transformers/model_memory_anatomy); [LoRA](https://huggingface.co/docs/peft/developer_guides/lora); [QLoRA limits](https://huggingface.co/docs/transformers/quantization/bitsandbytes))

Causal SFT starts from **source checkpoints, not standard PEFT training off GGUF**. Verify architecture-specific targets/kernels/precision; pilot microbatch 1, accumulation/checkpointing, output-loss masks and exact length budgets, preserving long examples. Transformers 4.57.6 cannot be assumed to support later Qwen3.5/LFM; isolate/validate a new environment. Merge/export/requantize, prove parity, calibrate **final deployment**. No pilot ran. ([Training evidence](evidence/browser-models-under-800mb/integration-training-protocol.md))

Bind data IDs/text hashes/annotations, base/tokenizer/template, heads/adapters, seed/training/loss config, conversion/checkpoints/shards, runtime and calibration hashes. Prove gold→training→decoder round trips. **Training repairs semantics, not tokenizer/export bugs**; ModernBERT parity needed conversion, not retraining. ([Round-trip findings](../training/neural/ROLES_ROUNDTRIP.md); [export result](modernbert.md))

## One preregistered CPU experiment should precede a model tournament

**Future proposal only; separate execution request required.** Hypothesis: fixed prompted Qwen3 Q8 + canonical legend/schema provides useful low-risk action coverage on native/browser CPU without changing existing readers. **One model, no fine-tuning**, no tournament/prompt tuning on ten historical actions. Later candidates require separate protocols.

### Freeze compatibility and nonexecution safety before calibration

Verify actual GGUF checksum/embedded metadata; pin the wllama/native llama.cpp versions above. Freeze **native GPU/Metal off, browser `n_gpu_layers:0`, one thread each, `n_ctx=8192`, `max_new_tokens=2048`, temperature 0/seed 0, `enable_thinking=false`**, same template/stops, FP16 KV and batch/cache settings. **Unsupported required flags/diagnostics reject the stage—no invented defaults.** The 8K context is an initial quality budget, not a speed result. Count legend+schema+input, reserve output, hold overflow without dropping long examples.

Freeze fixtures covering Unicode/names/labels/numbers, all actions/questions, corrections, multiple requests/references/dependencies, unsupported text and malformed/truncated/overflow output. Require exact native/WASM **token IDs, parsed actions/values/roles/refs/spans/gates**; score tolerances must be preregistered, not bit-identical floats. Prove forced/unforced pre-grammar score semantics before fitting; missing browser diagnostics blocks parity. FP32/q8 or MLC/GGUF differences are not browser overhead. ([API/parity evidence](evidence/browser-models-under-800mb/runtimes.md))

Qualify strict bytes/dependencies/load, independent state, validation/nonexecution safety and score access. Proposed deterministic action score: **minimum of per-semantic-field mean pre-grammar logprobs**, using all semantic-value/literal/reference tokens across action type/arguments/supporting mentions, **including grammar-forced semantic tokens**. Exclude structural punctuation/key scaffolding only. Unavailable raw scores for any semantic token cause a **missing-evidence hold**, never silent exclusion. This remains an unvalidated ranking score, not a correctness probability; calibrate thresholds only against action outcomes, without a new classifier. Missing score access means **stop/report the blocker**.

### Separate fit examples, calibration and a fresh action-level test

Freeze disjoint grouped **fit/calibration/test**; group linked turns/near duplicates/scenarios. Prompt examples use fit only. Propose **≥400 calibration messages; ≥1,000 fresh test messages/≥2,000 requested actions**, plus unsupported controls. Include realistic English short/1–20-sentence messages, all Rules constructions, outside-span text/corrections, ambiguous references, names/labels/numbers, role swaps/negation/layout/arrows/questions. Review gold before outputs. “Seen trigger” means declared diagram fit/prompt/training data, **not unknowable LLM pretraining**. No data is generated here.

Choose threshold on **calibration only**, maximizing cost-10 with **five message-group folds**, higher-threshold ties and ask-all option. Pick on four folds/evaluate fifth, report pooled OOF; choose final threshold on all calibration by the same rule. Freeze extraction/schema/prompt/parser/gate/gold/artifact before test. Keep old weights/thresholds. Give every reader **identical fresh messages/initial engine states**, recording independent state divergence. Equal-data/equal-budget supervised comparison is a separate experiment. ([Precedent](../training/neural/MODERNBERT_PLAN.md))

With requested `N`, right `R`, executed wrong `W`, executed extras `E`, report **cost-10 `100×(R−10×(W+E))/N`**, wrong share **`(W+E)/(R+W+E)`**, right share **`R/N`**; wrong share is undefined at zero executions. Separate held/asked, unread/refusal, engine-rejected/dependency-blocked and extras; report risk–coverage/AUROC and seen/unseen-trigger strata. Holds/refusals/unread/truncation are not wrong executions; missed requests reduce coverage. Score **whole semantic actions**, not labels or per-message exactness; distinguish formalization from engine outcomes. Legitimately unresolved reasoning references are not reader errors.

Success requires **cost-10 >0, ≥20% right, ≤5% wrong including extras, ≥400 executions, all parity/safety/isolation gates**. Report 95% Wilson execution intervals and 95% grouped bootstrap intervals (**2,000 resamples, seed 0**) for cost/coverage/paired differences; disclose dependence/small strata. Zero mistakes does not prove 100% precision. Superiority needs paired cost interval above zero or preregistered matched-precision coverage advantage on **this same test**, not historical sets. **Stop on failure; no test-driven tuning.**

After every evaluation, classify first causes with counts/examples/location: data/conversion, tokenizer/offsets, cut, semantics/heads, references/dependencies, calibration, export/runtime, engine. Separate held-correct from held-wrong proposals; diagnosis informs a new proposal, never changes this result.

### Measure user-visible latency and memory with explicit future limits

Proposed target: **M1/16 GiB, single-thread browser CPU**, native CPU separately. Future limits: **incremental summed owned-process RSS ≤3 GiB; warm full-request p95 ≤10 s for 1–2-action inputs, ≤60 s for 10–20-sentence inputs**. These are **acceptance proposals, not predictions or an 800 MB RAM rule**. Baseline-subtract same-session RSS, include new workers/processes, disclose shared-page duplication/absolute totals. Qualify isolated and five-reader-co-resident conditions separately.

Per condition: **3 warmups; 30 short timings (10 fixed cases ×3); 10 representative long cases; 3 cold loads**, bounded cache resets/HTTP policy plus warm startup; reset engine outside timing. Report bytes, transfer/compile/load/prefill, TTFT, first completely validated command, full validated-request p50/p95 (declared quantile rule), output/reasoning tokens, failures/memory/responsiveness. Ten-sample long p95 is exploratory; publish samples. **No partial-stream execution** before whole-request validation. GPU/offload/fallback and different MLC weights remain separate. ([Timing evidence](evidence/browser-models-under-800mb/runtimes.md))

## Historical results constrain interpretation, not candidate rankings

Historical ModernBERT: **745 messages/1,745 actions; 16 right, 0 wrong, 1,625 held, 104 unread, 0 extras**; all accepted were questions. **0.9169% right, AUROC 0.888655; failed 20% criterion**. These are formalizations/gates, not 1,745 live drawings. Diagnosis: **844 head/445 cutter cases**, covering 1,185 wrong/extra proposals/104 unread, with contextual-reference caveats. One epoch versus SOP-BERT's eight/different optimization does not rank encoder architectures. ([Frozen report](modernbert.md))

Historical parity passed **19 fixtures** with uint8-storage/FP32 Basic arithmetic. Live **10 actions + unsupported control** yielded **9/8/7/3/1 right** for Rules/VSS/SOP-BERT/VSS-BERT/ModernBERT, no wrong executions observed; four VSS-BERT actions were dependency-blocked. Tiny dependent counts establish no broad ranking. **M1/16 GiB/Chrome 156 WASM** live median formalization was **537 ms versus 71 ms** ModernBERT/SOP-BERT, excluding load/different pipeline work. Separate **251.6 ms** ModernBERT call p50 is not full two-call latency. Nothing was rerun; no candidate LLM tok/s follows. ([Live](diagram-e2e-five.md); [parity/timing](modernbert.md))

## Evidence boundary: facts, observations and unrun work

### A. Researched artifact and source facts

Exact primary-source/file indexes: [instruction artifacts](evidence/browser-models-under-800mb/qwen-smol-artifacts.json), [encoder artifacts](evidence/browser-models-under-800mb/encoders-artifacts.json), [runtime assets](evidence/browser-models-under-800mb/runtimes-assets.json), with [runtime](evidence/browser-models-under-800mb/runtimes.md) and [integration/training](evidence/browser-models-under-800mb/integration-training-protocol.md) source notes. **Source-reported inventories are not checksum-verified loaded task bundles.** [Denied-access evidence](evidence/browser-models-under-800mb/liquid-gemma-phi.md) prevents complete-family claims.

### B. Actual runtime observations are historical only

Only published [ModernBERT](modernbert.md)/[five-reader](diagram-e2e-five.md) execution evidence is reused. **No new model download, inference, browser/native model test, training, GPU action or deployment occurred.** New metadata observations are metadata; memory/bandwidth arithmetic is not measurement.

### C. All candidate tests and integration remain proposed

Next is **qualification of one exact Qwen3 Q8 artifact**: matching template/token IDs, accessible confidence, independent validated execution and measured resource limits. A blocker should stop quality claims before training. Qwen3.5, SmolLM2 and supervised Ettin remain subsequent hypotheses—not improvements established here or authorization to run them.
