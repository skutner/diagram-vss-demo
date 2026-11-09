# Whole-request weighting: independent objective/trainer source review

## Candidate and disposition

**PASS — no blocking findings in this four-file scope.** Independent named code-reviewer, XHigh, configured fleet with fresh context and no model override. Actual runtime model identity was not exposed. Repository `/home/skutner/browserLLM/diagram-vss-demo`; HEAD `0ab687cc142e884ed16332925c6d7cd558e1b8fb` plus preserved initial dirty snapshot.

Exact delta SHA-256: `7127330ff02ed2673b07824b73d77a65c2e2c3c72008b5443755495f6a299b16`. Receipt: `/home/skutner/.cache/diagram-vss-modernbert/request-weighting-implementation-2026-11-09/review/objective-candidate.json`. The reviewer independently reconstructed this delta from saved starting bytes and confirmed all four current hashes and the approved plan/review identities.

| Reviewed file | SHA-256 |
|---|---|
| `training/neural/modernbert_request_class_loss.py` | `93492eab8c3f85ef78ee70540eede4c28a4866b13ccb9685db21755e4c6801a3` |
| `training/neural/finetune_modernbert_batched.py` | `54fc60571f9d1ff78ec1b9147c4ea5e17033aacf18ef0829f7d9e14de6a322f1` |
| `training/neural/parity/test_batched_trainer.py` | `affcb8845c177d5be233237d1f3bd5b232401e8578467aba8421165e1ea30303` |
| `training/neural/parity/test_modernbert_request_class_loss.py` | `5e3323dd6c5af4246172c4d3dac5ec5e45db6dca9dd86816eb72832cf3323d06` |

## Findings

None. Source inspection supports the positive-rarity formula, floor/max selection, binary64 division and full-corpus `math.fsum` normalization. Actual Layout targets preserve absence versus literal `none` and reject unknown populated values. The ordered row inventory binds duplicates, full row content and maximizing heads; canonical validation precedes model construction.

One row multiplier applies equally to every class head. Existing action/tag terms, cut code, ordinary CE and W loss expressions remain unchanged. CLI and direct entrypoints reject W/J stacking. Full-corpus coefficients reach training, longest-row preflight and overfit. The separate `request_class_loss` metadata preserves W's `class_loss` schema; manifest-byte and objective-source identities participate in resume validation.

The reviewer inspected neighboring W code, Layout, resume validation and existing/new tests. Coverage includes analytical gradients across 52 heads, unchanged action/tag gradients, short batches, bitwise CE/W preservation, caller propagation and exact tiny-model resume.

## Evidence and limits

The reviewer did not rerun tests. It inspected the author log with 11 focused tiny-CPU tests passing in 3.253 seconds and reused the four-test arithmetic result. The intentionally shortened overfit inside a propagation test is fixture evidence, not an experiment success. An earlier accumulation-order failure was preserved and fixed by the literal per-row head mean without weakening assertions.

After review, the independent test-runner ran the full affected trainer suite once: 39/39 passing, and objective arithmetic 4/4 passing, with zero failures/errors/skips/cancellations. All four hashes remained unchanged. Exact commands, environment, timings and logs are bound by `TI/logs/objective-assigned-20261109/results.json`, where TI is the implementation evidence root above. The coordinator inspected this receipt and its summaries. Existing unclosed fixture-file ResourceWarnings remain non-failing warnings.

This review does not cover the campaign/fit adapters, their integration, actual-corpus production freeze, J models or runtime quality. Those require their own scoped review/evidence. No pretrained loading, experiment execution, download, source edit or Git mutation was performed by the reviewer. Source approval does not authorize a J-s0 run.
