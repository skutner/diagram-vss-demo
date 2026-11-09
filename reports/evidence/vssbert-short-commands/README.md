# VSS-BERT on short literal commands: evidence folder (VSSBERT_SHORT_COMMANDS_PLAN.md)

Status: S0-S5 done, S6 passed, S7 and S8 run, S9 evidence written. The plan's "Result" section is written by the coordinator after review (not here).
Base commit `0ab687c` (the plan said `63fe9cc`; Q3 committed t1 in between) plus the uncommitted files of `training/sketch/shortcmd/`, the two `synth/*_bare_check.json` and this folder.

## S6 (independent review of `training/sketch/shortcmd/`)
Round 1: BLOCK (one blocking: empty deciding view / short3s without `--parts sha3` gave a silent "not triggered"; two important: the >2% omitted-rules flag on the deciding views, the B-before-A precedence).
Fixed with tests (commit-free); delta re-review: APPROVED, no blocking or important finding left (verdict as reported by the coordinator). Reviewed hashes (sha256, first 12 characters, checked against the files at S7 time):
`apply_gates.mjs` f12abd2ece01, `outcomes.mjs` 3ac2e330fe4c, `parity.mjs` 061d1b4917e9, `test_shortcmd.mjs` 8bd5a8881324, `root_causes.mjs` c357aaf08593, `spell_view.mjs` fe2b0d4f797c,
`bench_rows.mjs` 8ea74f77143a, `bare_view.py` b2aad6638b60, `test_bare_view.py` a6fd9a44033d.

## Notes for the record
- Before S6 passed, the reviewer ran `apply_gates.mjs` once on t1bs into its own scratchpad. It looked only at structural fields (message counts, V size = 734,
  the seen_text ids, `parts`, the thresholds), not at kinds, summaries or outcomes. Nothing of it is used here.
- short3's 17 messages with a pending gold wire are excluded by the confidence protocol's own rule (`training/neural/parity/sets.mjs` `exclude_pending`), the
  same filter `audit_new_forms.mjs` uses; `collect_pair.mjs` cannot read a wire without `args`. The repro test part holds 1,745 gold requests, equal to the
  published count (`combined.json`: 747 right / 0.428081). The filtered data folder is `$C/data/short3_defined` (command in `views.md`).

## Planned S7 commands (written before S7; run from the repository root, one at a time)
`C=~/.cache/diagram-vss-shortcmd`, `EV=reports/evidence/vssbert-short-commands`, `SK=training/sketch`. short3s MUST carry `--parts sha3` (outcomes.mjs refuses a
short3s rows file without it, or without rows of part `test`); every other set is `--parts all` (the default). Outcomes also exit 3 when any deciding view is empty.
```
node $SK/shortcmd/apply_gates.mjs --set t1s     --rec $C/rec/t1s     --data $C/data/t1s     --out $C/rows/t1s.json
node $SK/shortcmd/apply_gates.mjs --set t1raw   --rec $C/rec/t1raw   --data $C/data/t1raw   --out $C/rows/t1raw.json
node $SK/shortcmd/apply_gates.mjs --set t1bs    --rec $C/rec/t1bs    --data $C/data/t1bs    --out $C/rows/t1bs.json
node $SK/shortcmd/apply_gates.mjs --set r2bs    --rec $C/rec/r2bs    --data $C/data/r2bs    --out $C/rows/r2bs.json
node $SK/shortcmd/apply_gates.mjs --set short3s --rec $C/rec/short3s --data $C/data/short3s --parts sha3 --out $C/rows/short3s.json
node $SK/shortcmd/apply_gates.mjs --set bench_s --rec $C/rec/bench_s --data $C/data/bench_s --out $C/rows/bench_s.json
# 5.1 dry run (the Rules at `all` on rows the spell checker did not change: right = requested, wrong 0, extras 0); must print ok for t1s, t1bs, r2bs before outcomes
node -e 'for (const s of ["t1s","t1bs","r2bs"]) { const r = JSON.parse(require("fs").readFileSync(process.env.HOME+"/.cache/diagram-vss-shortcmd/rows/"+s+".json")).rows.filter(x => x.reader==="Rules" && x.level==="all" && !x.spell_changed && !x.span_lost); const n = k => r.filter(x => x.kind===k).length; const req = r.filter(x => x.gold_index!==null).length; console.log(s, n("done_right")===req && n("executed_wrong")===0 && n("extra_executed")===0 && n("missed")===0 ? "ok" : "FAIL", "requested", req, "right", n("done_right"), "wrong", n("executed_wrong"), "extras", n("extra_executed"), "missed", n("missed")); }'
node $SK/shortcmd/outcomes.mjs $C/rows/t1s.json $C/rows/t1raw.json $C/rows/t1bs.json $C/rows/r2bs.json $C/rows/short3s.json $C/rows/bench_s.json > $EV/outcomes.json
node $SK/shortcmd/root_causes.mjs $C/rows/t1s.json $C/rows/t1raw.json $C/rows/t1bs.json $C/rows/r2bs.json $C/rows/short3s.json $C/rows/bench_s.json > $EV/root_causes.md
```
The files are listed one by one (not `$C/rows/*.json`) so that `repro.json` and `probes.json` are not read as deciding sets.

