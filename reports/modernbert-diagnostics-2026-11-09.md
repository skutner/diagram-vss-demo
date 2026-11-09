# ModernBERT B/F diagnostics: training fit, export and lower-case failures

Completed 2026-11-09. This is a diagnostic result, not a new training experiment or release approval. B and F are the saved seed-0 artifacts from the two stopped campaigns. Their previous verdicts, data, weights and confidence thresholds remain unchanged.

**The main finding is that F already fails to fit many explicit training targets before export.** The clearest example is size inside a description: F reads only 8 of its 35 added r2 training examples correctly, in both float and quantized inference. Export changes some individual answers, but it does not explain the large form failures. Lower-case regressions have a separate, measured concentration in reference-fill decisions and name tags.

The next useful hypothesis is inadequate supervision or optimization of rare populated class targets. Loss imbalance is plausible from the source and counts, but this pass did not prove that a particular loss or sampling change will fix it. The known label conflict and contextual labels must also remain visible. A larger model, another broad data bundle or a manually changed confidence threshold is not supported as the first response to these findings.

## 1. Scope and evidence

The [preregistration](/home/skutner/browserLLM/diagram-vss-demo/reports/modernbert-diagnostics-plan-2026-11-09_codex.md) was written before inference. New scripts and evidence are confined to:

`/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09`

Below, **D** denotes that directory. **Observed** means directly read or measured in this diagnostic. Independent verification is attributed separately; its detailed commands and outputs are in the [verification report](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/verify/verification_report_codex.md). **Inferred** identifies explanations not established by an intervention.

The reviewed diagnostic candidate is `f306620b8c0ff21a3e8afb79afa6ddfc64eec0715218396a5333e483724dcd5b`, listed in [candidate-v2.json](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/inputs/candidate-v2.json). Input selection was frozen in `inputs/training-v2.json` and `inputs/cases-v2.json`. Existing source, models and training data were read-only. No training, export, calibration fitting, threshold selection, download, GPU execution, browser work, commit or publication was performed.

**Observed execution:** CPU with two computation threads; request-head batches of eight, plus normal per-message cut/read batching for full-message probes. Python was 3.12.16, Torch 2.15.0+cu132 and Python ONNX Runtime 1.29.0; CUDA visibility was disabled and the quantized sessions explicitly used CPU/Basic optimization. Versions and exact commands are in the run receipts and [pipeline ledger](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/logs/pipeline-v2.jsonl), with the [continuation ledger](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/logs/pipeline-v2-continuation1.jsonl).

Both models' epoch-8 snapshots matched their final checkpoints exactly across all 144 named model tensors. The independent verifier additionally loaded F's actual final checkpoint, rather than the substituted epoch snapshot, and reproduced all three output tensors exactly on two fixed batches. The same batches matched the saved Python-ORT output exactly. Its peak RSS was 3,220,275,200 bytes. Source: [F-modelspot-v2.json](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/verify/F-modelspot-v2.json).

## 2. Does the model fit its relevant training examples?

The table measures the indicated **head target**, not complete request execution. Every positive observation in the frozen families was included, using row ordinal because message IDs repeat. Different families can concern the same request; their totals must not be presented as distinct-message counts.

| Own-training target | B float | B quantized ORT | F float | F quantized ORT |
|---|---:|---:|---:|---:|
| Outline on create, including explicit `none` | 22/32 | 22/32 | 64/89 | 63/89 |
| Outline on set | 24/38 | 24/38 | 90/97 | 91/97 |
| Size in a description, all roles | 0/24 | 0/24 | 8/59 | 8/59 |
| Direct size on count questions | 0/2 | 1/2 | 14/14 | 14/14 |

Sources: [B training summary](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/results/B-training-comparison.summary.json), [F training summary](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/results/F-training-comparison.summary.json), independently recomputed in `verify/B-independent-headpairs-v2.json` and `verify/F-independent-headpairs-v2.json`.

**Observed:** each model gets all 1,440 sampled absent-head observations right in both runtimes. These are deterministic absent controls, not the entire training corpus. The action and annotated word-tag predictions are also correct for all 96 B and 259 F positive observations. Tags for class-valued words are often O by design, so correct tags do not establish that a size word was understood.

Explicit `outline="none"` is a populated legend value, not an absent target. Both models get all 15 such create rows right. Restricting to coloured outlines, B reads 7/17 correctly; F reads 49/74 in float and 48/74 after export. The distinction explains the earlier 74-versus-89 training-row counts. Source: `verify/F-float-slots-complete-v2.json`, `verify/F-ort-slots-complete-v2.json`, and the frozen selection manifest.

F is below the preregistered 95% diagnostic fit convention on all three primary families: outline create, outline set and description size. This is not merely a held-out generalization failure.

