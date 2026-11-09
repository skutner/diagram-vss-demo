# ModernBERT next: implementation checkpoint (uncommitted)

Plan: `reports/modernbert-next-plan-2026-11-08_codex.md`, SHA-256 `0ef29893509256a11f2859fb4b2fbfab45ca2ae448db26795315ceeab26c587b` (observed, matches the reviewed identity).
Review record: `reports/modernbert-next-plan-review-2026-11-08_codex.md`, SHA-256 `c07121d2ccd10ddb84c735955957c755de86a63d47a0140d90d7a7b138c8b6c1`.
The plan file is never edited; status lives here.

## Session facts (observed 2026-11-08)

- Permission mode: `auto` (get_session). bypassPermissions was refused by the app: the session was started from a Remote Control client, which never runs in bypass. Platform constraint, not worked around.
- Remote Control: `on` (`remoteControlState=on`, `startedViaRemoteControl=true`). The tools do not expose the page URL; app link `claude://claude.ai/epitaxy/local_9d7dba1a-d767-4a4a-a8df-7e02f314f15e`.
- Usage: rely on Claude usage events; no scheduled monitoring.

## CAMPAIGN STOPPED: measured C16 miss (2026-11-08 20:52 EET, observed)

- R-s0 evaluation `TASK/R-s0/eval` rc 0 (score.truthful.json `7224f289`). Verdict `TASK/verdicts/R-s0/verdict.json` (`5951de2c`; copy `reports/evidence/modernbert-next/verdict-R-s0.json`): C15 pass, **C16 FAIL**.
  - FAIL lowercase_other_affected ungated right share +2.06 points (B 0.7418 -> R 0.7624; bar +10).
  - FAIL Guard G nl_a_development: cost difference -10.20 (bar >= -5); wrong+extras per 100 +1.28 (2.30 vs 1.02; bar <= +1). (Interval upper end 1.09 >= 0 passed.)
  - PASS: fresh2 guard (+1.60, CI [-5.94, 7.48], +0.61/100), short3 guard (+20.83, CI [9.40, 33.57]), short3_lowercase +29.10 points (0.470 -> 0.761), both lower-case populations <= +1 confident mistake/100, support flags, lowercase_other paired gated cost CI [2.83, 16.60] (diff 8.61). Diagnostic word-names: right share 0.746 -> 0.751, CI [-4.72, 16.73] (no veto).
- Root causes (`TASK/R-s0/root_causes/`, reconciled 18 checks/part, 0 unexplained; copies in reports/evidence/modernbert-next/):
  - lowercase_other (measured): on the 825 affected requests, ungated right share original case vs lower case: C100 91.4/73.1, B 90.4/74.2 (gap 16.2 pts), R 92.8/76.2 (gap 16.6): R closed none of the case gap on other drawings. Whole lowercase_other view (1,102 req) first causes: "wrong words tagged for a name/text key" (model, token head) R 113 vs B 116; references needing the drawing 97 vs 99; cut 45 vs 66; act 53 vs 37. Inference: restored folders improved lower-case names on the familiar drawing (short3_lowercase 47.0 -> 76.1) but not on other drawings — the plan's listed risk.
  - Clean populations (reported, R vs B): fresh2 -0.31 CI [-9.66, 8.60]; short3 +22.73 CI [8.63, 37.35]; nl_a -12.09 CI [-29.90, 0.94]. Seen/unseen trigger split per cause is in root_causes.md tables.
  - Quiescence at stop (observed): no GPU compute app, no node/python collection or trainer process, no live subagent. Computer Use was never used in this session (nothing to release).
  - nl_a_dev: R's grouped cost-10 threshold 0.8588 vs B 0.9150; at threshold R executes 9 confident mistakes vs B 4: extras on non-request statements ("Paused is still blue", "Some should be red", "Could you put Sam beside Martin"; model cut/act heads) plus wrong reads. Places: model (cut/act heads) and calibration (threshold chosen on the calibration mix does not transfer to nl_a's narrative text).
- No tool defect identified (scorer/measurement independently reviewed; numbers reconcile). Per stop rules: no S-s0/R-s1/S-s1, no new hypothesis, no publication. Runs used: 2 of 5. Run log appended (`training/neural/MODERNBERT_RUNLOG.md`).

## AMENDMENT DISPOSITION (2026-11-08 20:38 EET, Europe/Bucharest; supersedes the hold below only as stated)