## Models and data by hash
- `inputs.sha256` (written at S0, `sha256sum -c` passes at the end): the four confidence files, `versions.json`, t1 and r2 files. Models, folder hashes (sha256 of the sorted file hashes, first 16): `docs/model/neural/sop-bert` 42c469ccee9710d1, `docs/model/micro` 24800e99277b518a, `docs/model/context` 85601e477b7d52d8, `docs/model/spell` d83d111e9f1e1f2a.
- Every rows file holds a `manifest` (sha256 of its records, data folders, the code and the model files, git HEAD `0ab687cc142e`). Rows files (sha256): t1s 2a098e17..., t1raw b17e46a8..., t1bs 98855b68..., r2bs 57f448ff..., short3s 07e1c433..., bench_s b1b8c60b..., probes 124a87d0..., repro 07ab242b... (full values: `sha256sum ~/.cache/diagram-vss-shortcmd/rows/*.json`).
- Evidence files (sha256): `outcomes.json` 0bb30b9fbc85..., `tables.md` de0f67cfa23a..., `root_causes.md` 3701cb71cba3... (including the reading appended to it), `browser_probes.json` e8ead0f1c2fc...
- Views and counts: `views.md`. Reproduction: `repro.md`, `repro_failures.txt`. Browser parity (S5, by the coordinator): `browser_probes.json`, `parity.txt`.

## What was run (exit codes; C=~/.cache/diagram-vss-shortcmd)
- S0: the four confidence tests exit 0; `git status --porcelain docs/` empty. S1: `test_bare_view.py` (12) and `test_shortcmd.mjs` (110 checks) exit 0. S2 and S3: commands in `views.md`; every collector log ends `exit 0`.
- S4: `failures_vss_bert.mjs` exit 0; `apply_gates.mjs --set repro ... --compare-failures --parity-fixture --variants` exit 0, 0 differences.
- S5: `parity.mjs probes.json browser_probes.json` exit 0, PARITY HOLDS (10 probes x 4 readers).
- S7: `apply_gates.mjs` on t1s, t1raw, t1bs, r2bs, bench_s (default parts) and short3s (`--parts sha3`), one at a time: each exit 0 (1,793 / 70 / 1,530 / 1,358 / 113 / 513 messages).
  5.1 dry run (the Rules at `all` on rows without a spelling change): t1s ok (1,723 requested, 1,723 right, 0 wrong, 0 extras, 0 missed), t1bs ok (1,528), r2bs ok (1,356).
  `outcomes.mjs` on the six rows files exit 0 (written to a temporary file, moved to `outcomes.json` only on exit 0). `make_tables.mjs $C/rows > tables.md` exit 0 (the formatter is in this folder).
- S8: `root_causes.mjs` on the same six files exit 0 (the counts add up), output `root_causes.md`; the reading is its last section, marked as reading.
- The commands are those of the "Planned S7 commands" section below, unchanged except the outcomes temporary file.

## Outcomes (outcomes.json, exact)
Sizes: V 734 messages, t1s 1,791, short3s test 329 (420 requests), r2b 586. Precedence line: null.
- **C triggered: true** (bar 1.58%). VSS-BERT confidently wrong at `cost`: V 0 of 617 executed (Wilson 95% [0, 0.62%], not above); t1s 48 of 908 = 5.29% [4.01%, 6.94%] (above); short3s test 5 of 130 = 3.85% [1.65%, 8.69%] (above).
- B triggered: false. V at `all`: 734 of 734 right (100%); every core form 100%.
- A triggered: false. Right at `all` on V 100% (condition holds); held-but-right at `cost` 15.9% of V (needs 20%: fails); paired difference (cost score `all` minus `cost`) on V 15.94 [13.35, 18.80] (above 0: holds); r2b held-but-right 14.2% (fails), cost score 98.1 at `all` against 85.7.
- D triggered: false. short3s test (329 units): VSS tab minus VSS-BERT -6.90 [-22.14, 7.96]; SOP-BERT tab minus VSS-BERT +1.19 [-5.81, 8.52]. Reported only: on V the VSS tab is +15.40 [12.81, 18.12] and the SOP-BERT tab -13.35 [-16.21, -10.22]; on t1s by gold span VSS +3.91 [-2.67, 11.56], SOP-BERT -6.25 [-14.96, 3.06].
- Omitted `ui.js` rules over 2%: V, r2b: none (0 multi-request messages, 0 destructive described). t1s: VSS-BERT 21.7% (191 two-request messages) is over 2%; VSS, SOP-BERT, Rules not. short3s test: all four over 2% (VSS-BERT 65.5%, VSS 28.8%, SOP-BERT 36.0%, Rules 2.4%). So the parity claim is weaker for t1s (VSS-BERT) and short3s test; not for V or r2b.

