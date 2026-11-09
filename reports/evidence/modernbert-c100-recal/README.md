# Evidence: refit of ModernBERT C100's confidence with short commands (2026-11-07 / 2026-11-08)

Plan `training/neural/MODERNBERT_RECAL_PLAN.md`. Result: **Miss on bar G3; nothing published** (`docs/model/confidence/modernbert-c100.json` unchanged).
Run log entry: `training/neural/MODERNBERT_RUNLOG.md`, "Refit of C100's confidence with short commands". Records and scores stay in
`~/.cache/diagram-vss-modernbert/arms/C100-s0/recal/` (`C=~/.cache/diagram-vss-modernbert/arms/C100-s0`, `EV=$C/recal`); logs are in `logs/`.
All commands from the repository root. Exit codes are those of the run (every one 0 unless said).

| step | command | check |
|---|---|---|
| S0 | `node training/neural/parity/test_score_tools.mjs` (before any edit) | 31 checks passed (`logs/s0_baseline.log`) |
| S1 | `gen_short_r2.py --seed 1 --n 2400 --id-prefix st1`; `dedup_against.py ... --against synth_short_r2 train.jsonl cut_train.jsonl nl_a/{opus,gpt} nl_b/{opus,gpt}` (2,400 -> 1,830); `check_file.py --mode rules` (-> 1,793); `size_gate.py --min-total 1500 --min-form create:120` | gate met: 1,793 and 166 (`s1_size_gate.json`, `s1_dedup_report.json`, `logs/s1_*`); `python3 training/sketch/synth/test_dedup_against.py`: 8 tests OK |
| S2 | `READER=rules node .../collect_set.mjs --train-data $C/../data/C100 --allow-text-overlap $EV/rules_ss.jsonl short_synth synth_short_t1`; `node .../score_arm.mjs none $EV/rules_ss.score.json $EV/rules_ss.jsonl` | every request right: 679 + 1,318 + 1,793 of the same (`rules_ss.score.json`); `test_score_tools.mjs` 33 checks |
| S3 | `node training/neural/parity/test_compare_fits.mjs` | 11 checks passed; 7 of 8 deliberate mutations of the bar rules caught (the 8th, in the verdict, changes nothing) |
| S4 | `node .../calibrate_arm.mjs --cal fresh2,short3,nl_a $EV/ctrl.confidence.json $EV/ctrl.calibration.json $C/eval/rec_{fs,nl,cs}.jsonl`; `cmp $EV/ctrl.confidence.json docs/model/confidence/modernbert-c100.json` | cmp exit 0 (identical) |
| S5 | `READER=modernbert THREADS=5 MODEL=$C/export/modernbert-C100-s0 timeout 3h nice -n 10 node .../collect_set.mjs --train-data $C/../data/C100 --allow-text-overlap $EV/rec_ss.jsonl short_synth synth_short_t1`; stopped by SIGTERM at 3,635 records (exit 143), resumed with the same command (log: "resuming: 3635 of 3790 records kept"), exit 0 | `rec_ss.manifest.json`: complete, 3,790 records, 0 failed, `artifacts_sha256` b57bedf4…, 19 overlap texts (19 in `short_synth`, 6 in its calibration part, 0 in `synth_short_t1`) |
| S6 | `calibrate_arm.mjs --cal fresh2,short3,nl_a,short_synth $EV/short.confidence.json $EV/short.calibration.json <4 record files>`; `score_arm.mjs` for both fits on the four record files; `compare_fits.mjs $EV/short.score.json $EV/ctrl.score.json $EV/compare.json` | exits 0, 0, 0, 0; F_ctrl reproduces the published score file: 0 differences (`summary.md`); the bars: `compare.json`, `logs/s6_compare.log` |
| S7 | `node reports/evidence/modernbert-c100-recal/recal_report.mjs $EV reports/evidence/modernbert-c100-recal`; `node training/neural/parity/root_causes.mjs $EV/short.score.json $C/../data/C100 .../root_causes.md .../root_causes.json --scoring=today --confidence=$EV/short.confidence.json`; `MSGS=<five messages> node reports/evidence/modernbert-c100-publish/short_probe.mjs F_ctrl|F_short $C/export/modernbert-C100-s0 $EV/{ctrl,short}.confidence.json` | exits 0; `summary.md`, `summary.json`, `root_causes.{md,json}`, `short_probe.{ctrl,short}.txt` |
| S8 | not run (a bar missed) | |

Files: `compare.json` (the six bars with their numbers, the comparisons of every evaluation set, both arms' thresholds); `short.confidence.json` (F_short, **not published**);
`ctrl.calibration.json`, `short.calibration.json` (the fits' reports); `summary.md` / `summary.json` (reproduction of the published score, both fits on the reported sets,
per form on both short sets, what F_short still executes wrong); `root_causes.*` (`root_causes.mjs` on F_short's scores).

## The bars (fixed before any result)

| | F_short | F_ctrl | result |
|---|---|---|---|
| P1 `synth_short_t1/all` cost difference | +30.1171, ci95 [22.2841, 37.7327] | | pass |
| P2 confidently wrong share | 0.010076 (8 / 794) | 0.065546 (39 / 595) | pass |
| P3 `create` messages, cost difference | +23.494, ci95 [16.2921, 31.0127] | | pass |
| G1 `short3/test` | +6.4815, ci95 [0, 11.1111]; mistakes 6 (limit 9.32) | 5 | pass |
| G2 `fresh2/test` | -0.2285, ci95 [-4.519, 3.577]; mistakes 13 (limit 21.13) | 8 | pass |
| G3 `nl_a/development` (opus) | **-6.8878**, ci95 [-17.8667, 0.5764]; mistakes 4 (limit 4.92) | 1 | **miss** (point loss below -5) |

Verdict: MISS.

## A correction

C100's `train.jsonl` holds 70 requests that set an outline and 146 that remove a label; 0 ask about an outline and 0 give an undo / redo count. The model README's
sentence that the training data "lacks" outline and label removal is therefore too strong (outline questions and undo counts are absent; the others rare). It is not edited
(any edit forces a 156 MB re-download); the run log carries the correction.