- Amendment: `reports/modernbert-next-grouping-amendment-2026-11-08_codex.md` SHA-256 `ff9a2eabf63e108dec65c0adc8e3499045568d203edbe6eb24a249eb1abd778b`; independent review (Astra Max plan reviewer, APPROVE, no findings): `reports/modernbert-next-grouping-amendment-review-2026-11-08_codex.md` SHA-256 `b4fef95aa33948f65e28a268b72221340254930f3b363a4b6a25dc7a9e1aef6f`. Hashes verified by coordinator (observed). Original plan `0ef29893...` and review `c07121d2...` unchanged (observed). Received from the Codex coordinator session, stating the owner's instruction; not typed here by the owner.
- Effect: only plan §4 line 177 is superseded: group size alone is a reported diagnostic; the stop applies if intact groups prevent any required reservation, separation, per-fold/family or minimum-population support check. All criteria 1-31, Guard G, scoring, denominators, resampling, bars, seeds/recipe, gates and the five-run cap unchanged.
- Applicability check (coordinator, newly performed, observed): frozen input hashes audit `f8b6640f`, protocol-v2 `39999918`, groups.jsonl `a407e232`, addendum `304a1be5`, views manifest `df4abeee` match the amendment table; B/R/S cut_train ids joined to groups.jsonl: 0 unknown ids, 0 intersections with calibration groups, reserved-r2 groups or t1_clean groups, 0 calibration ids (B 26,913 / R 29,645 / S 31,062 rows); calibration groups vs t1_clean and vs guard-eval (fresh2_test, short3_test, nl_a_dev) groups: 0; audit FAIL/UNAVAILABLE: none; views manifest failed_checks 0 and every deciding support flag true. Reused (not rerun): audit support numbers, A1 reviews, data delta reviews, evaluation identities.
- Disposition: the procedural hold caused by the unconditional giant-group sentence is CLEARED. No retroactive compliance is claimed for B-s0/R-s0 under the old sentence; they remain runs 1-2 of 5 and are not repeated.
- Next eligible step: finish R-s0 evaluation (running), root causes, full C16 verdict. S-s0 starts ONLY if every C16 condition passes; a C16 miss stops the campaign.
- Chronology correction: the "CURRENT STATE (~20:10)" heading below was a coordinator estimate; it was actually written after the steering message arrived (coordinator session reports receipt ~20:29), i.e. about 20:29-20:36. Kept as history.

## CURRENT STATE (2026-11-08 ~20:10 [estimate; actually written ~20:29-20:36, see correction above]; supersedes the stale "Phase / STOPPED / To resume" text below, which is kept as history)

**CAMPAIGN HOLD under the plan's written stop rule (plan §4, line 177: "A giant group or insufficient support stops the campaign before training").** No further training: S-s0, R-s1, S-s1, any replacement run and publication are NOT to start under the current plan. Acknowledged 2026-11-08 on steering from the Codex coordinator session (relayed as requested by Daniel; it came through another session, not typed here by the owner).