## Headline: VSS-BERT, SOP-BERT, VSS, Rules on V (734 requests)
| reader | level | right | wrong | held right | executed | confidently wrong (Wilson 95%) | share right | cost score |
|---|---|---|---|---|---|---|---|---|
| VSS-BERT | all | 734 | 0 | 0 | 734 | 0.00% [0, 0.52%] | 100.0% | 100.0 |
| VSS-BERT | cost | 617 | 0 | 117 | 617 | 0.00% [0, 0.62%] | 84.1% | 84.1 |
| SOP-BERT | all | 734 | 0 | 0 | 734 | 0.00% [0, 0.52%] | 100.0% | 100.0 |
| SOP-BERT | cost | 519 | 0 | 215 | 519 | 0.00% [0, 0.73%] | 70.7% | 70.7 |
| VSS | all | 734 | 0 | 0 | 734 | 0.00% [0, 0.52%] | 100.0% | 100.0 |
| VSS | cost | 730 | 0 | 4 | 730 | 0.00% [0, 0.52%] | 99.5% | 99.5 |
| Rules | all and cost | 734 | 0 | 0 | 734 | 0.00% [0, 0.52%] | 100.0% | 100.0 |
All other views, per form, narration, seen_trigger and the omitted rules: `tables.md`. Causes: `root_causes.md`.

## Probes and bench_s (reported, never deciding)
- Probes (10, `probes.json`; per probe and reader in the report of Phase 1 and in `browser_probes.json`): VSS-BERT 8 executed + 2 held (probes 01, 07), VSS 10 executed, SOP-BERT 7 executed + 3 held (01, 06, 07), Rules 10 executed; all readings equal the gold, 0 wrong.
- bench_s (113 rows, written from the Rules' templates, favours the Rules; 7 texts seen in training): VSS-BERT `all` 107 right, 6 wrong, 9 extras (cw 12.3%); `cost` 86 right, 21 held right, 2 wrong + 0 extras of 88 executed (cw 2.27%), cost score 58.4. VSS `cost` 95 right, 1 wrong of 96 (1.04%), score 75.2. SOP-BERT `cost` 91 right, 1 wrong of 92 (1.09%), score 71.7. Rules 113 of 113.

## Planned S7 commands
`C=~/.cache/diagram-vss-shortcmd`, `EV=reports/evidence/vssbert-short-commands`, `SK=training/sketch`. short3s MUST carry `--parts sha3` (outcomes.mjs refuses a
short3s rows file without it, or without rows of part `test`); every other set is `--parts all` (the default). Outcomes also exit 3 when any deciding view is empty.
```
node $SK/shortcmd/apply_gates.mjs --set t1s     --rec $C/rec/t1s     --data $C/data/t1s     --out $C/rows/t1s.json
node $SK/shortcmd/apply_gates.mjs --set t1raw   --rec $C/rec/t1raw   --data $C/data/t1raw   --out $C/rows/t1raw.json
node $SK/shortcmd/apply_gates.mjs --set t1bs    --rec $C/rec/t1bs    --data $C/data/t1bs    --out $C/rows/t1bs.json
node $SK/shortcmd/apply_gates.mjs --set r2bs    --rec $C/rec/r2bs    --data $C/data/r2bs    --out $C/rows/r2bs.json
node $SK/shortcmd/apply_gates.mjs --set short3s --rec $C/rec/short3s --data $C/data/short3s --parts sha3 --out $C/rows/short3s.json
node $SK/shortcmd/apply_gates.mjs --set bench_s --rec $C/rec/bench_s --data $C/data/bench_s --out $C/rows/bench_s.json
# 5.1 dry run (the Rules at `all` on rows the spell checker did not change: right = requested, wrong 0, extras 0); must print ok for t1s, t1bs, r2bs before outcomes
node -e 'for (const s of ["t1s","t1bs","r2bs"]) { const r = JSON.parse(require("fs").readFileSync(process.env.HOME+"/.cache/diagram-vss-shortcmd/rows/"+s+".json")).rows.filter(x => x.reader==="Rules" && x.level==="all" && !x.spell_changed && !x.span_lost); const n = k => r.filter(x => x.kind===k).length; const req = r.filter(x => x.gold_index!==null).length; console.log(s, n("done_right")===req && n("executed_wrong")===0 && n("extra_executed")===0 && n("missed")===0 ? "ok" : "FAIL", "requested", req, "right", n("done_right"), "wrong", n("executed_wrong"), "extras", n("extra_executed"), "missed", n("missed")); }'
node $SK/shortcmd/outcomes.mjs $C/rows/t1s.json $C/rows/t1raw.json $C/rows/t1bs.json $C/rows/r2bs.json $C/rows/short3s.json $C/rows/bench_s.json > $EV/outcomes.json
node $SK/shortcmd/root_causes.mjs $C/rows/t1s.json $C/rows/t1raw.json $C/rows/t1bs.json $C/rows/r2bs.json $C/rows/short3s.json $C/rows/bench_s.json > $EV/root_causes.md
```
The files are listed one by one (not `$C/rows/*.json`) so that `repro.json` and `probes.json` are not read as deciding sets.
