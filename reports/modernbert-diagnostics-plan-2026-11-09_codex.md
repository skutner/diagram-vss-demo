# ModernBERT B/F diagnostic preregistration

Date: 2026-11-09. Authorized by the owner's “you do that” following the proposed diagnostic-only pass. No training, fitting, threshold selection, export, downloads, publication or changes to existing source/model/data are authorized by this diagnostic. The failed R and F campaigns remain failed.

## Questions and fixed scope

1. Does F fit its relevant training examples, especially outline creation and size in descriptions, before quantization?
2. On identical prepared inputs, which correct float answers become wrong in the saved weight-only quantized artifact, and vice versa?
3. On the existing matched original/lower-case populations, where do B→F losses first appear: cuts, action, name tags, reference-fill decisions, description/value heads, structural holds or final decoding?
4. Which prior evidence-helper claims are supported, and can the new diagnostic harness detect wrong model/layout/input identities and misleading denominators?

All findings separate observed data from causal hypotheses. No diagnostic result authorizes a new training run or changes an old verdict.

## Inputs and ownership

Repository: `/home/skutner/browserLLM/diagram-vss-demo`, HEAD `0ab687cc142e884ed16332925c6d7cd558e1b8fb` plus the existing uncommitted implementations. Preserve concurrent and unrelated work, especially `training/qwen/*`.

Read-only inputs:

- B: `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/B-s0`, with `next-2026-11-08/data/B`.
- F: `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/F-s0`, with `forms-2026-11-08/data-v2/F`.
- Frozen prior views, records, scores, manifests, receipts, training logs and evidence-helper code.

New scripts, frozen selection lists, outputs and logs go only under `/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09`. Assert that directory is absent before creation; never overwrite an existing result. The coordinator owns this preregistration and the final report; one implementer owns the diagnostic scripts. Reviewers/verifiers do not edit those scripts or old artifacts.

Hash consumed source, model, tokenizer, layout, data and selected-record inputs before runs and check them afterward. Record exact commands, versions, settings and output hashes. For large inputs, stream hashes rather than printing contents.

## Populations fixed before inference

Use row ordinal as well as message ID because training IDs repeat.

- **Training positives:** every B/F training row with an explicit outline on a create; every row with an outline on a set; every row whose gold description contains a size, including rows whose compiled targets omit it. Report encoded `desc:size`/`desc2:size` targets separately from genuinely absent or unrepresentable targets. Include direct size-bearing count questions as the comparison that already behaved differently.
- Distinguish explicit `outline="none"` from an absent outline. Initial file inspection counted F 89 outline-create rows and B 32, including that literal value; the earlier 74/17 counts refer to coloured outlines. F has 59 compiled description-size rows and B 24. Freeze exact lists and explain any difference in gold-derived counts before running inference.
- **Absent controls:** for each relevant head/applicable action or description-role family, take up to 256 absent-target rows, deterministically ordered by SHA-256 of source identity, row ordinal and text. Use each model's own training corpus for its training-fit table. Report this as a sampled absent population, not all-row training accuracy.
- **Existing evaluation forms:** use the frozen clean outline-create, outline-set and description-size requests, and their comparison questions, without relabeling or changing membership. Keep the original denominators.
- **Case tracing:** first reproduce the existing B/F original-case and lower-case tallies using `truthful_v1`, including structural holds and text/scale requirements. Freeze every requested-action transition and the complete set of B-right/F-not-right cases before any targeted head inference. Inspect all such losses, not selected favorable examples. Keep wrong, unread and structurally held distinct; account for extras separately.

Duplicate text may share an inference result only when model, input preparation, cap and context relevant to that operation are identical; retain every original row in reported denominators and record the deduplication mapping.

## Inference and decoding contract

