# ModernBERT integration checkpoint

Updated 2026-11-03. Fork https://github.com/skutner/diagram-vss-demo.
Demo https://skutner.github.io/diagram-vss-demo/.

## Completed preparation

- Cloned the current main branch, forked it into `skutner`, and enabled Pages
  from `main` and `/docs`. The local clone is shallow and contains every current
  tracked file. The GitHub fork retains the repository history.
- Added an independent ModernBERT reader, its tokenizer contract, own confidence
  gate, cache/version handling, loading state and diagram. Its trained model is
  unpublished, so it is explicitly unavailable.
- Added training, transactional checkpoints, export with bounded external-data
  files, strict collection provenance and calibration. Independent reviews closed
  recovery, tokenization, overlay, collection-completeness and cut-boundary findings.
- Completed the [direct live four-reader baseline](diagram-e2e-baseline.md).
  The candidate UI was also exercised locally with the same eleven messages;
  all 44 legacy after-state SOP drawings matched that live baseline exactly.

Observed final preparation checks were eight offline device tests, six Python
contracts, nine runtime tests with no skips, and nine Python/JavaScript tokenizer
fixtures plus manifest, threshold and truncation checks. Tiny random ModernBERT
export/q8/JavaScript parity passed three fixtures with a clean Node exit. These
checks leave the full-sized trained artifact and native CUDA checks pending.

The canonical Rules/VSS regression completed with Python 3.12 and matched the
baseline table, including 359 diagram-operation checks and the history checks.
The existing native SOP-BERT confidence checker printed matching assertions, then
aborted with exit 134 during native teardown on both unchanged baseline and
candidate. It is recorded as an unresolved check, rather than a passing command.
The live browser baseline uses WASM and completed its capture without failures.

## Training state

The native MPS attempt at `62a5b8d` stopped at the unchanged host-memory guard after
17 request/cut pairs and one optimizer update. Its eight-update pilot did not
complete. The checkpoint remains in the task cache and the
[failure evidence](evidence/mps-pilot-62a5b8d/stopped.json) is preserved.

Daniel will report when Apparatus's GPU is restored. A subsequent health check
still reported `gpu_recovery_action: Reset` and error readings, despite an empty
GPU process list. Native CUDA allocation and training have not been attempted.
The reviewed CUDA implementation uses a fresh seed-0 run and preserves the MPS
evidence. The [CUDA follow-up plan](../training/neural/MODERNBERT_PLAN.md#cuda-follow-up-after-the-incomplete-mps-pilot)
requires readiness confirmation and a healthy driver before allocation.

## Remaining sequence

1. Confirm operator readiness and the expected physical GPU's health, identity
   and absence of foreign compute workloads.
2. Prepare an isolated Python 3.12 environment with Torch 2.15.0+cu132 and the
   pinned dependencies. Verify the official wheel and actual native CUDA support.
3. Run `test_modernbert_device.py --require-cuda --gpu-uuid <physical-uuid>` with
   `CUDA_VISIBLE_DEVICES` set to that UUID. This gate must pass on actual hardware.
4. Start `finetune_modernbert.py --device cuda --gpu-uuid <physical-uuid>` with
   the verified ALL dataset and a new work directory. Assess the eight-update
   pilot before using `--resume --continue-after-pilot` under the fixed schedule.
5. After a complete epoch, export and verify the full q8 artifact and Python/JS
   decoder parity. Collect all 1,113 eligible fresh2+short3 messages with the
   finalized manifest, fit confidence and report the fixed test criteria and
   first causes. Preserve a negative outcome without retuning.
6. Install finalized model/confidence artifacts, stamp their versions, run the
   required regression and local UI checks, then publish and exercise all five
   readers directly on Pages with the frozen command fixture.

ModernBERT training completion, task-quality results and five-reader live results
remain open. The published availability label must stay truthful until those
artifacts and checks exist.