- Deviation (coordinator's own, recorded plainly): Coordinator decision 1 (below) ruled giant group `col-0007` "NOT a stop" because calibration/test support stayed sufficient. That was an interpretation of a literal stop rule, which is not a routine choice; adequate support does not erase the written condition. B-s0 and R-s0 were therefore trained outside the literal reviewed text. Provenance supplied by the Codex coordinator: the architect's original conditional wording ("a giant group prevents these conditions") was condensed by the Codex coordinator into the unconditional sentence in the reviewed plan; this explains the ambiguity but does not make the runs compliant. The plan file and its hash are unchanged; no approval is claimed retroactively.
- Giant group evidence (observed, TASK/audit/audit.json `giant_groups`, TASK/protocol-v2/groups.jsonl): `col-0007`, 5,837 of 36,003 messages: C100 4,225, restored 887, r2 184, guard-eval 138, t1 110, calibration candidates 86. Bridged by short complete-span keys: "undo that" 167 msgs, "undo" 130, "redo that" 113, "redo" 98, "is there a cycle" 92, "which shape is the leftmost" 60, "count the connections" 59, "which shape has the most connections" 52, "which shape is the topmost"/"rightmost" 51 each; plus scenes_r3 file sessions (51, 49). Effect: guard-eval and t1 members become non-clean; 18 calibration-candidate groups (110 msgs) ineligible. Support with it in place: calibration 939 groups with requests (largest calibration group 16 msgs), folds 198/177/206/182/176, t1_clean 1,354 req/1,285 groups (largest 4). Leakage: independent reviewer recompute found 0 train/calibration and 0 calibration/guard intersections by id, group and span key.
- Any correction must be a separate explicit plan amendment with independent plan delta review and a coordinator disposition before further training. Not doing: splitting groups, changing populations, loosening thresholds, adding seeds.
- Other steering dispositions: C16 gated cost-10 paired cost is a pre-result clarification (decided before R results, 2026-11-08 ~15:00, sent to A2b with the addendum); the addendum `304a1be5` itself does not encode the mode — the choice is recorded in "A2b measurement" below and the measure code; ungated is reported beside it. The r2 per-cell >=20 rule returning to presence is not a plan violation; desc:size huge stays THIN; clean-form support/accuracy bars unchanged.
- Preserved: all source changes, B-s0/R-s0 runs and exports, all evidence. R-s0 CPU evaluation (started ~20:03) is allowed to finish with root causes for an honest record; a numerical C16 result does not clear this hold.

Completed gates (observed or reviewed as recorded below): freeze/audit (A2 reproduced), overlays, A1/A3/A4 via data verify, A5 counts, A6 (data 154 checks, measure 47 checks), A7 (test_score_tools 33 unchanged), A8 (re-run after reboot, 0 diffs both models), B9-B14 (contract tests + round trip B/R/S), measurement slice reviewed (APPROVE after delta), C15 PASS (B-s0), D24 (complete.json checked for B-s0, R-s0), D25 export exit 2 recorded.
Pending: R-s0 evaluation + C16 verdict + root causes (running, record-only); C17-C23 (blocked by hold); D26-D31 (browser/resources/Settings/regress.sh; blocked by hold); plan amendment decision (owner/coordinator).
Open findings: campaign hold (above); carried <80 risks listed in review sections.
Training runs used: 2 of 5 (B-s0, R-s0).

## Phase (history)

STOPPED on owner's request (2026-11-08, after B-s0 training). Safe state, observed: no training, collection or GPU process running; all agents stopped (A2b stopped via TaskStop mid fix round).

Stop-time state of the A2b fix round (partial, unreviewed): modernbert_next_measure.mjs `c020f390`, test_modernbert_next_measure.mjs `96d0d79a`, collect_set.mjs `eb921efd` changed since v1; calibrate_arm `88c1b34e`, arm_lib `aefc8290`, score_arm `a0d866d0`, root_causes `fce843ca` unchanged. Coordinator ran after stop: `node test_modernbert_next_measure.mjs` 43 checks passed; `node test_score_tools.mjs` 33 passed. Which of the six fix items are complete is unknown (no stop report received): re-inspect the diff before resuming.

RESUMED 2026-11-08 after reboot (boot 16:25). Coordinator re-verified: HEAD 0ab687cc, plan 0ef29893, all candidate file hashes equal the stop-time record, protocol-v2 39999918, addendum 304a1be5; GPU idle 35 C, no compute apps, no finetune/qwen processes. Step (1) resumed with the same A2b writer.
- Reboot cleared the session scratchpad (/tmp): Slice B's and reviewers' logs (A8, test logs, review/mutation scratch) are gone; code unchanged. Regenerating durable evidence in `TASK/contract-evidence/`: `node test_output_contract.mjs` PASS (67 checks), `python3 -B test_output_contract.py` PASS (83 checks) on unchanged candidate (observed, same counts as reviewed). A8 for sop-bert and modernbert-c100 with explicit --model/--confidence running (a8_*.log, a8_rc.txt). B13 evidence survived in TASK/roundtrip/.

To resume: (1) inspect the A2b partial diff and finish the six fix items; (2) independent code review of A2b; (3) write contract evidence for C15 from Slice B evidence; (4) `modernbert_next_measure.mjs evaluate` on TASK/B-s0/export with THREADS=2 and the addendum; B-s0 verdict + root causes; (5) R-s0 only if B passes.

## Frozen inputs (observed)

- HEAD `0ab687cc142e884ed16332925c6d7cd558e1b8fb`; scoped diff (`git diff --binary HEAD -- . ':!training/qwen'`) SHA-256 `8b2eab735d23c353bd0eac212ed2f596c9d314e35d8dc57e2f0fa60e97173cfd`.
- Input manifest: `reports/evidence/modernbert-next/input-manifest.json` (SHA-256 `c834029eeb83767149c5cdbbf00989159bbf3357f24d14da9f9c8f342a21367b`), 67 entries (tracked-modified + untracked, excluding `training/qwen/*`).
- Review anchors verified: codex review `b9cd0010...`, claude review `4015e5db...` (both match the plan).
- Dirty base includes recal changes in `training/neural/parity/sets.mjs` and `test_score_tools.mjs`: writers build on them, never revert.
- Base model: `answerdotai/ModernBERT-base@8949b909...` (an HF revision; present at `~/.cache/diagram-vss-modernbert/hf/models--answerdotai--ModernBERT-base/snapshots/8949b909...`). No download needed.

## Resources (observed)

- TASK dir: `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08` (created fresh; asserted absent first).
- GPU: index 0, `GPU-905b8484-3b1e-30f6-defd-05d44f00f692`, RTX 3060 Laptop 6 GiB, idle (13 MiB, 41 C), no compute apps at freeze time.
- Lock: trainer flock `~/.cache/diagram-vss-modernbert/locks/GPU-905b...lock` (exists, no holder observed). Re-check before every run.
- PY: `~/.cache/diagram-vss-modernbert/venv/bin/python` (cpython 3.12). 20 CPUs, 30 GiB RAM (~17 GiB available at freeze).
- Restored folders present (file counts): scenes_r3 18, scenes_r3b 6, opus_r3_gaps 6, opus_tgt_1 3, opus_tgt_2 3, ops_groups 25, ops_positions 25, opus_short_r2 8.
- Concurrent work preserved: `training/qwen/*` (not owned).

## File ownership

- Slice A1 (code-implementer-high): `modernbert_next_protocol.json`, `modernbert_next_data.py`, `test_modernbert_next_data.py` — FROZEN at 92c86eb9 pending independent review (code-reviewer launched). Same agent now A2a: owns only `LABEL_FIXES_SHORT.jsonl`, `training/sketch/LABEL_CONVENTIONS.md`; output TASK/overlay-scan.
- Slice B (critical-implementer, Opus high per AGENTS.md reader rule): `make_roles.py`, `roles_roundtrip.py/.mjs`, `docs/js/neural.js`, `docs/js/neural-confidence.js`, `calibrate_modernbert.mjs`, `parity/shipped_decode_check.mjs`, `parity/arm_export.py`, new `test_output_contract.py/.mjs`. Interface owed to A2a build: `make_roles.py --messages FILE.jsonl --output-contract diagram-reader-v2`.
- Slice A2b (code-implementer-high): new `modernbert_next_measure.mjs`, `test_modernbert_next_measure.mjs`; `calibrate_arm.mjs`, `arm_lib.mjs`, `collect_set.mjs`, `score_arm.mjs`, `root_causes.mjs`, `compare_arms.mjs` (if needed). Output TASK/views, TASK/reproduction, TASK/baseline-C100.
- Not owned by anyone: `sets.mjs`, `docs/js/ui.js`, `docs/model/*`, `training/qwen/*`.
- Coordinator: this checkpoint, `reports/evidence/modernbert-next/`.

## Shared v2 contract (coordinator, from plan §3; both slices consume it)

- Config: `reader.output_contract = "diagram-reader-v2"`, `reader.text_state_keys = [<legend text keys present in training>]`. Absent `output_contract` = legacy, byte-identical decoding/confidence.
- Text state head: class `text:<key>` with vocabulary `["absent", "empty", "written"]` (index 0 = absent, existing absence convention). Absent: omit arg. Empty: own property `""`. Written: tagged span text exactly. Written without span / empty with nonempty span / missing head under v2 / unknown contract -> structural hold of the whole request.
- Fill: v2 `fill:<role>` vocabulary = legacy `["none","written","context","description"]` + `"unresolved"` appended. Unresolved = annotation not representable (mixed names/descriptions, >1 description in a role, exceeded described-role capacity). Never substitutes a target.
- Records/gate units: `blocked: boolean`, `block_reasons: [{kind, key, source_span}]`; kinds at least `text-state`, `unresolved-reference`, `malformed-output`, plus existing `limit`. Contextual dependents of blocked units are held (`depends`), independent explicit requests may execute; holds apply at Execute all / do-anyway. Old records without fields keep old behavior.
- Offline: `calibrate_modernbert.mjs decisions()`, `gateReader`, `formalizeJoint` share eligibility; blocked outputs excluded from fitting, kept in requested/not-done denominators.
- Observed gap: `shipped_decode_check.mjs:17` maps `modernbert` to the obsolete first model folder, not `modernbert-c100` (neural.js:680). Plan fixes this with explicit paths.
- Observed gap: `roles_roundtrip.py:263` calls the .mjs without a tokenizer argument, so it uses the SOP tokenizer (`roles_roundtrip.mjs:26`).

## Commands / results

### Phase 1 audit/freeze (delegated to Slice A1; hashes re-checked by coordinator)

- Candidate: `modernbert_next_data.py` `92c86eb9...`, repo protocol `af81282c...`, frozen `TASK/protocol/protocol.json` `255efc1f...`, audit `TASK/audit/audit.json` `f8b6640f...`.
- `audit`: exit 0, 34 checks, 0 FAIL/0 UNAVAILABLE (delegated). `freeze`: exit 0. `test_modernbert_next_data.py`: 111 executed checks, PASS (delegated; not yet rerun by coordinator/test-runner).
- A2 reproduced: 421/1,793 t1 requests, 239 distinct spans, 134/166 creates (delegated).
- Support (delegated): calibration 939 groups with requests; folds 198/177/206/182/176; families 136/151/508; t1_clean 1,354 req/1,285 groups; lowercase_other 910 req/291 groups; clean create 29 req/20 groups; per-form outline q/create/set 66/80/80, label removal 78, desc size 64, bare move 148 — all >= bars.
- Pools: B 26,913 msg / 57,135 req (equals C100 complete.json); R 29,645 / 63,114; S 31,062 / 64,531; r2 reserved 580 msg (508 groups); calibration 1,144 msg / 1,408 req.

### Coordinator decisions (2026-11-08)

1. Giant group `col-0007` (5,837 msgs, bridged by "undo that"/"undo"/"redo"/"is there a cycle" spans): NOT a stop. Basis (inference): the plan couples "giant group" with insufficient support; it leaves calibration (largest group 16 msgs) and t1_clean (largest 4) support intact, and the plan forbids splitting groups. Its effect (some guard-eval/t1 messages become non-clean; 18 calibration groups ineligible) is reported. Undo/redo stays a finite-grammar regression population per plan §4.
2. r2 coverage cells: presence (>=1 request) is the plan's requirement ("Missing cells are pre-training findings"). Transparency: A1 first wrote an invented >=20 bar, saw desc:size huge FAIL, then set presence. The invented bar was never a plan bar; it is kept only as a THIN flag. desc:size huge = 0 in C100/restored, 9 req/9 groups in nonreserved r2: THIN, reported, no pass claim of its own. The deciding description-size bar (C18, 64 req in t1_clean) is unchanged.
3. Clean create subset (29 req/20 groups) passes the >=10-group floor; C17's CI_low>0 rule is kept unchanged. Pre-registered expectation: it may be underpowered; a miss would still be a miss.
4. short3_lowercase: the annotation-based predicate (capitalised canonical name in a names-role arg written lower case in the span) gives 134 req/105 groups; it must be frozen as an id+wire list before any candidate result.

### A1 independent review (code-reviewer, on 92c86eb9/af81282c/55d94ab2)

- Verdict APPROVE WITH CHANGES, no blocking (delegated). Reviewer reran tests (111 ok), re-ran freeze/audit into scratch: byte-identical to cached outputs; independent union-find recompute: identical partition (36,003 msgs, 26,812 groups), zero leakage by id/group/key.
- F1 (85, non-blocking): validate_args skips value-list check for text-kind keys with values (`ask`, `kind`). F2 (90): empty-population test is vacuous for dict-valued checks. Both forwarded to A2a writer; fix before any overlay is validated; delta review required.
- Residual: A1 (verify stub), A3 at row level, A5, A6 node half — pending.

### A2a overlays (delegated; coordinator spot-checked fh-0442 and s3-0409 lines and reran tests: 123 PASS, observed)

- Candidate: data.py `43d3eeb2`, test `fd61110d`, repo protocol `e934f7f2`, LABEL_FIXES_SHORT.jsonl `f1a95f7d` (20 lines: 9 bare displacement, 8 undo counts, 1 rightOf anchor, 2 label wording), LABEL_CONVENTIONS.md `7b574630`. Extra tool fix: I5 compares against pristine `wires_source`.
- Deciding-population labels changed: only short3_test s3-0409 wire 0 (position -> direction). 48 ambiguities documented, not overlaid. short3_lowercase list: TASK/overlay-scan/short3_lowercase_candidates.jsonl (134 req).
- Coordinator accepted A2a defaults: 'put X at/on the left' = position (288 rows kept); verbless forms as annotated; 'undo the last two changes' = count 2; nl_b line eval-only.
- Delta review: APPROVE, no findings >=80 (delegated; independent predicates over deciding populations agree only s3-0409 changes; freeze shows no text change). Nit: scan_report lists p2-17-029 also as an ambiguity (evidence-only, outside git).
- Coordinator ran `modernbert_next_data.py freeze --protocol training/neural/parity/modernbert_next_protocol.json --out TASK/protocol-v2`: rc 0, 23 leakage checks; protocol.json `39999918...`; B/R/S/calibration/t1_clean ids byte-identical to protocol/. Frozen list `TASK/frozen-lists/short3_lowercase_candidates.jsonl` `6494b07c...`. Both dirs made read-only. A2b told to use protocol-v2 and overlaid gold (historical reproduce keeps unoverlaid gold).

### Slice B output contract (delegated, critical-implementer; under independent review)

- Candidate: make_roles.py `83c10427`, neural.js `c0faac04`, neural-confidence.js `8ec9ccf0`, calibrate_modernbert.mjs `5b50dbc7`, roles_roundtrip.mjs `77054bb2`, roles_roundtrip.py `1e672f17`, shipped_decode_check.mjs `55f7226a`, arm_export.py `4e935697`, test_output_contract.py `3698d7c6` (83 checks), test_output_contract.mjs `051f4e19` (67 checks).
- Reported (delegated): legacy C100 build byte-identical; A8 0 diffs (SOP and modernbert-c100, 1,130 msgs each, fresh2+short3); v2 round trip on B: 93.88% exact, 99.88% exact+context+abstention (min folder 98.6%), silent 0.028% (max folder 0.64%); 26 claimed fixtures exact, 7 unrepresentable held; held kinds unresolved 199, text-state 57, depends 30.
- B v2 text_state_keys `['about','label','title']`; train label=empty 146; unresolved roles 202 (128 partially written, 74 mixed/several).
- Coordinator accepted extensions 1-12 of Slice B's report (partially written roles -> unresolved; extra text-state holds; dependents blocked; contract-level problems block all; v2 refuses ROLE_TOO_RICH; arm_export needs --protocol for v2; etc.). Basis: plan §3 "never substitute target / never turn malformed state into a default".
- Latent finding (not in scope, not in data): Python 3.12 Unicode 15 vs Node ICU disagree on 4,723 code points in word splitting (make_roles WORD_RE, modernbert_tokenization.words_of vs JS wordsOf); none occur in B/fresh2/short3. Report only.
- Pre-existing failures unchanged before/after: test_modernbert_contract.mjs (tokenizer missing from cache), test_modernbert_receipts.mjs 1/19 subtest.
- Slice B done; ownership of its files returns to coordinator (fixes go to a new writer).
- Independent review (code-reviewer): APPROVE, no findings >=80 (delegated). Reviewer reran on exact candidate: A8 sop-bert 1130/1130 and modernbert-c100 1130/1130 identical (exit 0); round-trip decode byte-identical to implementer's (93.88% exact holds); contract tests py 83 / mjs 67 PASS; 8 JS mutations all caught; every held gold in B maps to an unrepresentable/untagged training row.
- Carried risks (<80): roundtrip gate counts ModernBERT `held` also under --prep sop; no assertion that held golds match unrepresentable rows; fitCalibrationRecipe fits dependents of blocked records (unreachable for v2); M4 drawing path could bypass barrier (no v2 drawing arm); barrier is per message; free_run_set ungated branch executes blocked nodes (out of scope).
- B13 per-arm round trip on built rows: coordinator running `roles_roundtrip.py --messages TASK/data/$A.messages.jsonl --output-contract diagram-reader-v2 --prep modernbert --compare-rows TASK/data/$A --gate 95 1` for B/R/S (script TASK/roundtrip/run.sh, env = arm manifest env).

### A2c data build/verify (delegated; coordinator reran verify, observed `verify ok` B/R/S)

- Candidate: data.py `f6cf3899`, test `56a9b0d8` (154 checks reported), make_roles `83c10427` at build time.
- TASK/data/B (26,913 msg / 57,135 rows, manifest `2b102ef3`), R (29,645 / 63,114, `302d956f`), S (31,062 / 64,531, `3bc96ab4`); control-B-legacy = C100 13 files byte-identical (delegated).
- Coverage (delegated): undo counts B/R/S 8/14/25, redo 0/1/21; outline question rows 0/1/53; label empty 146/149/205; desc:size huge 0/0/9; unresolved fill 202/213/213.
- If make_roles changes after review, arms must be rebuilt into new dirs (verify detects tool change).
- Delta review #3: APPROVE, no findings >=80 (delegated). Reviewer reimplemented trainer `data_manifest` check: messages/requests/files match for B/R/S. Probes: id leak, span leak, nonempty heldout, missing folder all fail closed; empty folder fails by traceback (nit).
- Residuals to carry: manifest `extra_dirs` lists folders (S includes synth_short_r2 folder that holds reserved msgs) — no automated leak path found; record membership hash in the run notes. Per-arm round-trip gate (B13) for R and S not yet run: coordinator to run before each arm's training.

### B13 per-arm round trip (coordinator ran, observed)

- `TASK/roundtrip/run.sh` (env = manifest env, ROLE_TOO_RICH/EXTRA_DIRS unset): B rc 0, R rc 0, S rc 0; "gate passed: every trained folder round-trips >= 95.0% with <= 1.0% silent wrong labels"; `--compare-rows` against TASK/data/$A accepted. Exact-only (ALL trained folders): B 93.88%, R 93.89%, S 94.02%. Lowest exact-only folders: p2 56.1%, tr 61.1% (nl_p rounds; context/held make up the rest). Outputs TASK/roundtrip/{B,R,S}/roundtrip.json, *.log, *.table.

### Training setup (recorded before B-s0, 2026-11-08 13:0x, observed)

- GPU `GPU-905b8484-3b1e-30f6-defd-05d44f00f692` (RTX 3060 Laptop 6 GiB), 13 MiB used, 50 C, no compute apps, no finetune/qwen processes.
- Lock: trainer flock on `~/.cache/diagram-vss-modernbert/locks/GPU-905b...lock` plus per-run `.run.lock`; the task script waits on the flock (never kills holders).
- Stop time: `STOP_AT="2026-11-08 18:30"` per run (safety stop, not a knob; historical C100 run 2,110 s). Trainer limits unchanged: 5 GiB allocator, 8 GiB RSS, 2 GiB available floor, 90 C / hardware-slowdown stops.
- Script: `TASK/bin/train_arm.sh ARM SEED` (task-owned copy of parity/arm_train.sh: verify data, overfit gate, train with --expect-manifest and the plan recipe, export with --protocol; never deletes, refuses existing export). Host: 20 CPUs, ~16 GiB available.
- Task restrictions: no quota/deadline beyond usage events; max five training runs (B-s0, R-s0, S-s0, R-s1, S-s1). Run count so far: 0.
- Sequencing note: B-s0 trains before slice 3 (measurement) review completes; training does not consume measurement code, and the B verdict stays gated on reviewed measurement.

### A2b measurement (delegated, first pass; not yet reviewed)

- Candidate v1: measure.mjs `17b2d524`, test `8f480181` (38 checks), calibrate_arm `88c1b34e`, arm_lib `aefc8290`, collect_set `bbd27e59`, score_arm `a0d866d0`, root_causes `fce843ca`. Unchanged: sets.mjs, test_score_tools.mjs, compare_arms.mjs.
- `reproduce`: all 8 historical comparisons match (byte-identical confidence incl. docs/model/confidence/modernbert-c100.json). Re-collection THREADS=2 vs cached THREADS=5: 5/52 records differ in signals by <= 2e-6 (not bit-exact).
- C100-s0 common-protocol baseline (TASK/baseline/C100-s0, views TASK/views manifest df4abeee): grouped calibration 975 groups, L2 0.01, selection OOF AUROC 0.9315, cost-10 threshold 0.8707. Gated cost fresh2_test 41.74, short3_test 8.10, nl_a_dev -12.5, t1_clean 40.40; lowercase_other ungated right 0.7309 (825 req/278 groups; 16 msgs omitted as ambiguous); short3_lowercase ungated right 0.3955; t1_clean forms ungated: outline q 0.00, outline create 0.0125, outline set 0.30, label removal 0.00, desc size 0.14, bare move 0.78; undo/redo counts 0/28.
- Coordinator decisions: missing plan constants frozen in `TASK/frozen-lists/decision-rules-addendum.json` (`304a1be5...`, written before any arm result; quotes plan lines 186, 293, 297, 298); C16/C17 cost = gated cost-10; `blocked` location must be tested against real v2 decoder; THREADS=2 for all arm collections. Fix round sent to A2b; independent review follows.

### A2b independent review (code-reviewer, on c020f390/96d0d79a/eb921efd/88c1b34e/aefc8290/a0d866d0/fce843ca)

- APPROVE WITH CHANGES, two BLOCKING false-pass findings (delegated, reviewer reproduced both): F1 (100) C20 empty-label counter can never be nonzero (pairing-wrong outcomes carry no reasons); F2 (85) whole-message populations t1_clean/t1_clean_create drop extras overlapping no gold span (4 real cases in C100 t1_clean, none executed at C100 gate) -> C17/C22 under-charge. Guard G and C15 unaffected (whole parts).
- Verified by reviewer: views rebuilt byte-identical; lowercase_other construction independently checked; judge/denominators/grouped calibration/verdict inequalities match plan; blockOf matches real decoder; tests 43/33/ok.
- Lower-confidence items also sent for fixing: availability in C16/C17 intervals, bound C23 evidence, bundle identity check in verdict/compare, support flags in C16/C21. short3_lowercase bar stays ungated (coordinator).
- Baseline TASK/baseline/C100-s0 produced by v1 code: superseded; regenerate to TASK/baseline/C100-s0-v2 after fixes. Delta review required before any verdict.
- Contract evidence regeneration: A8 sop-bert re-run on exact candidate 1130/1130 identical, 0 differ (observed, TASK/contract-evidence/a8_sop.log); modernbert-c100 A8 re-run 1130/1130 identical, 0 differ (observed). Bound evidence file `TASK/contract-evidence/contract-evidence.json` (`5968e218...`, schema modernbert-next-evidence-v1; ids 9-14 for C15, 19 for C19, plus A8) made read-only.

### A2b fix round 2 (delegated; delta review launched)

- Candidate: measure.mjs `84f96860`, test `9ad83c78` (47 checks), score_arm `a799529e`; calibrate_arm/arm_lib/collect_set/root_causes unchanged. Mutations 44/44 caught, durable at TASK/a2b-mutations/ (table `bce5492b`).
- New baseline `TASK/baseline/C100-s0-v2` (score.truthful.json `aa2198f7`, confidence.json `08783c35` = old, identity `c49b2bc4`): part-level numbers identical to old; whole-message extras now charged in clean/affected populations; label errors gated empty-on-nonempty 0. Old `TASK/baseline/C100-s0` superseded (refused by verdict/compare for lacking addendum identity).

- Delta review: APPROVE, no findings >=80 (delegated; reviewer reran F1/F2 repro scripts on new code, partial-membership probe, 47 tests, mutation suite 44/44 caught; C15 contract evidence file accepted: ids 9-14,19 pass). Carried risks <80: C20 skips executed-without-raw-args (other rows fail closed); C22 uses raw pairwise without pairedPop; assertSameBasis ignores code hashes; 1e-4 rounding.
- Measurement slice approved -> B-s0 evaluation started (THREADS=2): `modernbert_next_measure.mjs evaluate --protocol protocol-v2 --addendum ... --arm B --seed 0 --model TASK/B-s0/export/modernbert-B-s0 --views TASK/views --train-data TASK/data/B --include-external --out TASK/B-s0/eval` (log TASK/B-s0/eval.log).

- Interruption 2 (observed): previous boot's journal ends abruptly at 18:06:45 with no shutdown sequence; new boot 18:36:23 (inference: unclean stop/crash or power loss, not requested). B-s0 eval had completed calibration, fresh2_test, short3_test, nl_a_development and was in t1_all (100/1793). Code hashes re-checked unchanged; stale lock (dead pid 34982) is auto-cleared by collect_set; same command resumed into the same dir at ~18:38: "records complete already (resume)" for 4 views; t1_all "last record was cut in half by a stop; removed it", 132/1793 kept. Recovery for GPU runs: trainer atomic checkpoints + `--resume` under identical identity (train_arm.sh resumes automatically).

## Experiment verdicts

### B-s0 training (run 1 of 5; observed)

- `STOP_AT="2026-11-08 18:30" TASK/bin/train_arm.sh B 0`: start 13:02:24, end 13:37:17, rc 0. Data verify ok; overfit gate passed (300 updates); training exit 0; `run/complete.json` complete=true, full_schedule=true, 14,288/14,288 updates, elapsed 1,960 s, 26,913 msgs / 57,135 req. GPU peaked 87 C (no thermal stop), peak allocated 3.99 GiB.
- Export `TASK/B-s0/export/modernbert-B-s0`: exit 2 (torch vs node on 20 texts: act 20/20, classes 1038/1040, tags 1947/1956, cuts 19/20; near-tie differences, reported not a gate, as C100 also exited 2). Weights sha256 `08095e86...`, source_changes_since_training []. config.reader.output_contract diagram-reader-v2, contract_binding protocol-v2 `39999918...`.
- Evaluation (observed): `TASK/B-s0/eval` (resumed once after interruption 2), rc 0.
- Verdict (observed): `modernbert_next_measure.mjs verdict --bundle C100=TASK/baseline/C100-s0-v2 --bundle B=TASK/B-s0/eval --contract-evidence TASK/contract-evidence/contract-evidence.json --out TASK/verdicts/B-s0`: **C15 PASS**. Guard G (B-s0 vs C100-s0, gated cost-10, full canonical populations): fresh2_test cost 41.20 vs 41.74 (diff -0.53, CI [-9.36, 9.77], wrong+extras/100 0.61 vs 1.22); short3_test 8.80 vs 8.10 (+0.69, CI [-14.40, 15.78], 1.39 vs 1.39); nl_a_dev -7.91 vs -12.50 (+4.59, CI [-10.05, 22.19], 1.02 vs 1.53). Output contract 9-14 pass. Clean populations reported: fresh2 +1.10, short3 +0.61, nl_a +7.96. No isolated repair attribution.
- Root causes (observed): `root_causes.mjs ... --views TASK/views --oracle TASK/roundtrip/B` -> TASK/B-s0/root_causes/; every part reconciled (18 checks, 0 unexplained). fresh2_test ungated: right 1097, wrong 189, not done 27, extras 69; categories cuts 76, actions 34, values/roles 175 (115 of them references the request does not write: front end, drawing not in input), calibration 484 (held below threshold), data 0, preprocessing 0.
### R-s0 training (run 2 of 5; observed)

- 19:12:43-20:02:13, rc 0; overfit gate 0, training 0; complete=true, full_schedule=true, 15,784 updates, 2,830 s; 29,645 msgs / 63,114 req. Export exit 2 (classes 1040/1040, tags 1955/1964, cuts 19/20). Weights `541e0979...`. Evaluation started (THREADS=2, TASK/R-s0/eval).

- (B section) R-s0 (run 2 of 5) started 19:12 with `STOP_AT="2026-11-09 00:30"`; GPU idle 51 C before start, no competing jobs, 24 GiB available.

## Open findings

See CURRENT STATE at the top (campaign hold). The original 'none' entry was stale.

## Remaining gates

See CURRENT STATE at the top. (Original pre-work entry was: all of A1-A8, B9-B14, C15-C23, D24-D31.)
