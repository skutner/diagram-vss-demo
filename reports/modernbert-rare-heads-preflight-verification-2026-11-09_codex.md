# Rare-head pretraining verification

Independent `rare_preflight_verify`, implementation-verifier Sol High. Exact 15-source candidate `52a35fa7250204a1162ddd5d5ce9e3a22499637261881ec22a342b24c26c1b59`, base `0ab687cc142e884ed16332925c6d7cd558e1b8fb`. Environment: Linux x86_64, Node v24.22.2, system Python 3.14.4. Probes: `/tmp/rare-preflight-verify-trwt70zr`. No project edits, models, GPU, training or full suites.

### Check: Candidate and syntax
Command: `python3 /tmp/rare-preflight-verify-trwt70zr/identity.py`

Observed: `all_files_match: true`, 15/15 syntax checks, aggregate matched. Scoped tracked diff SHA `45e1faad841cb6d6d0d84cbc47da9bec60b693fb1e56f5e2dfcfd12fc0e16ff5`.

Result: PASS.

### Check: Forged-fit baseline and refusal
Command: `node /tmp/rare-preflight-verify-trwt70zr/probe.mjs`

Observed baseline: `pass:true`, `checks:29`, `model_exists:false`, `training_exists:false`. Candidate rejected: `fit evidence: registration differs from frozen protocol`.

Result: PASS.

### Check: Actual internal CLI ownership
Command: `node /tmp/rare-preflight-verify-trwt70zr/probe.mjs`

Observed: direct `cpu-evidence`, `cpu-evaluate` and `evaluate-worker` exited one with `exclusive inherited CPU lock fd7 required`; `resource-worker` exited one with `resource context fd6 must name a regular file`; `train` exited one with `runner must retain exclusive budget and trajectory locks`. All refused before reading the nonexistent protocol.

Result: PASS.

### Check: Output and lock ownership
Command: `node /tmp/rare-preflight-verify-trwt70zr/probe.mjs`

Observed: ancestor, dangling/final output, budget, CPU, trajectory, ledger and work symlink cases refused. Ordinary lock contents were preserved. Outside sentinel remained `DO NOT CHANGE\n`, with no added outside file.

Result: PASS.

### Check: F-s1 ordering
Command: `node /tmp/rare-preflight-verify-trwt70zr/probe.mjs`

Observed: missing or unsealed C100-s1 evaluation refused (`C100-s1: bundle identity changed` for the latter), with neither budget nor trajectory file created. Used the real registered-bundle loader; only the passing seed0 decision was substituted to isolate this condition.

Result: PASS.

### Check: Supervisor controls and failure paths
Command: `node /tmp/rare-preflight-verify-trwt70zr/supervisor.mjs`

Observed tiny positive control: exit zero, one check; RSS 29,794,304 bytes, CPU limit 12,884,901,888 and available floor 4,294,967,296 bytes. CPU lock without supervisor context refused. Child-created stdout symlink refused with outside sentinel unchanged. A 250 ms deadline terminated the child with SIGTERM; observed elapsed 255 ms and `finite invocation deadline`.

The supervisor fixture used a scratch source copy changing only import resolution, REPO and TASK. No HOME override.

Result: PASS.

### Limits
This independently verifies the assigned ownership and false-pass protections only. Canonical suites, production freeze, actual model execution, numerical parity, learned quality and release gates were not performed by this verifier. Production freeze/verify are separate coordinator evidence recorded in the task checkpoint. Source approvals and this report do not establish experiment success.

VERDICT: PASS
