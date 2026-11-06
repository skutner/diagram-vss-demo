# M5 on nl_b (all): F0-s0 against its SOP-BERT control SOP-F0-s0, with M3-s0 beside (on a list the plan does not allow)

c = the teachers' agreement per requested action on nl_b (gpt scored against Opus) = 69.6% of 714 requested actions. Thresholds as restated in MODERNBERT_RUNLOG.md; the rows not restated stand as in the plan.

| row | bar | F0-s0 | SOP-F0-s0 | M3-s0 | verdict (F0-s0) |
|---|---|---|---|---|---|
| 1. nl_b: every request executed, right (teachers' agreement c = 69.6%) | >= 0.75 c = 52.2% | 7.4% | 8.8% | 9.0% | **FAIL** |
| 2. nl_b: at the cost-10 threshold, right | >= 0.5 c = 34.8% | 1.1% | 1.7% | 2.0% | **FAIL** |
| 3. nl_b: at the cost-10 threshold, executions wrong (wrong + extras) | <= 2% | 38.5% (5 of 13) | 29.4% (5 of 17) | 39.1% (9 of 23) | **FAIL** |
| 4. nl_b: cost score (cost-10 threshold) above the SOP-BERT control, 95% interval above 0 | interval above 0 | -5.9 | -5.3 | -10.6 | **FAIL** |
| 5. nl_b: requests whose trigger never occurs in training, every request executed, right | >= 70% (as in the plan) | 5.1% (277 requests) | 4.7% | 4.3% | **FAIL** |
| 5b. nl_b: unseen triggers, at the threshold, executions wrong | <= 2% | 0.0% | 0.0% | 0.0% | **PASS** |
| 6. nl_b: paraphrase groups, wordings with the same effect as the gold (every request executed) | >= 50% (restated) | 38.4% (24 groups, 112 wordings) | 42.0% | 34.8% | **FAIL** |
| 7. nl_b: messages with nothing to do, actions executed per 100 at the threshold | <= 1 | 0.00 (29 messages; every request executed: 89.7) | 0.00 | 0.00 | **PASS** |
| 8. nl_b: step-by-step sessions, each on its own drawing, what the session changed that the reader changed the same way (mean over 17 sessions, every request executed) | each >= 50% (M4 declined) | shapes 10.8%, arrows 18.8%, groups 0.0% | shapes 8.4%, arrows 20.0%, groups n/a | shapes 11.6%, arrows 31.5%, groups n/a | **FAIL** |
| 9. short3 test: at the threshold, right within 5 points of the Rules and wrong not above theirs | right >= Rules - 5 pt; wrong <= Rules | right 15.3%, wrong 1.2% | right 16.4%, wrong 1.4% |  | **FAIL** |
| 10. fresh2, short3 test: no loss against the SOP-BERT control | no interval below 0 | fresh2 10.1 [3.3, 16.5]; short3 1.2 [-13.0, 15.6] |  |  | **PASS** |
| A. Adoption (a separate decision): cost score on nl_b above the control's by >= 5 points, interval above 0 | >= 5 points, interval above 0 | -0.6 [-7.7, 7.7] |  |  | **FAIL** |

Notes:
- 1: with the direction of a resize compared: 7.4%; either teacher (upper reading): 7.8%
- 2: threshold 0.9156; asked 410; with direction: 1.1%
- 3: only 13 executions at the threshold: a rate of so few is weak evidence
- 4: final minus control -0.6 [-7.7, 7.7], session, else paraphrase group, else message, 387 units, sign-flip p 0.7848
- 5: the plan's 70% is not restated: it is 100.6% of the teachers' agreement c, above the restated every-request bar (0.75 c = 52.2%)
- 6: same effect as one another 67.9%; at the threshold: as gold 18.8%, as one another 97.3%, changed nothing 97.3%; floor (executes nothing): as one another 100.0%, as gold 16.1%
- 8: at the threshold: shapes 0.0%, arrows 0.0%, groups n/a; floor (executes nothing): shapes 0.0%, arrows 0.0%, groups n/a; same whole drawing in 0 of 17; answers of the gold's questions 0 of 0
- 9: Rules, every request executed: right 56.3%, wrong 11.8%; short3 test only (the short sets of regress.sh are not read here)
- 10: final minus control, cost score at the threshold; a loss is shown when an interval lies below 0
- A: for its cost: 150 MB and 537 ms against 68 MB and 71 ms per message (plan); if SOP-BERT does as well, that is the result

Cannot be computed here:
- nl_b: cost score above VSS-BERT's: VSS-BERT is not a reader in collect_set.mjs (it needs the composer of the micro registry, vss-composer.js); its numbers on this set cannot be produced tonight
- real messages (>= 200): no destructive action wrong, right share above the control: the data is LLM-written (MODERNBERT_RUNLOG.md D8); collected_1 holds 26 real messages (52 with the corrected variants), under 200, so the gate does not apply
- seeds 1 and 2 (the spread): only seed 0 was trained (MODERNBERT_RUNLOG.md); the 95% intervals of rows 4 and A are over messages, sessions and groups, not over seeds
- the short sets of regress.sh: only short3 is read by these tools

Gating rows failing: 1, 2, 3, 4, 5, 6, 8, 9.

"Detects the intention" (all computed gating rows pass, none missing): no / not decided. Rows that cannot be computed tonight (above) are pending, not passed.
