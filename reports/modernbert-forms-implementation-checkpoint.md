# ModernBERT forms (F = B + nonreserved r2): implementation checkpoint (uncommitted)

Plan: `reports/modernbert-forms-plan-2026-11-08_codex.md`, SHA-256 `0635a2470ad387c79d41e06ec89ac1f31cc3da9c43e4c95f0569d25f3e937f1c` (observed, matches).
Review: `reports/modernbert-forms-plan-review-2026-11-08_codex.md`, SHA-256 `f80acb37b7564169cb6d77a36bf71612fc635961fdd719e953b29c8d5e809f0c` (observed, matches; APPROVE, no findings).
The plan file is never edited; status lives here. This is a NEW campaign; old R C16 stays FAILED; old S/confirmations are not resumed.

## Session facts (observed 2026-11-08 21:35 EET)

- Session `9c0c4f2f-567d-4671-88ab-4c5a12cedd01`, Claude Code 2.1.319, launch args (ps): `--model claude-opus-5-5 --effort medium --permission-mode bypassPermissions --settings {"remoteControlAtStartup": true, "worktree": {"bgIsolation": "none"}} --remote-control`. Harness reports bypass permissions mode active.
- Remote Control: launched with `--remote-control`; bridge session `session_018zYYPJ8jUiPjht9CoFRvJ3` -> https://claude.ai/code/session_018zYYPJ8jUiPjht9CoFRvJ3 (URL derived from the bridge id the harness supplied; not opened from here).
- Usage: Claude usage events only; no scheduled/independent polling. Console API-credit delegation paused (not used).
- Old coordinator session 8e9e2138 has a desktop-app process (pids 9259/9266, `--resume=8e9e2138...`); not touched, not resumed by this session.

## Phase

1. Start freeze: DONE (below). 2. Data slice: pending. 3. Measurement/verdict + runner slice: pending. 4. F-s0: not started. 5. C100-s1 eval / B-s1 / F-s1: not started. 6. Final review/report: pending.

## Frozen start (observed)

- HEAD `0ab687cc142e884ed16332925c6d7cd558e1b8fb`.
- Scoped dirty diff `git diff --binary HEAD -- . ':!training/qwen'`: SHA-256 `9972a6c406c3fe73d97f65699ecd0a8fc0abab1bc98540667889343ad3b9f3f5` (saved `TASK/start/scoped.diff`).
- Untracked manifest (excl. training/qwen, training/laptop/node_modules): 81 files, `TASK/start/untracked.sha256` `2a77a0a3...` (copy `reports/evidence/modernbert-forms/start-untracked.sha256`). Status `TASK/start/status.txt` `9de2f466...`.
- Parent identities (observed sha256, match plan table): old plan `0ef29893`, old review `c07121d2`, amendment `ff9a2eab`, amendment review `b4fef95a`, `$OLD/protocol-v2/protocol.json` `39999918`, `$OLD/views/manifest.json` `df4abeee`.
- Membership counts (observed wc -l): B.ids 26,913; r2_nonreserved.ids 1,417; r2_reserved.ids 580; calibration 1,144; t1_clean 1,354.

## Paths

- `$OLD` = `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08` — READ ONLY.
- `$TASK` = `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08` — asserted absent, created 21:36 EET by this session (`task-owner.txt`).

## Resources (observed 21:35)

- GPU `GPU-905b8484-3b1e-30f6-defd-05d44f00f692`, 13 MiB used, 49 C, no compute apps; no trainer/collection/qwen process running.
- Shared lock `~/.cache/diagram-vss-modernbert/locks/GPU-905b...lock` (flock wait, never kill a holder).

## Ownership