- CPU only; one heavy inference process at a time; two computation threads. Use installed environments, offline/local-only model and tokenizer loading, `PYTHONDONTWRITEBYTECODE=1`, and no CUDA-visible devices.
- Load the actual local encoder config and checkpoint into the existing `ModernReader`, FP32, eager attention, eval/no-grad mode. Never call a trainer or a base-model download path.
- An epoch-8 snapshot may substitute for the exported checkpoint only after all named model tensors are shown exactly equal to the final checkpoint; metadata/update equality alone is insufficient. If equality fails, use the actual exported checkpoint and report the discrepancy.
- Quantized inference uses the saved ONNX artifact with CPU execution and Basic graph optimization. Use identical token IDs, masks, request/message caps and recorded batch composition for comparisons.
- Freeze batch size at eight for request-head probes, padding as the existing preparation requires. Keep full-message case replay separate and preserve its production per-message cut/read batching where used. A probe on a gold request span is an oracle-cut diagnostic, not a claim about full-message execution.
- Record act, class, tag and fill decisions/probabilities needed to explain every miss. Use `Layout.class_targets` or equivalent validated target indexing; index zero is absence, while literal `none` can occupy a later class index.
- Replay actual production JS preparation/decoding where conclusions depend on emitted roles/values/holds. Do not replace it with fuzzy matching. If a head-only comparison cannot establish final request behavior, label that limitation.
- Independently compare Python-ORT and Node-ORT quantized outputs on the diagnostic inputs, or explicitly report that Node equivalence was not established. Different runtime outputs must not be attributed to quantization alone.
- Keep the original confidence fits/thresholds unchanged. Head and export diagnostics do not choose a new gate or reopen adoption.

Stop a diagnostic process on nonfinite outputs, invalid identity, unavailable required inputs, a memory-allocation failure, process RSS above 12 GiB or host available memory below 4 GiB. Preserve partial evidence and report the limitation. Do not silently reduce populations, change runtime settings or turn a skipped case into a success.

## Measures and interpretation rules

Report action accuracy, relevant populated-head accuracy, sampled absent-head accuracy, and exact decoded requested-action outcomes separately, with counts, confusion tables, probabilities/margins and representative errors. Never let absent targets dominate a populated-value headline.

For diagnostic triage only, a relevant float head below 95% on its complete training-positive population is evidence of inadequate fit to those labels; at least 95% establishes only fit to this population, not generalization. This uses the earlier training-fit bar as a declared diagnostic convention and is not an adoption gate. Report exact counts even when the population is small.

Classify float/export changes as right→wrong, wrong→right, same-right and same-wrong on identical inputs. Any right→wrong case establishes an export contribution for that case; its share of observed failures bounds the explanation on the measured population. Do not equate approximate logit parity with identical decoding.

For case losses, identify the earliest observed divergence and distinguish head output from context resolution/decoder behavior. When records lack the necessary raw heads, use the frozen targeted probes or mark the cause unresolved; do not guess “tag” versus “fill”. Gold information may label a diagnostic but must not leak into the normal inference path.

Follow each evaluation with a reconciled first-cause analysis. The final recommendation must follow the observed branch: training-fit failure, generalization failure, export/runtime failure, label/representation failure, or a combination. Unidentified causes stay unidentified.

## Independent checks and completion

Before model inference, a code reviewer checks the exact diagnostic scripts, read/write boundaries, selectors, model/state/layout identities, target indexing, denominators and runtime paths. Include negative probes that reject a wrong layout/model/source hash, detect changed token preparation, preserve explicit-none versus absence, and count one correct plus nine unread/held requests as 10%, not 100%.

An independent verifier checks the risky runtime claims on the final diagnostic candidate: selected populations, state equality, same-input float/quantized comparison and case attribution. Reuse applicable immutable evidence; do not rerun unrelated broad suites. The old `make_evidence.py` receives a separate bounded review; generic fixture logs must not be treated as model-specific proof merely because a helper stamps an artifact hash.

Completion requires a self-contained report with the four question answers, sources/commands, reconciled counts, reviewed/verified scope and remaining uncertainties. Save it to `reports/modernbert-diagnostics-2026-11-09.md`; link durable diagnostic artifacts. No model improvement, new training, release readiness or publication is claimed.
