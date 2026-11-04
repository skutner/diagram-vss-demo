# Liquid, Gemma, Phi and tiny instruction models

## Which current releases and complete bundles qualify?

### Takeaway

No artifact is eligible for a recommendation: public-source access was denied, so no current release, immutable revision, file size, complete bundle or license could be verified. This is a research-access failure, not a finding that suitable models do not exist.

### Cited Findings

- The attempted official [LiquidAI model search](https://huggingface.co/api/models?author=LiquidAI&search=LFM2&limit=100&sort=lastModified&direction=-1), [Google model search](https://huggingface.co/api/models?author=google&search=gemma&limit=100&sort=lastModified&direction=-1), and [Microsoft model search](https://huggingface.co/api/models?author=microsoft&search=Phi&limit=100&sort=lastModified&direction=-1) all failed with `Permission denied: webfetch` on 2026-11-04. The searches returned no model metadata.
- Searches for [SmolLM3](https://huggingface.co/api/models?search=SmolLM3&limit=10) and [SmolLM2](https://huggingface.co/api/models?author=HuggingFaceTB&search=SmolLM2&limit=100) failed with the same denial. Their inclusion is a search lead, not an assertion that any release fits.

### Inferences

- None of these families can be shortlisted or excluded on exact size from the available evidence. Previously remembered model names, parameter counts and approximate quantized sizes cannot establish the required complete bundle below 800,000,000 bytes.

### Gaps

- Latest official releases as of the cutoff, instruction versus base designation, exact full-precision and quantized artifact sizes, required shards and tokenizer/config files, GGUF self-containment, immutable revisions, LFS hashes, byte sums, near misses, licensing and gating all remain unverified.
- A public read-only source access route is needed to obtain model cards, commit dates, file trees and small configuration files. No downloads of weights were attempted.

## Can candidates run in browser WASM and native CPU, and be trained within 6 GiB?

### Takeaway

There is no verified runtime or training recommendation. Native CPU compatibility must not be treated as proof of browser WASM compatibility.

### Cited Findings

- No public runtime documentation was retrievable in this task; the source-access failure above prevented architecture- and version-specific verification.

### Inferences

- Even after artifact qualification, hybrid attention, short convolution and state operators, quantization kernels, browser memory and model-output parity require separate verification in the exact browser runtime and version. A model-format listing alone cannot establish this.
- LoRA or QLoRA training feasibility requires actual architecture, sequence length, precision, adapter configuration, optimizer and memory measurements; inference checkpoint size alone is insufficient.

### Gaps

- wllama and other browser runtime architecture/version support; native CPU support; WebGPU-only or conversion-only limitations; context and KV configuration; structured-output evidence; training compatibility and the 6-GiB constraint; diagram-reading quality; and all runtime tests are unverified. No benchmark or quality figures are claimed.