**Why the earlier aggregate fit was misleading:** F's final saved 1,000-row training sample had only two populated `desc:size` targets; it missed both and got all 998 absent targets right. B's sample had no populated `desc:size` target at all. Those facts are recorded in the respective `run/fit.jsonl` files. A high overall training accuracy could therefore coexist with an almost unusable rare head.

### Labels limit some interpretations, but do not explain away the explicit failures

The 59 F description-size observations comprise 24 old B/source observations, with 0 correct, and 35 added r2 observations, with 8 correct in both runtimes. Some old annotations contain size values not written in the request: examples include “push them out a bit” and “put them in a row.” It would be wrong to treat every such miss as a failure to infer information available in the text.

The explicit r2 forms still fail. Even the conservative subset containing the exact canonical size word has only **5/21 correct** in both runtimes. Examples include “move the small squares down” read with size tiny, and “erase the small triangles” or “erase the huge triangles” with size omitted. This subset excludes synonyms rather than inventing a new cue table.

There is also one conflicting selected input group per arm: the exact input “dashed” has a small description-size target once and an absent target twice. The captured token IDs and masks are identical. At least one of those three observations must be wrong for a deterministic head. This is one conflict viewed in padded and unpadded forms, not two independent conflicts. It cannot account for the widespread explicit r2 failures. Source: [labels-membership-v2.json](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/verify/labels-membership-v2.json).

## 3. Does export cause the failures?

**Observed, same-input comparison:** B had 1,289 matched float/quantized batches and F had 1,309. The replay used the identical prepared IDs and masks, even where the float and quantized cutters otherwise chose different spans.

For F's 259 populated training-target observations:

| Float → quantized correctness | Observations |
|---|---:|
| Right → right | 174 |
| Wrong → wrong | 81 |
| Right → wrong | 2 |
| Wrong → right | 2 |

Thus 81 of the 83 quantized target errors were already errors in float. Export is not harmless, but it is not the principal explanation for these populated-target failures. Source: [F independent head comparisons](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/verify/F-independent-headpairs-v2.json).

The full-message, ungated `truthful_v1` comparisons on the frozen evaluation forms show the same limitation:

| Requested-action population | F float right | F quantized right |
|---|---:|---:|
| Outline create | 16/80 | 15/80 |
| Outline set | 65/80 | 67/80 |
| Size-description population | 15/64 | 15/64 |
| Outline question | 66/66 | 66/66 |

The size population separates into 14/14 direct counting questions and only 1/50 commands using a size-filtered description. Source: [full-panels-v2.json](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/verify/full-panels-v2.json) and the slot-comparison files. These are formalization outcomes, not browser drawing measurements. Gated float views in the raw evidence reuse the unchanged quantized-model fit and must not be advertised as a newly calibrated float reader.

Slot observations add useful detail. On F's coloured-outline training misses, float copies the gold fill colour into the outline in 14 of 25 cases; quantized inference does so in 15 of 26. The fill-colour head itself is correct on those misses. On the evaluation outline-create panel, float substitutes fill colour in 36 of 62 wrong outline-head answers. This is a measured role/value assignment problem, although its optimization cause remains unproven.

For description-size training misses, the top-level size head also says absent in 50 of 51 float misses and all 51 quantized misses. This is mostly omission, not simply moving the requested size into the top-level size argument. Sources: `verify/F-float-slots-complete-v2.json` and `verify/F-ort-slots-complete-v2.json`.

### Python ORT versus Node ORT

F passed the registered combined numerical tolerance on all 1,309 batches. B did **not**: one padded token logit in one of 1,289 batches exceeded `atol=1e-3` plus `rtol=1e-3`. Its absolute difference was about 0.001385; no unmasked value violated tolerance. The B check remains **FAIL**. It was not rerun with a looser tolerance or relabeled a pass.

Independent production decoding nevertheless found no changed winning action, class value, token tag, role span or cut boundary between Python and Node ORT: 3,764 reads/483 cuts for B and 3,922 reads/483 cuts for F. Probabilities and some lower-ranked action ordering did differ. General confidence-gate equivalence across the two runtimes was not established. Sources: `verify/B-ortnumeric-v2.json`, `verify/F-ortnumeric-v2.json`, and the corresponding `*-node-production-categorical-v2.json` files.

This comparison is the practical path from PyTorch FP32 to the exported artifact. It does not isolate weight quantization from conversion/framework arithmetic with a separate unquantized ONNX control. No new graph was exported.

## 4. Where does lower-case behavior break?

The frozen historical tallies were independently recomputed without changing populations:

| Population, ungated | B right | F right |
|---|---:|---:|
| Original-case twins | 746/825 | 747/825 |
| Lower-case names on other drawings | 612/825 | 557/825 |
| short3 lower-case names | 63/134 | 41/134 |

