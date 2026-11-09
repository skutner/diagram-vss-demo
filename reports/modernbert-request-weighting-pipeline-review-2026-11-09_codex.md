# Whole-request weighting: independent campaign/fit source review

## Initial review: candidate v1

**CHANGES REQUIRED.** Independent named code-reviewer XHigh, configured fleet/fresh context, no model override. Base `0ab687cc142e884ed16332925c6d7cd558e1b8fb` plus preserved initial dirty state. Whole candidate SHA `e8ac7c85c932e30a1d583cddf9970cf3815a2340f6b054278e6c5ffde25758da`; exact files/copies in `TI/review/candidate-v1.json` and `TI/review/candidate-v1/`, where TI is `/home/skutner/.cache/diagram-vss-modernbert/request-weighting-implementation-2026-11-09`.

The reviewer inspected all 12 new `campaign-fit` files, their diffs and neighboring producer/consumer/quality paths; all hashes matched. The approved objective/trainer review was reused, with `request_class_loss` integration inspected. No tests or actual model runs were performed by the reviewer.

### Blocking finding: SIGTERM leaves detached fit workers running with the CPU lock

Path at v1: `training/neural/parity/modernbert_request_weight_fit.py:395–451`. Confidence 100%.

The `deadline` context installed only a SIGALRM handler. `run_fit` started Node with `start_new_session=True` and inherited CPU-lock descriptor; the Python engine inherited that lock again. Exception cleanup sent SIGTERM to the owned process group and waited for the leader, but Python's default SIGTERM action does not raise an exception or execute this cleanup. A coordinator cancellation after worker startup therefore left detached workers active until their deadline/completion, without the public supervisor's aggregate memory monitor or failure-result recording.

The Node entrypoint checked the supervisor only at startup; its watchdog checked memory/deadline, not parent liveness. Existing tests covered preparation failure, not interruption after worker launch. The reviewer reopened the relevant lines and searched signal handling/tests; neighboring trainer and campaign resource-worker code explicitly handled SIGTERM/SIGINT.

Required repair: bounded interruption handling that terminates and reaps the complete owned group, including a descendant that survives its leader, records incomplete interruption and releases the lock. Add a synthetic subprocess baseline/candidate regression; do not run a model.

### Other reviewed scope

No additional supported material findings. By inspection, full-vector J0, strict padding parity, raw evidence reconstruction, both F/B comparisons, Guard G anchors, fixed output registration, source-review prerequisite, one-overfit/two-training/aggregate ledger enforcement are consistent with the plan. Preserve this completed review and re-review the affected cleanup delta only.

The strict projected-origin C100 applicability gap remains an execution prerequisite: the launcher refuses before trajectory reservation. This review does not turn historical categorical/record reconstruction evidence into universal current numerical inference equivalence.

## Current disposition

Cleanup repair, baseline reproduction, affected checks and scoped re-review are pending. V1's passing source suites do not close the supported ownership defect. This file is not source approval until a later exact-candidate disposition is appended.

## Scoped v2 source re-review

The independent reviewer approved the six-file fit delta on candidate `1c378ea3538185e2b20c2a35cecf56f0d4c49aa8c959b3b0f9ecc4705ad8be75`, reusing the unchanged ten-file reviews. It checked all16 hashes and the cleanup packet/delta. **The original public-fit SIGTERM finding is closed.** Signal deferral, bounded whole-group cleanup/subreaper reaping, private-group Node owner watchdog and consumer cleanup-evidence validation were reviewed with no additional supported finding in that delta. The reviewer inspected the baseline/candidate probe JSON and22Python/8Node author logs; it did not rerun checks.

## New independent runtime finding on v2: resource-worker leader-only lifetime

Subsequent implementation-verifier execution found a separate blocker in unchanged `modernbert_request_weight_measure.mjs` (v2 SHA `fada8beb1d60f126472168670ffdb17da997f5ff572f79fec26bc886c4f2a1a5`). A synthetic leader exited0 while a SIGTERM-ignoring descendant retained fd7. The 1000-ms supervised invocation returned exit0/errornull and `countFixture=1`, yet the descendant remained beyond the deadline and the CPU lock was unavailable. The resource worker cleared timers on leader exit and only killed remaining group members if a stop reason was already set.

Exact verifier evidence is preserved under `TI/verification/boundary-v2/`, including `identity.json`, `resource-result-before-cleanup.json`, `resource-cleanup.json`, scripts and mechanical temporary-root/import rewrites. The verifier killed/reaped its exact owned process identities after preserving failure; all fixture locks were released. Parent personally inspected these records.

Other v2 independent probes passed: fit SIGINT and leader-first cancellation; eight missing-context refusals without output/model imports; durable failed-attempt time, counter-reset, unfinished-reservation and earlier-receipt forgery refusals. Reuse these scoped results if their dependencies remain unchanged.

**Current overall disposition remains blocked** pending resource-worker group-lifetime repair, regression, scoped source re-review and independent re-verification. Passing v2 source review did not override this later concrete runtime contradiction. No actual models or production task root were used.
