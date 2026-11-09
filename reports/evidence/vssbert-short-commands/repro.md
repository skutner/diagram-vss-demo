# Reproduction check (VSSBERT_SHORT_COMMANDS_PLAN.md 5.2), written by step S4

Records: today's collection (`~/.cache/diagram-vss-shortcmd/rec/repro`, 1,113 messages) of fresh2 opus_a-d (600) and short3 without its 17 messages that carry a pending
gold wire (513; `collect_pair.mjs` stops on a wire without `args`: see the deviation in the report). Raw text. Test part = `sha256(id) % 3 != 0`:
1,745 gold requests (the same count as `combined.json`: 747 right / 0.428081 = 1,745).

## 5.2(a) blocking: two code paths, one set of records
`DEP=names node training/sketch/combine/failures_vss_bert.mjs` (stderr in `repro_failures.txt`) against `apply_gates.mjs --compare-failures`:
messages compared 1113, gold rows 2553, extra rows 462, **differences: 0**.

## 5.2(b) blocking for the tab paths: `confidence3/vote3_parity.json` (60 messages, expected confidences present: AVAILABLE)
The file holds `expect.vss` and `expect.sop` (confidence per request). `apply_gates.mjs`'s own column wrapper (`voteColumn`) on those messages:
canon agreement (the file's own): 397 requests, max |difference| = 0.0e+00, 120 of 120 (message, column) pairs the same requests, decisions different from the file's: 0;
engine agreement: max |difference| = 0.0e+00, decisions different: 0.
Limit, said plainly: the fixture is already in the shape of a message, so this checks the column wrapper and the module calls, not the shaping of records into messages (the probes check that).

## 5.2(c) reported: the test-part numbers against the published ones, like for like
Each cell: executed / right / wrong or extra / cost score / confidently wrong / done right (of 1,745 requested). Published = read from the file named; today = `repro.json` (`summary`, test part; variants without the name rule or with canon agreement are `variants`).
A difference in the SAME mode is drift since the fits of 2026-11-03 (the models and the four confidence files are unchanged since then, `git diff --stat 034d1c6..HEAD -- docs/model/confidence docs/model/neural/sop-bert docs/model/micro` shows only the two new ModernBERT confidence files; reader code changed, see below). It is reported, not fixed.

| mode | published | today | today minus published |
|---|---|---|---|
| VSS-BERT, no name rule (combined.json `cuts.bert.levels.cost`) | 761 / 747 / 14 / 34.8 / 1.84% / 42.8% | 782 / 767 / 15 / 35.4 / 1.92% / 44.0% | 21 / 20 / 1 / +0.6 / +0.08 / +1.1 |
| VSS-BERT, with the name rule (CLARIFY_DESIGN.md:217-219) | 758 / 746 / 12 / 35.9 / 1.58% / 42.8% | 779 / 766 / 13 / 36.4 / 1.67% / 43.9% | 21 / 20 / 1 / +0.5 / +0.09 / +1.1 |
| VSS column, canon agreement, no name rule (vote3.json `columns.vss.test`) | 686 / 660 / 26 / 22.9 / 3.79% / 37.8% | 692 / 666 / 26 / 23.3 / 3.76% / 38.2% | 6 / 6 / 0 / +0.3 / -0.03 / +0.3 |
| VSS column, canon agreement, with the name rule (reported, no published value) | 686 / 660 / 26 / 22.9 / 3.79% / 37.8% | 692 / 666 / 26 / 23.3 / 3.76% / 38.2% | 6 / 6 / 0 / +0.3 / -0.03 / +0.3 |
| VSS column, engine agreement (what the page passes), no name rule (reported) | 686 / 660 / 26 / 22.9 / 3.79% / 37.8% | 694 / 667 / 27 / 22.8 / 3.89% / 38.2% | 8 / 7 / 1 / -0.2 / +0.10 / +0.4 |
| VSS column, engine agreement, with the name rule (what the page runs) | 686 / 660 / 26 / 22.9 / 3.79% / 37.8% | 694 / 667 / 27 / 22.8 / 3.89% / 38.2% | 8 / 7 / 1 / -0.2 / +0.10 / +0.4 |
| SOP-BERT column, canon agreement, no name rule (vote3.json `columns.sop.test`) | 802 / 782 / 20 / 33.4 / 2.49% / 44.8% | 821 / 801 / 20 / 34.4 / 2.44% / 45.9% | 19 / 19 / 0 / +1.1 / -0.06 / +1.1 |
| SOP-BERT column, canon agreement, with the name rule (reported, no published value) | 802 / 782 / 20 / 33.4 / 2.49% / 44.8% | 820 / 801 / 19 / 35.0 / 2.32% / 45.9% | 18 / 19 / -1 / +1.7 / -0.18 / +1.1 |
| SOP-BERT column, engine agreement (what the page passes), no name rule (reported) | 802 / 782 / 20 / 33.4 / 2.49% / 44.8% | 821 / 801 / 20 / 34.4 / 2.44% / 45.9% | 19 / 19 / 0 / +1.1 / -0.06 / +1.1 |
| SOP-BERT column, engine agreement, with the name rule (what the page runs) | 802 / 782 / 20 / 33.4 / 2.49% / 44.8% | 820 / 801 / 19 / 35.0 / 2.32% / 45.9% | 18 / 19 / -1 / +1.7 / -0.18 / +1.1 |

(Published rows with a name rule and the published columns "with the name rule" have no published value for the columns; the column rows repeat the published canon value for comparison only. The like-for-like rows are the first two and the two canon / no-name-rule rows of the columns.)

Omitted `ui.js` rules on this set (counts, not deciding): {"VSS-BERT": {"multi_request_messages": 413, "multi_requests": 1659, "destructive_described": 7, "destructive_described_in_single": 3}, "VSS": {"multi_request_messages": 293, "multi_requests": 1176, "destructive_described": 2, "destructive_described_in_single": 2}, "SOP-BERT": {"multi_request_messages": 344, "multi_requests": 1398, "destructive_described": 4, "destructive_described_in_single": 1}, "Rules": {"multi_request_messages": 0, "multi_requests": 0, "destructive_described": 13, "destructive_described_in_single": 13}}; share of requested: {"VSS-BERT": 0.952, "VSS": 0.675, "SOP-BERT": 0.802, "Rules": 0.007} (fresh2 and short3 hold many multi-request messages; the deciding short-command views hold one request per message).

Commits since the fit (034d1c6, 2026-11-03 08:57) that touch reader code or models (`git log 034d1c6..HEAD -- docs/js/{logic,vss,vss-composer,vss-context,vss-formalizer,neural,front,bench-canon}.js docs/js/*confidence*.js docs/model/{micro,neural,context,confidence}`):
- 63fe9cc 11-07 18:29 ModernBERT tab: read the retrained arm C100-s0 instead of the first experiment
- 1fa93a5 11-06 07:18 ModernBERT parity plan: run end to end; goal not reached
- 11d1a76 11-04 15:20 Add gpt-6.1-sol saved SOP example reader
- 101edd9 11-04 07:37 Publish experimental ModernBERT reader with frozen quality results
- baef6de 11-04 07:12 Implement weight-only ModernBERT export and runtime acceptance gates
- 62a5b8d 11-03 18:40 Add preregistered ModernBERT diagram reader and training pipeline
- 3deedd7 11-03 15:32 Allow an explicit "Clear the canvas" / "delete everything" (owner, 2026-11-03)
- 97fcf4f 11-03 15:01 Demo: 24 scenes in the + menu (scenes_r3, scenes_r3b, and the 4 held-out test scenes marked "test"); names toggle; scenario view; 
- e6ab784 11-03 14:05 VSS loads 2-4x faster: route-book tables from 256 phase levels, lazy float64 copies, parallel world downloads, a Cache API copy
- 5f22993 11-03 13:55 Cautious by design: destructive actions need the safety threshold; visible level badge; routed edges; common-sense defaults; direc
- 50c7242 11-03 12:40 Engine: items by their visible text, panel-aware descriptions, layouts that fit without overlaps; UI: own cutter per tab, one-row 
- ad1b272 11-03 10:51 Demo: a refined colour palette (same colour names; shades only)

Commands (from the repository root; C=~/.cache/diagram-vss-shortcmd, SK=training/sketch):
```
DEP=names node $SK/combine/failures_vss_bert.mjs $C/rec/repro $C/rows/repro_failures.json $F2 $C/data/short3_defined 2> reports/evidence/vssbert-short-commands/repro_failures.txt
node $SK/shortcmd/apply_gates.mjs --set repro --rec $C/rec/repro --data $F2,$C/data/short3_defined --parts sha3 --compare-failures $C/rows/repro_failures.json --parity-fixture $SK/confidence3/vote3_parity.json --variants --out $C/rows/repro.json
```
