# Rare-head measurement and runner review

Independent `rare_measure_review`, code-reviewer Sol XHigh. Initial three-file patch `fb18a5b52cefced798dca636a62b2e9b91f8179cae682a74250f10605218da10`, base `0ab687cc142e884ed16332925c6d7cd558e1b8fb` plus preserved initial dirty tree. Candidate: `T/measure-dev/review-candidate/candidate.json`; T = `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09`. All three source hashes and approved plan/review hashes matched before and after review.

**Outcome: BLOCKING FINDINGS. Five supported findings, confidence 100 each.** No model, GPU, full suite or heavy check was run. Project files were unchanged; small isolated probes used `/tmp`.

## B1 — Handwritten fit evidence can pass without a model

`modernbert_rare_heads_measure.mjs:263–276`: `fitRows` checks generic identities, claimed scope and observation rows, but does not require the registered model/checkpoint, exact execution argv/cwd, context or Node/engine receipts. Raw batch coverage is independent of the 1,699 observations.

Reviewer probe under `/tmp/rare-measure-review-vouZZU` supplied perfect-label rows, `argv:["echo","perfect-label-fixture"]`, nonexistent model/run paths, zero model executions and one synthetic padding batch. `node --input-type=module` observed `accepted:true`, 29 passing checks. This can falsely establish learned fit or misbind another subject.

Required fix: validate the full fit execution chain against registered artifacts and reconcile all requests/batches/observations and raw outputs with decoded rows. Reject relabeled fixture subjects, missing models, echo invocations and incomplete/synthetic coverage. Preserve genuine measured misses as failures.

## B2 — Output and lock paths escape ownership via symlinks

`modernbert_rare_heads_measure.mjs:46–56` uses lexical containment only. `modernbert_rare_heads_train.sh:8–14` creates directories and truncating lock files before protocol validation. An output ancestor, trajectory directory or lock symlink can redirect writes outside T.

Verbatim `owned/claim` probe escaped its temporary task directory. A shell probe under `/tmp/rare-measure-cli-review-8ty8wj` truncated an outside eight-byte sentinel to zero through `budget.lock` and created an outside `.trajectory.lock` through a W-s0 directory symlink before rejecting a dummy protocol. The probe used an isolated HOME override; coordinator instructed subsequent tests to use task-specific fixtures without HOME overrides, per the developer rule.

Required fix: reject symlink components and resolved escapes before every write, including shell setup; use non-truncating lock creation. Cover ancestor, final-directory and lock-file links.

## B3 — F-s1 lacks the required C100-s1 evaluation prerequisite

`modernbert_rare_heads_measure.mjs:377–388` checks seed0 for F-s1, then reaches reservation without requiring the registered sealed C100-s1 evaluation. A verbatim pre-reservation probe with resource operations stubbed observed only `decide("seed0")` before reservation. This violates the approved R4 sequence and could spend a trajectory early.

Required fix: load and validate C100-s1 evaluation before budget reservation or execution; test refusal with no budget consumption when it is missing or invalid.

## B4 — Internal CLI bypasses CPU locks and evaluation guards

`modernbert_rare_heads_measure.mjs:451–461`: direct `cpu-evidence`, `cpu-evaluate` and `evaluate-worker` dispatch enters heavy bodies without an inherited CPU-lock assertion; `evaluate-worker` also bypasses its finite resource wrapper. Focused verbatim dispatch probes entered stubbed bodies without attempting the simulated occupied lock.

Required fix: verify inherited CPU ownership at internal boundaries and require evaluation execution/resource context. Direct internal invocations must refuse before heavy work.

## B5 — Executed evidence dependencies are not frozen

`modernbert_rare_heads_measure.mjs:236–245` binds protocol inventories, which omit both `test_output_contract` scripts, direct roundtrip helpers `bench-canon.js`, `layer_common.mjs`, `vss-composer.js`, and the default `docs/model/neural/modernbert-c100` tokenizer assets consumed by `roles_roundtrip.mjs:35–41` / `.py:301–303`. Reviewer checked source paths, inherited pins and inventory roots. Changed test/preparation code could leave old evidence accepted as identical.

Required fix: bind the direct executed dependency closure and tokenizer inputs in the freeze and before/after receipts, with stale-evidence mutation tests.

## Unchanged decisions and remaining gates

No additional supported issue in numeric R1–R4 mapping, fixed B safety anchors or cached training-versus-inference provenance. Author 14/14 tests remain delegated evidence and do not close these findings. Actual applicability, canonical P2 evidence, training, fit, evaluation and outcomes remain pending. Broad trainer/fit reviews were reused rather than repeated.

Coordinator assigned non-overlapping fixes: original measurement writer owns runner/measurement/Node tests; objective writer owns protocol dependency closure and Python tests; fit writer owns a new standalone fit-evidence validator and its tests. No new objective, gate, trajectory or publication permission is introduced. Each affected delta requires independent review before production execution.

## B5 delta review — closed

Same independent reviewer verified objective v3 manifest `8d12327846e8c2129ac602cc5fe9888fac28ef6bd8ca8a92a3ff7123954b4ffe` and v2→v3 diff `cf7e9232f78bfef9739dfc7f2ba885275f3752e750cb038b9a766bd11dcb6650`. All six source hashes matched; four prior approved files unchanged. All 14 added existing code hashes and four tokenizer/config asset hashes matched. The reviewer traced contract/roundtrip imports through the added VSS helper closure and confirmed their binding through existing inventory/verify and before/after receipts.

Delegated evidence inspected: v2 baseline regression failure and v3 10 tests OK; no suite rerun. No supported new delta finding. **B5 is closed.** The two new fit-evidence implementations remain integration/freeze prerequisites. B1–B4 remain open until separately reviewed.

## B1–B4 and resource delta review — no blocking findings

Same independent reviewer checked all five live hashes before and after review: measurement v2 patch `be2bfc7009daffb0f480f246366f3fbe166d8c3d3257840362a1de73fcc57294` plus validator aggregate `4cf39bfd6450a9fdcad07ab963edb3f567b0e57a2d9dd8847c9353d5e4905fcb`. Approved B5 protocol v3 is unchanged and reused.

**B1–B4 are closed.** The fit consumer validates registered model/checkpoint/provenance, full execution chain, complete raw coverage, prepared inputs, decoded decisions and recomputed summaries. Genuine quality/parity misses remain negative evidence. Output and shell paths reject symlinks, and locks are non-truncating. F-s1 requires registered C100-s1 evaluation before reservation. Internal commands require inherited CPU ownership; evaluation additionally requires finite context and a live supervisor. Registered GPU 8/2-GiB and CPU 12/4-GiB limits are applied and recorded.

Reviewer personally replayed preserved symlink and forged-R0 probes: both refused, with no outside write. A focused prerequisite probe observed `seed0 → C100-s1`, then refusal before reservation. Actual direct internal CLI probes rejected before protocol work. Delegated logs inspected: measurement 23/23, validator 8/8, final integration 2/2, no skips. No full suite was repeated.

No supported new finding or delta risk. This is source approval for the planned offline checks. Canonical evidence, cached applicability, actual model/training/fit/evaluation outcomes, workload resource enforcement and release readiness remain pending. Peer trainer/objective and producer reviews were reused; no project files or models were changed by the reviewer.