Source: the original score bundles, independently reconciled in `verify/cached-recompute-v2.json`. All 32 relevant population tables and all 3,568 frozen transition entries matched. New quantized full-message replays also reproduced the historical readings and loss states exactly for both models, including dependencies and structural holds.

Among requests B reads right and F does not, before the confidence gate:

| Population | Regressions | First observed reference-fill error | Name-tag error | Other or unresolved |
|---|---:|---:|---:|---:|
| Other-drawing lower case | 96 | 42 | 31 | 23 |
| short3 lower case | 27 | 20 | 3 | 4 |

Source: [case-causes-v2.json](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/verify/case-causes-v2.json), with raw-head links in the accompanying loss-head files. These are counts within the frozen regression subset, not rates over all requests.

For example, `fo-0003#lc` asks “paused should go back to running.” F selects `fill:from=context` for the explicitly written name and emits running→running. In `fo-0004#lc`, the below-position head is correct but the anchor Clean is not tagged, so the decoder drops the position. A tagger-only explanation misses the large fill-routing category.

Other categories include action/value heads, text-state and dependency holds, context resolution, and cut/head effects that cannot be separated confidently. Gold-span probes can change both span content and batch composition, so a corrected oracle answer is not automatically proof that the cutter alone caused the miss. These uncertain cases remain labeled as such.

Across the original-case controls and both lower-case populations, all 249 unique requested-action losses and 272 level-specific entries are accounted for. Of these, 109 are additional confidence-only losses: the ungated formalization is right but F holds it. They include original-case as well as lower-case requests and are not all failures of name recognition. The first-cause categories are diagnostic classifications, not proof that changing one head would fix every request assigned to it.

## 5. Evidence-tool findings and independent verification

The old `forms-2026-11-08/bin/make_evidence.py` is **not suitable as an acceptance gate without repair**. It searches fixed logs for PASS text, stamps the caller's artifact hash and does not establish execution-time candidate applicability. An isolated probe of its exact log-check function accepted a string containing PASS followed by FAIL and exit 1. This does not mean the original log contained that sequence. The code-level fixture logs remain usable within their actual scope; stamping a model hash does not turn them into learned-model checks. Details: [helper review](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/review/helper_review_codex.md).

The new harness also had two false-comparison defects found by independent review before inference: ORT results could enter the float summary slot, and F tensors could be decoded with B's layout. Both were fixed with negative checks and a fresh source-bound manifest. The original candidate and inputs were retained. The reviewed v2 rejects wrong runtimes, aliased comparisons, wrong arms/layouts, truncated batches, changed identities and invalid tensor/preparation data. Details: [harness review](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/review/harness_review_codex.md).

Independent verification then checked population reconstruction, actual model loading, exact tensor equality, identical inputs, Python/Node outputs, production decoding, case attribution and identity closure. Final closure verified 17 candidate files, 235 consumed identities, two additional frozen membership files and 16 completed output files. The independent model probe used the actual final F checkpoint and saved q8 artifact on two fixed batches, with exact output equality. The one B padding-logit numerical failure remains a finding; there is no blanket “all checks passed” claim.

Actual command paths and outputs are in [verification_report_codex.md](/home/skutner/.cache/diagram-vss-modernbert/diagnostics-2026-11-09/verify/verification_report_codex.md). Identical durable copies of the verification probes are under `D/verify/probes/`; temporary copies were cleaned up. Existing source, model and training-data contents were unchanged.

## 6. What the evidence supports next

**Observed:** the explicit r2 size-description training forms still fit poorly in float; outline creation has substantial training errors and a further generalization gap; correct absence is much easier for the models than correct presence. The existing trainer averages cross-entropy across the class heads (`training/neural/finetune_modernbert_batched.py:121–139`), and the saved F layout has 52 such heads. Description-size supervision is rare in the 58,552 request rows.

**Inferred:** rare positive-target learning deserves the next controlled intervention. Loss balance, exposure and optimization are plausible levers; this pass did not prove which one is responsible. A useful next preregistration would isolate a consistent data-derived positive/absent class-loss or exposure rule, keep other variables fixed, and measure complete explicit-positive fit before considering adoption. It must retain absent-target checks, execution-risk/regression guards and lower-case preservation. The exact contradictory input and context-dependent labels must be audited and reported rather than counted as clear text-understanding failures.

Casing should remain separately scoped. Its major measured problems include reference-fill routing as well as tags; adding capitalized examples or changing only the tagger is not a demonstrated remedy. No case augmentation or new calibration fit was performed here.

Before any future acceptance decision, replace or repair the old evidence-stamping path with execution-bound evidence. No existing model should be published on the strength of that helper alone.

The R and F misses remain valid. This diagnostic does not reopen either campaign, consume another training trajectory, select a new threshold or establish browser/release readiness.
