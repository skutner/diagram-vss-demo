# ModernBERT diagram reader preregistration

Date 2026-11-03. Baseline `6cab8231d2e92d0161fad43a03f56896806fd35e`.
Work is authorized in `skutner/diagram-vss-demo` only.

## Goal and hypothesis

Add ModernBERT as a fifth independent reader beside Rules, VSS, SOP-BERT and
VSS-BERT, preserving their existing cutters, votes, thresholds and drawings.
The hypothesis is that a task-trained ModernBERT reader can execute some diagram
requests usefully while holding uncertain requests. A raw masked language model
does not supply the trained action, role, value, name and cut heads.

Experimental success requires all three conditions on the existing test split
at the cost-10 threshold selected on calibration data. The cost score must be
positive, at least 20% of requested actions must be done right, and no more than
5% of executed actions may be wrong, including extras. Failure is reported without
changing settings or thresholds on the test results. Runtime release correctness
and experimental quality are separate outcomes.

## Model and input contract

Use `answerdotai/ModernBERT-base` revision
`8949b909ec900327062f0ebf497f51aef5e6f0c8`, its bare encoder, eager attention,
disabled compilation, and the existing joint head layout learned from annotations.
Inputs are int64 `input_ids` and `attention_mask`; outputs are `token_logits`,
`seq_logits` and `cut_logits`, with the established `config.reader` label layout.
The configuration must identify ModernBERT truthfully.

Declare `reader.tokenization = "wordwise-bpe-prefix-space-v1"`. Use the existing
word splitter and original spans. Encode each word without specials, with an ASCII
space before every word except the first, then concatenate verified BOS/EOS IDs.
Use the actual tokenizer padding ID. Python and JavaScript must agree exactly on
IDs, first-piece indices, masks, padding, Unicode, punctuation and truncation.
This is a disclosed whitespace-normalized policy. Legacy models retain their
current preparation. Request/message caps are 128/512 pieces. Truncated requests
are held and omitted message suffixes reported, with no silent Rules fallback.

## Data, training and resource bounds

Generate the same arm ALL data as the shipped SOP-BERT model using
`training/neural/make_roles.py --all` and its documented twelve EXTRA_DIRS.
The expected counts are 24,698 messages and 54,584 request spans. Hash the actual
generated data and label layout. A count discrepancy stops for diagnosis.

Fixed settings are seed 0, one complete request epoch, learning rate 3e-5, AdamW
weight decay .01 with foreach disabled, linear scheduling with 6% warmup, gradient
clipping 1, FP32, microbatch 1, accumulation 16, cut microbatch 1, and gradient
checkpointing. Cycle whole-message cut training as in the existing trainer.
The shipped DistilBERT trained eight epochs; report this regime difference.

Use native MPS on the M1 Mac. No automatic CPU fallback or Apparatus reset is
authorized by this plan. The task environment is Python 3.12.13, Torch 2.15.0,
Transformers 4.57.6, Tokenizers 0.22.2, ONNX 1.23.2 and ONNX Runtime 1.29.0.
Save a resolved environment and actual device metadata with each run.

After eight optimizer updates, save the model, optimizer, scheduler, RNG states,
request position and cut iterator/order. Continue the same schedule only when
losses and gradients are finite, encoder and heads receive gradients, padding is
masked, the device is native MPS, and measured throughput including the cut pass
projects completion within four hours. The pilot is capped at 30 minutes within
that wall cap. Set the native MPS allocator limit to 4 GiB using the fraction of
its recommended maximum; stop if RSS exceeds 8 GiB or host available RAM falls
below 2 GiB. RSS and MPS indicators overlap and must not be summed. Preserve a
resumable checkpoint on failure or timeout. Do not substitute another schedule.

## Export and confidence

Validate float ONNX against PyTorch with atol=rtol=1e-3 and identical decoded
fixtures. Quantize to q8, then require Python ORT and JavaScript decoder agreement
on fixture tokenization, outputs, roles and cut spans. Report any q8-versus-float
prediction changes separately. Calibration uses the finalized q8 artifact.

The browser remains on Transformers.js 3.8.1 and WASM. Keep graph and each external
data file below 100 MiB by packing whole quantized tensors into numbered files
of at most 90 MiB. Set `transformers.js_config.use_external_data_format` to the
chunk count. Stop if any tensor cannot fit. Include all chunks in size, cache,
version and file validation. Cache pruning retains the union of both published
neural readers and their chunks. Missing artifacts fail independently.

Collect the new reader's own cuts and `neural-confidence.js` signals through the
real decoder. Fit its own 24-feature confidence using the established five-fold
message-level calibration recipe, L2 grid .01/.1/1/10 and OOF AUROC selection.
Fit percentile maps and act priors inside each fold. Preserve the fresh2+short3
split, SHA256(id) modulo 3 equal to 0 for calibration and the rest for test.
Choose cost-1/2/5/10/20 thresholds on OOF calibration scores, with ties choosing
the higher threshold. Include an explicit finite ask-everything threshold above
1. Missing confidence fails closed. Do not reuse SOP-BERT's fitted confidence or
include ModernBERT in the existing votes or global cutter.

## Verification and reporting

Independent source review and focused contract checks precede training and
publication. Inspect actual tensor parity, masks and continuation state. Before
each reader/model commit run `bash training/sketch/regress.sh` and inspect its
complete table and underlying failures, then include the table in the commit
message. Its exit status alone does not establish completion. Agents leave files
uncommitted; the coordinator commits and pushes main in the fork.

Report right, wrong, asked/unread, extras, execution precision, cost score, AUROC,
risk/coverage and seen/unseen trigger cases. Follow each evaluation with first-cause
analysis and examples, distinguishing data, tokenizer, cutter, heads, calibration
and execution errors. Preserve negative and partial runs.

The final live E2E check must use the published fork without model/CDN substitution,
all five readers ready, and identical natural-language messages covering create,
color, position, connection, layout, questions, references and unsupported content.
Record intended actions separately from each reader's wires, holds, executed
changes and rendered SVG/SOP. Honest abstention is an outcome. Save screenshots
and actual artifact versions. If training or deployment remains unfinished, say so.