- Coordinator (this session): this checkpoint, `reports/evidence/modernbert-forms/`, run-log append.
- Pending assignment: data slice writer; measurement/runner writer.
- Not owned: every old tool (`modernbert_next_*`, make_roles, trainer, arm_export, calibrate/collect/score/root_causes/compare), `training/qwen/*`, docs/*.

## Run budget

At most 3 new full trajectories: F-s0, then B-s1, then F-s1. Used: 0.

## Commands / results

(appended below as work proceeds)

## Unresolved gates

P1-P4, F1-F4 all pending. Browser/product/resource/Settings release gates (C23, D26-30) and D31 pending/out of scope; publication excluded.

### 2026-11-08 ~21:40 EET — writers launched (coordinator)

- Data slice writer (code-implementer, Sonnet medium per AGENTS.md pipeline rule): owns `training/neural/parity/modernbert_forms_protocol.json`, `modernbert_forms_data.py`, `test_modernbert_forms_data.py`; scratch only `$TASK/data-dev/`.
- Measurement/runner writer (code-implementer, Sonnet medium): owns `training/neural/parity/modernbert_forms_measure.mjs`, `test_modernbert_forms_measure.mjs`, `$TASK/bin/train_arm.sh`; scratch only `$TASK/measure-dev/`. No heavy collection by writers.
- Gate order fixed by coordinator: no F-s0 until both slices pass independent code-reviewer (Opus high) review AND the F round trip (`--gate 95 1`) passes. C100-s1 evaluation only after a seed-0 pass. Scoped diff re-hashed for every review packet.

### 2026-11-08 ~22:05 EET — data slice delivered (delegated; not yet reviewed)

- Candidate: `modernbert_forms_protocol.json` `8c10a064de52`, `modernbert_forms_data.py` `f1141f1821e0`, `test_modernbert_forms_data.py` `b1120290fb1f` (sha256 prefixes; observed by coordinator).
- Reported (delegated): tests 67 checks exit 0; scratch freeze/build/verify into `$TASK/data-dev` exit 0; F 28,330 msgs / 58,552 rows (= B 57,135 + 1,417; = S 64,531 − 5,979 restored-only rows); support all pass (cal 939 groups, folds 198/177/206/182/176, t1_clean 1,354/1,285, clean-create 20 groups); THIN desc:size huge 9 req/9 groups; leak scan 0 reserved/restored/calibration ids.
- Coordinator decision (guard-eval groups): my writer brief asked for zero F∩guard-eval groups "as the old freeze checked"; that was my error — the old freeze never checked it and the plan's zero-leakage list is reserved/calibration (+ t1_clean groups). F shares 47 groups with full canonical guard populations (B alone 44; +3 from r2: nl-03-022, s3-0013, s3-0207 via or3g-0104). Observed: `$OLD/views/manifest.json` notes "clean = the message group touches none of train_c100, train_restored, r2, cal_cand" and none of the three ids occur in any clean population file (only in short3_lowercase, which old R/S also trained near). Kept as REPORT (R1/K3) per plan "keep ... conservative clean populations ... unchanged"; no membership change.
- Flags forwarded to measurement writer: manifest `extra_dirs` lists whole synth_short_r2 folder (calibrate_modernbert.mjs:73-79 expands it); views manifest records modernbert_next_data.py `43d3eeb2` vs current `f6cf3899`.

### 2026-11-08 21:5x EET — real freeze/build/verify (coordinator ran, observed)

- `python3 -B training/neural/parity/modernbert_forms_data.py freeze --protocol training/neural/parity/modernbert_forms_protocol.json --out $TASK/protocol`: rc 0, "F = 28330 messages (58552 rows); 70 checks, 4 report-only, thin cells ['desc_size_huge_in_mention']". protocol.json `0e8dc86f525a`, F.ids `57a5242c11d4`.
- `... build --protocol $TASK/protocol/protocol.json --arm F --out $TASK/data/F`: rc 0. F.manifest.json `a2ca4b631cdf`, F.messages.jsonl `648b6819c5dd`, F/train.jsonl `bfdb92373d8e`, F/reader.json `5abf1240d908`; all files identical to the writer's scratch build (determinism, observed by diff of hashes).
- `... verify --protocol $TASK/protocol/protocol.json --data $TASK/data/F`: rc 0, "verify ok: F; 28330 messages (= |F| and the trainer's expect-manifest numbers), 58552 rows; ... no reserved r2 or calibration id in any file; make_roles on the saved messages file reproduces every file".
- Data built before review finished: if review requires code changes, F is rebuilt into a fresh path (no overwrite).
- F round trip started 21:59 (`$TASK/roundtrip/run.sh`, env = F manifest env, same form as old B13).
- Data review (code-reviewer, Opus high) launched on candidate 8c10a064/f1141f18/b1120290.

### 2026-11-08 ~22:15 EET — P2 round trip + contract tests (coordinator ran, observed)

- F round trip (`$TASK/roundtrip/run.sh`): rc 0, "gate passed: every trained folder round-trips (right, reference only or asked) >= 95.0% with <= 1.0% silent wrong labels". ALL trained folders 58,552 req: exact-only 94.0%, exact+context+abstention 99.9%, wrong(other) 0.1%; held: depends 30, text-state 57, unresolved-reference 199 (B was 93.88% exact). Log `$TASK/roundtrip/F.log`, `$TASK/roundtrip/F/roundtrip.json`.
- Slice-B contract files unchanged vs the old reviewed candidate (observed sha256 prefixes): make_roles 83c10427, neural.js c0faac04, neural-confidence 8ec9ccf0, calibrate_modernbert 5b50dbc7, roles_roundtrip.mjs 77054bb2 / .py 1e672f17, shipped_decode_check 55f7226a, arm_export 4e935697, test_output_contract.py 3698d7c6 / .mjs 051f4e19.
- Fresh run: `node training/neural/parity/test_output_contract.mjs` PASS (67 checks); `python3 -B training/neural/parity/test_output_contract.py` PASS (83 checks). Logs `$TASK/contract-evidence/`. (Fixture exactness = these tests; reused reviewed design, freshly executed.)

### 2026-11-08 ~22:25 EET — data review (code-reviewer Opus high, delegated)

- Candidate 8c10a064/f1141f18/b1120290: APPROVE WITH CHANGES, no blocking. Reviewer reran tests (67 PASS), independent F recompute (28,330; zero id overlap with restored-only/r2_reserved/calibration/t1_all/guard; zero group overlap with r2_reserved/calibration/t1_clean; source order and 28,314 byte-identical + 16 overlaid lines), determinism (fresh freeze/build/verify byte-identical), mutations 4/5 caught. Agreed with the coordinator's guard-overlap decision (old plan step 4: such r2 groups are nonreserved by design). Evidence `$TASK/review-data/`.
- Findings sent back to the data writer as a delta: (85) report B-vs-F group exposure for t1_all_undo_redo_count (3/28 vs 13/28 msgs) and t1_all (19 vs 162 groups) — F2 must display it; (90) leakage keys tagged text/span, cross directions unchecked (all four directions measured 0 now); nit: byte-identity check untested.
- Note for F2 interpretation: the undo/redo regression population is heavily exposed to F training (13/28); this is displayed, not a bar change.

### 2026-11-08 ~22:45 EET — measurement slice delivered (delegated) + cached diagnostics (coordinator ran)

- Candidate v1: `modernbert_forms_measure.mjs` `e1cf7cb8`, test `27da9a12` (32 test blocks), `$TASK/bin/train_arm.sh` `91b4f881`. Reported (delegated): tests exit 0; 28 targeted mutations, 25 caught then 3 more tests added; `applicability` B-s0 204 checks/0 failed, C100-s0-v2 184/0 (code hashes compared, unlike old assertSameBasis); runner dry mode never spawns trainer; ledger `$TASK/budget/trajectories.tsv`; B data manifest pinned `2b102ef3...`; trainer/arm_export/verify only read data dirs (writer read code).
- Coordinator decisions on writer's list: C100-s1 collects fresh at THREADS=2; arm_receipt.json binds export, confidence.json sealed in bundle; F-s1 requires seed0 + control1 passes; coordinator authors new evidence files (ids 9-14, 19) — B-s0 re-bound since contract code hashes unchanged (observed). Delta requested: display F/B training-group exposure per F2/F3 population (undo/redo 13/28 vs 3/28).
- Diagnostics (coordinator ran `node training/neural/parity/modernbert_forms_measure.mjs diagnose --protocol $TASK/protocol/protocol.json --out $TASK/diagnostics-e1cf7cb8`, rc 0, "reconciliation ok (12 checks)"; copy `reports/evidence/modernbert-forms/diagnostics.{md,json}`), no acceptance threshold:
  - lowercase_other affected 825 req, ungated right orig/lower: C100 91.4/73.1, B 90.4/74.2, R 92.8/76.2; gated gaps 40.4/38.5/29.8 points.
  - short3_lowercase (134 req, no original-case twin): ungated right C100 39.6, B 47.0, R 76.1.
  - nl_a executed mistakes at own gate: C100 6 (thr .8707), B 4 (.9150), R 9 (.8588). Parent claim "5 of R's 9 were identical readings B held" independently holds: B held 5 by confidence, executed same reading 3, produced nothing 1.

### 2026-11-08 ~23:05 EET — data delta + fresh freeze v2 (coordinator ran, observed)

- Data delta candidate: `modernbert_forms_data.py` `f1dc3ee21bdb`, test `a07df41fdc33` (76 checks, delegated), protocol json unchanged `8c10a064`. Untagged text/span leakage keys (K1/K2/K3 + verify rows_key_leak); audit `exposure` section (X1 hard zero F groups in clean pops; X2 report undo/redo 3 vs 13 msgs).
- Fresh: `freeze --out $TASK/protocol-v2` rc 0 (72 checks, 5 report-only; protocol.json `61524cc13da0`, audit `bfcb89a98c73`); `build --out $TASK/data-v2/F` rc 0; `verify` rc 0. F.messages.jsonl, F.coverage.json and all 15 F/* files byte-identical to `$TASK/data/F` (diff of sha256 lists); F.manifest.json `d6250c7082e3` differs only by protocol pin. Hence the round-trip result (`$TASK/roundtrip/F.log`, on identical messages/rows) applies to data-v2.
- `$TASK/protocol` + `$TASK/data/F` (v1) superseded; kept, not used for training. Runner must point at protocol-v2/data-v2 (pending runner delta after review).
- Delta review of the data fix sent to the same reviewer.

### 2026-11-08 ~23:15 EET — data delta review (delegated): APPROVE, no findings ≥80

- On f1dc3ee2/a07df41f/8c10a064: suite 76 PASS (reviewer rerun); mutants d1 (byte check removed) and d2 (tagged keys) killed; d3 (X1 forced pass) survives — nit, X1 holds by construction (views define clean as excluding r2-touching groups). Evidence `$TASK/review-data/delta/`.
- DATA SLICE APPROVED. P1 (freeze/verify v2 + independent recompute) and P2 data part (tests 76, F round trip gate passed on byte-identical data) satisfied.

### 2026-11-08 ~23:25 EET — measurement/runner review (code-reviewer Opus high, delegated)

- Candidate ae8eb717/04b3fd68/train_arm 91b4f881: APPROVE WITH CHANGES, ONE BLOCKING (conf 100, reproduced): bundle model/data/run not bound to arm+seed — old R export accepted as F-s0, B-s0 as B-s1, C100-s0 as C100-s1. Non-blocking: hand-written verdict without `bundles` unlocks runner prerequisites (90); Guard G clean-subset rows dropped (85). Reviewer: 33 tests pass; 19 mutations, 17 caught (M8 membership check, M15 eval identity cross-check survived); runner dry probes all as specified (4th trajectory refused, lock holder untouched); all F1-F4/G/P3/P4 inequalities match the plan; trainer/verify/export do not write into data dirs. Evidence `$TASK/review-measure/`.
- Fix round sent to the measurement writer (+ runner repointed to protocol-v2/data-v2 with pinned hashes). F-s0 stays gated on the delta review.

### 2026-11-08 22:43 EET (clock observed) — measurement fix round + INCIDENT

- Time correction: headings "~22:45", "~23:05", "~23:15", "~23:25" above were coordinator estimates written without reading the clock; actual clock at this entry is 22:43 EET. Content unchanged.
- Fix candidate: measure.mjs `01859ab953a3`, test `415e00bd06d0` (38 checks, delegated), train_arm.sh `7ae48117c338` (F pinned to protocol-v2 `61524cc1...` and data-v2 manifest `d6250c70...`). Reported: arm/seed registry binding (F manifest arm/campaign/membership/protocol; B pin 2b102ef3; C100 train.jsonl pin e43be4a8; run complete.json seed/schedule/data; receipt weights sha = run weights), relabel tests (R as F-s0, B-s0 as B-s1, C100-s0 as C100-s1 rejected), M8/M15 tested, check-pass reloads bundles, Guard G rows attached.
- INCIDENT (writer-reported, coordinator verified): at 22:27-22:28 the writer's new test helper wrote into READ-ONLY parent data: `$OLD/data/B/train.jsonl`, `$OLD/data/B/trigger_inventory.json`, `$OLD/data/B.manifest.json`, `arms/data/C100/train.jsonl`. Writer restored them from byte-identical cache copies and a rebuild. Coordinator verification (observed): sha256 B.manifest `2b102ef3f901eb25...` (= pinned), B/train.jsonl `f0a539a06e8701c3` and trigger_inventory `6934fc58b035cc8d` (= B-s0 complete.json metadata), C100 train.jsonl `e43be4a8ee2d2233` (= C100-s1 complete.json metadata); `modernbert_next_data.py verify --protocol $OLD/protocol-v2/protocol.json --data $OLD/data/B` -> "verify ok: arm B ... 15 data files ... hashes match"; `find $OLD arms -newermt '2026-11-08 21:35'` lists only those 4 files (mtimes changed, content identical). R-s0/B-s0 score files unchanged (7224f289, f436c0b1). Test helpers now refuse writes outside their temp root. Delta review must check this guard.

### 2026-11-08 22:50 EET — measurement delta review APPROVE WITH CHANGES (no blocking) → F-s0 launch

- Delta review (delegated) on 01859ab9/415e00bd/train_arm 7ae48117: blocking relabel finding FIXED (real `evaluate` CLI refuses R as F-s0, B-s0 as B-s1, C100-s0 as C100-s1, v1 data, F data as B; exit 2, nothing written); 38 tests pass; 11 mutations all caught incl. incident guard (G1/G2: helper pointed at real paths -> refused, nothing written); protected parent files unchanged; `find $OLD arms -newermt 22:43:08` = 0 files. Remaining non-blocking (95): a hand-written pass record whose bundles omit `dir` passes check-pass (affects only B-s1/F-s1 prerequisites, later); sent to writer for fix (measure.mjs only; train_arm.sh frozen while F-s0 runs).
- BOTH SLICES APPROVED (data: APPROVE; measurement: no blocking). F round trip passed. Gate to F-s0 satisfied.
- F-s0 launch (trajectory 1 of 3): `STOP_AT="2026-11-09 03:00" $TASK/bin/train_arm.sh F 0` (runner 7ae48117). Finite deadline 2026-11-09 03:00 EET (historical B 1,960 s, R 2,830 s). Pre-launch: GPU 13 MiB, 46 C, no compute apps, no trainer/qwen/collection process; 23 GiB available. Shared flock waits, never kills.

### 2026-11-08 22:52 EET — F-s0 attempt 1 stopped by the trainer's hardware guard (observed)

- `train_arm.sh F 0` rc 3: overfit gate passed (350 updates); training stopped at update 200/14,640 after 39 s: `stopped.json` reason "hardware slowdown: clocks_event_reason_hw_slowdown,clocks_event_reason_hw_thermal_slowdown", GPU 75 C, checkpoint=true. Ledger row F-s0 written (data d6250c70, recipe unchanged).
- Disposition (plan: resource interruption permits identical recovery): wait for GPU to cool (≤50 C, no active slowdown reason), then rerun the identical command; runner resumes from `run/checkpoint.pt` as the same trajectory. No recipe/limit change.
- 23:03: GPU idles at 55 C (never reached 50 within 10 min; hardware slowdown reason inactive, 0x1 = idle). Relaunching identical command (attempt 2) at 55 C.
- 23:04 attempt 2 (identical command, resumed from checkpoint at update 200): overfit gate passed again; training past update 1,000 at 165 s, GPU 73-75 C with only sw_thermal_slowdown (not a stop condition). Running.

### 2026-11-08 ~23:10 EET — measurement second delta review: APPROVE (delegated)

- Final measurement candidate: `modernbert_forms_measure.mjs` `23d4cba2bf02`, test `8d5375a12c56` (38 checks, reviewer rerun), `train_arm.sh` `7ae48117c338`. Dir-less pass records now fail (CLI exit 1; confirmation path ok:false); 4/4 mutations caught; `find $OLD arms -newermt 23:02:44` = 0 files; incident files still match recorded hashes.
- Carried risk (<80): a doubly hand-forged record (fake `kind:'reused'` + forged applicability file) can pass reload; no tool path produces one. Not fixed.
- Applicability (coordinator ran `modernbert_forms_measure.mjs applicability`): B-s0 applicable (204 checks, 0 failed), `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/applicability/B-s0.json` 6da9750e; C100-s0-v2 applicable (C100 projected legacy THREADS=5 records noted), 7bb3fbc7. B-s0 evidence file (re-bound: contract code unchanged, fresh contract logs, old B round-trip log) `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/evidence/B-s0.json` via `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/bin/make_evidence.py`.

### 2026-11-08 23:48 EET — F-s0 trained + exported (trajectory 1 of 3; observed)

- Attempt 2 23:02:56-23:47:39, `train_arm F 0 rc=0`: ledger "identical trajectory: resume allowed"; overfit gate 0; training exit 0; `run/complete.json` complete=true, full_schedule=true, update 14,640/14,640, epoch 8, elapsed 2,580 s (cumulative), GPU UUID 905b..., peak allocated 3.995 GiB. (`run/stopped.json` is the stale attempt-1 record.) Seed check deferred to P4 verdict.
- Export `$TASK/F-s0/export/modernbert-F-s0`: exit 2 (torch vs node on 20 texts: act 20/20, classes 1036/1040, tags 1929/1932, cuts 18/20; near-tie differences, reported not a gate — same as B-s0/R-s0/C100).
- Ledger: 1 row (F-s0). Budget used: 1 of 3.
- Next: `evaluate --arm F --seed 0` (THREADS=2, heavy CPU collection; operational deadline 2026-11-09 03:00 EET, the evaluator writes resumable records).

## SEED-0 VERDICT: MEASURED MISS (2026-11-09 00:40 EET, observed) — campaign stops after root causes

- Evaluate: `modernbert_forms_measure.mjs evaluate --protocol $TASK/protocol-v2/protocol.json --arm F --seed 0 --model $TASK/F-s0/export/modernbert-F-s0 --train-data $TASK/data-v2/F --out $TASK/F-s0/bundle` rc 0 (23:48-00:35, THREADS=2, 0 failed messages), sealed.
- Root causes: `root_causes.mjs $TASK/F-s0/bundle/eval/score.truthful.json $TASK/data-v2/F ... --views=$OLD/views` rc 0.
- Verdict: `verdict --stage seed0 --bundle F-s0=$TASK/F-s0/bundle --bundle B-s0=$OLD/B-s0/eval --bundle C100-s0=$OLD/baseline/C100-s0-v2 --applicability ... --evidence F-s0=... B-s0=... --training F-s0=$TASK/F-s0 B-s0=$OLD/B-s0 --out $TASK/verdicts/seed0` rc 1, "stage seed0 pass false". Copy `reports/evidence/modernbert-forms/verdict-seed0.{json,md}`.
  - PASS: P3 (B-s0 Guard G vs C100-s0 + contract), contract:F-s0, P4 (F-s0 and B-s0 bindings and completion).
  - **F1 FAIL**: t1_clean gated cost F 59.90 vs B 56.87, diff +3.03 (bar ≥5), paired CI [-6.09, 11.74] (bar low >0); confidently wrong share F 0.0257 (29/1130 executed) vs B 0.0061 (5/825) — increased (bar F ≤ B); clean-create diff -3.45, CI [-23.08, 14.29] (bar low >0).
  - **F2 FAIL**: outline_create 15/80 = 0.1875 (bar .90); outline_set 67/80 = 0.8375 (bar .90); description_size 15/64 = 0.234 (bar .80). PASS: outline_question 1.00 (B 0/66), label_removal 1.00, bare_move 1.00, undo/redo 1.00 (exposure 13/28 shown).
  - **F3 FAIL**: lowercase_other_affected ungated right 0.675 vs B 0.742 (loss 6.67 points, bar ≤2); short3_lowercase 0.306 vs B 0.470 (loss 16.42, bar ≤2). PASS: all six Guard G rows vs B-s0 and vs C100-s0; label setting F 1.90 points ABOVE B (verdict value is B−F = −1.90; bar loss ≤2); gated empty-label-on-nonempty 0; lowercase confident mistakes ≤ +1/100.
- Per stop rules: no B-s1, no C100-s1 evaluation, no F-s1. Budget used: 1 of 3. Next: independent recompute of the failing numbers (tool-defect check) and root-cause analysis of the misses; then run-log append and final report.

### 2026-11-09 ~00:50 EET — independent verification of the miss (implementation-verifier Opus high, delegated): miss is REAL, no tool defect

- Reproduced exactly by two independent routes (own Python confidence/gate reimplementation; per-message tallies): t1_clean F 1101 right/29 wrong/1130 executed, cost 59.8966, risk 0.025664; B 820/5/825, 56.8685, 0.006061; clean create F 15/29 vs B 16/29 (-3.45). F2: outline_create F 15/80 (B 3, C100 1), outline_set 67/80 (B 26, C100 24), description_size 15/64 (B 3, C100 9). F3: lowercase_other_affected F 557/825 vs B 612/825; short3_lowercase F 41/134 vs B 63/134.
- Same inputs/denominators across F and B (ids, texts, gold, groups, folds, input sha); F records all from F export c6d554be, THREADS=2. F layout = B layout + two inserted values (outline `gold`, desc:size `huge`), equals data-v2/F/reader.json; right answers on both sides of the insertions rule out an index shift. F calibration threshold 0.87576 on the identical calibration view.
- What F gets wrong (verifier): outline_create 61 of 65 wrongs drop the outline (some copy the fill colour); description_size all 49 wrongs drop `size`; F training adds 57 outline-create, 59 outline-set, 35 description-size rows (labels sampled correct). Lowercase: original case F .905 vs B .904; lowercase F .675 vs B .742 — a real loss of lower-case robustness, not a view artefact.
- Not recomputed: grouped OOF threshold fit and paired intervals (each failing section also fails on a reproduced criterion). Evidence `$TASK/verify-seed0/`.

## FINAL STATE (2026-11-09, written 00:45-00:50 EET by clock; "~01:05" was an estimate): CAMPAIGN STOPPED on the measured seed-0 miss

- Root causes (worker Sonnet medium, delegated; `$TASK/F-s0/analysis/root_causes_seed0.{md,json}`, copy `reports/evidence/modernbert-forms/root-causes-F-s0.{md,json}`):
  - outline_create: act always right. 36 of 65 wrongs write the colour as the outline, 11 write another wrong value, 18 omit it. 74 F create rows carry an outline (57 from r2, none with outline = colour). Templates are covered (50/80 test messages match an r2 template: 8 right, 42 wrong). The held-out reserved r2 messages show the same failure (3/22). Place: model (class head).
  - description_size: counting questions 14/14 (B 3/14); commands on "the SIZE SHAPEs" 1/50, 44 wrongs drop the size. 35 r2 rows of the same form. Place: model.
  - outline_set: all 13 misses have gold green/orange/pink (61/61 other values right).
  - Lower case: 121 lost requests, 109 involve a name role (keys missing, wrong fill). r2 name spans are all capitalised, but the lower-case share of training names moved only 1.86% → 1.82%, so the data does not clearly explain it; one seed per arm cannot exclude a seed effect (inference).
  - t1_clean confident mistakes: F 29, all in the three failing forms (17 outline create, 7 outline set, 5 size dropped); B 5, all size dropped. F threshold 0.8758 vs B 0.9150; 19 of the 29 are above B's threshold.
  - The worker's own pairing gives 559 vs the scored 557 on lowercase_other. The verifier reconciled this exactly with truthful_v1 rules (structural holds of blocked units, text-key presence).
- Tool-defect check: none (independent verifier, above). The stop rule applies: no B-s1, no C100-s1 evaluation, no F-s1. Runs used: 1 of 3 (ledger `$TASK/budget/trajectories.tsv`: F-s0 only).
- Run log appended: `training/neural/MODERNBERT_RUNLOG.md` (new section "2026-11-09: modernbert-forms campaign"; earlier entries untouched).
- Quiescence (observed 01:0x): GPU 13 MiB, 43 C, no compute apps; no trainer/collection/measure process; `find $OLD arms -newermt '2026-11-08 22:30' -type f` = 0 files. Agents: all finished. Computer Use not used.
- Working tree: only additions are the owned files plus the run-log append (status diff vs `$TASK/start/status.txt`). No commit, push, deployment, publication or model-loader change.
- Final candidate hashes: see "Final identities" below.
- Gates: P1 pass, P2 pass, P3 (seed-0 B-s0) pass, P4 (F-s0, B-s0) pass; F1/F2/F3 FAIL; F4 not run (requires the seed-0 pass). Release gates (C23, D26-30) and D31 not performed; publication excluded.
- Carried risks (<80): a doubly forged pass record can pass reload; X1 is not mutation-tested; there are unguarded raw writes in the measure tests (they are guarded by construction); the `extra_dirs` manifest key lists the whole synth_short_r2 folder (no consumer on the measured path).
- Incident (recorded above): the measurement writer's test briefly overwrote 4 parent data files; restored byte-identical and verified.

### Final identities (observed sha256, 2026-11-09 00:49 EET)

- Owned source: `modernbert_forms_data.py` f1dc3ee21bdb, `modernbert_forms_measure.mjs` 23d4cba2bf02, `modernbert_forms_protocol.json` 8c10a064de52, `test_modernbert_forms_data.py` a07df41fdc33, `test_modernbert_forms_measure.mjs` 8d5375a12c56; task-owned `$TASK/bin/train_arm.sh` 7ae48117c338, `$TASK/bin/make_evidence.py` 5d6f0eb8399b.
- Final scoped tracked diff (`git diff --binary HEAD -- . ':!training/qwen'`): 2e0a607445e82cf173269494ed1a5f83c063efb2be447eb1d5d4888a651c2c88 (start 9972a6c4...; the only tracked change is the run-log append, MODERNBERT_RUNLOG.md 68f92b670e92).
- Data/protocol: `$TASK/protocol-v2/protocol.json` 61524cc13da0, F.ids 57a5242c11d4, `$TASK/data-v2/F.manifest.json` d6250c7082e3, F/train.jsonl bfdb92373d8e.
- F-s0: export artifacts_sha256 c6d554be58a8, run weights 95e9a5043620, bundle_seal d3af04565081, score.truthful dd707d38e549; verdict.json 00dfb69aaa2f; ledger 640edde84d11 (1 row).
- Reuse: applicability B-s0 6da9750ede07, C100-s0 7bb3fbc742a8; evidence B-s0 8d2d2bef233b, F-s0 cb45ad86c76c.

### Final-candidate test runs (coordinator ran, observed 00:47)

- `python3 -B training/neural/parity/test_modernbert_forms_data.py`: rc 0, "executed checks: 76", PASS (`$TASK/logs/final_test_data.log`).
- `node training/neural/parity/test_modernbert_forms_measure.mjs`: rc 0, "38 checks passed" (`$TASK/logs/final_test_measure.log`).
- After the runs, `find $OLD arms -newermt '2026-11-09 00:00' -type f` returns 0 files.

### Not reviewed

- `$TASK/bin/make_evidence.py` was written by the coordinator and never independently reviewed. It produced the contract (9-14) and oracle (19) evidence files that passed. The stage fails regardless.

### Gated outcomes (AGENTS.md reporting)

Each arm runs at its own threshold. Columns are right / wrong / extras / unread, out of all requested; the rest are asked.

| Population | F-s0 | B-s0 |
|---|---|---|
| t1_clean | 1101/29/0/0 of 1,354 | 820/5/0/15 |
| fresh2 clean | 350/3/1/12 of 639 | 318/2/2/15 |
| short3 clean | 89/5/1/40 of 330 | 78/4/1/29 |
| nl_a clean | 11/2/2/100 of 339 | 7/1/2/114 |

- Thresholds: F 0.8758, B 0.9150.
- Selection OOF AUROC: F 0.947, B 0.941.
- Seen/unseen trigger split of the misses is in `reports/evidence/modernbert-forms/root_causes-tool-F-s0.md`.
- P2 status: observed (fresh suites above + round trip + contract tests).
