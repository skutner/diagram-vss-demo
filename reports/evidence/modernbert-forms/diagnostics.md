# ModernBERT forms: cheap diagnostics (cached B / R / C100-s0-v2 records, no inference)

Protocol 0e8dc86f525a, parent views manifest df4abeeeec0e. Diagnostics have no acceptance threshold and authorize no case-training or calibration branch.

Reconciliation with each arm's recorded score file: **all 12 checks equal**

## 1. Original case against lowercase on the same affected requests (fresh2 test, other drawings)

| arm | requests | ungated right % original | lowercase | gap (points) | gated right % original | lowercase | gated gap | confident mistakes /100 original | lowercase |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C100 | 825 | 91.4 | 73.1 | 18.3 | 67.9 | 27.5 | 40.4 | 0.727273 | 0.363636 |
| B | 825 | 90.4 | 74.2 | 16.2 | 59.6 | 21.1 | 38.5 | 0.484848 | 0 |
| R | 825 | 92.8 | 76.2 | 16.6 | 66.8 | 37 | 29.8 | 0.484848 | 0.727273 |

Ungated error transitions, original case -> lowercase (per arm):

- C100: right -> right 597; right -> unread 14; right -> wrong 143; unread -> unread 18; wrong -> right 6; wrong -> unread 4; wrong -> wrong 43
- B: held-structural -> wrong 2; right -> held-structural 1; right -> right 603; right -> unread 17; right -> wrong 125; unread -> unread 16; unread -> wrong 1; wrong -> held-structural 1; wrong -> right 9; wrong -> unread 3; wrong -> wrong 47
- R: held-structural -> held-structural 2; held-structural -> wrong 1; right -> held-structural 6; right -> right 627; right -> unread 19; right -> wrong 114; unread -> right 1; unread -> unread 12; wrong -> held-structural 2; wrong -> right 1; wrong -> unread 3; wrong -> wrong 37

Across arms (ungated, lowercase message):

- C100 -> B: right -> held-structural 1; right -> right 537; right -> unread 6; right -> wrong 59; unread -> right 3; unread -> unread 25; unread -> wrong 8; wrong -> held-structural 1; wrong -> right 72; wrong -> unread 5; wrong -> wrong 108
- B -> R: held-structural -> held-structural 1; held-structural -> wrong 1; right -> held-structural 4; right -> right 555; right -> unread 8; right -> wrong 45; unread -> right 11; unread -> unread 16; unread -> wrong 9; wrong -> held-structural 5; wrong -> right 63; wrong -> unread 10; wrong -> wrong 97

## 2. short3_lowercase

these short3 messages are written in lower case in the realistic data: there is no original-case twin, so no case gap is computed here (a synthetic twin was deliberately not built)

| arm | ungated right % | gated right % | gated confident mistakes /100 |
|---|---:|---:|---:|
| C100 | 39.6 | 11.9 | 0.746269 |
| B | 47 | 13.4 | 0.746269 |
| R | 76.1 | 50 | 0.746269 |

## 3. nl_a development: wrong and extra proposals executed at each arm's gate

| arm | threshold | executed wrong | executed extras | wrong + extras |
|---|---:|---:|---:|---:|
| C100 | 0.870735 | 2 | 4 | 6 |
| B | 0.914966 | 1 | 3 | 4 |
| R | 0.858758 | 2 | 7 | 9 |

Parent claim: "five of R's nine executed mistakes were identical wrong readings B held". Independent count: R executed **9** mistakes; B produced the **same reading** (message, span, raw formalization) and **held** it for **5** (by confidence 5, structurally 0); B executed the same reading 3; a different reading of an overlapping span 0; nothing produced 1. Claim holds.

### C100 executed mistakes (6)

| message | outcome | own conf | thr | B (same reading?) | R (same reading?) |
|---|---|---:|---:|---|---|
| nl-01-026 "start takes Idle to Running" | wrong | 0.889315 | 0.870735 | a different reading of an overlapping span | a different reading of an overlapping span |
| nl-01-029 "Paused is still blue" | extra | 0.870909 | 0.870735 | held by confidence (same reading) c=0.818912 | executed (same reading) c=0.887087 |
| nl-03-015 "put Sam beside Martin" | extra | 0.979407 | 0.870735 | a different reading of an overlapping span | a different reading of an overlapping span |
| nl-09-053 "The post office goes next to the bakery" | extra | 0.90838 | 0.870735 | held by confidence (same reading) c=0.581319 | a different reading of an overlapping span |
| nl-10-016 "Make the tasks in Done green" | wrong | 0.945862 | 0.870735 | held by confidence (same reading) c=0.784253 | executed (same reading) c=0.963933 |
| nl-11-025 "Library goes between market and station" | extra | 0.978116 | 0.870735 | executed (same reading) c=0.951304 | executed (same reading) c=0.987299 |

### B executed mistakes (4)

| message | outcome | own conf | thr | C100 (same reading?) | R (same reading?) |
|---|---|---:|---:|---|---|
| nl-05-027 "vault left of archive" | extra | 0.92776 | 0.914966 | held by confidence (same reading) c=0.730373 | executed (same reading) c=0.888654 |
| nl-11-025 "Library goes between market and station" | extra | 0.951304 | 0.914966 | executed (same reading) c=0.978116 | executed (same reading) c=0.987299 |
| nl-11-028 "put 7 min on depot-market" | wrong | 0.919744 | 0.914966 | a different reading of an overlapping span | a different reading of an overlapping span |
| nl-12-026 "can you get from Mill to Keep without going throug" | extra | 0.932136 | 0.914966 | held by confidence (same reading) c=0.773942 | executed (same reading) c=0.885628 |

### R executed mistakes (9)

| message | outcome | own conf | thr | C100 (same reading?) | B (same reading?) |
|---|---|---:|---:|---|---|
| nl-01-029 "Paused is still blue" | extra | 0.887087 | 0.858758 | executed (same reading) c=0.870909 | held by confidence (same reading) c=0.818912 |
| nl-03-015 "Could you put Sam beside Martin" | extra | 0.879796 | 0.858758 | a different reading of an overlapping span | held by confidence (same reading) c=0.904475 |
| nl-05-027 "vault left of archive" | extra | 0.888654 | 0.858758 | held by confidence (same reading) c=0.730373 | executed (same reading) c=0.92776 |
| nl-09-030 "Some should be red" | extra | 0.860645 | 0.858758 | a different reading of an overlapping span | held by confidence (same reading) c=0.902483 |
| nl-09-030 "what the rules are" | extra | 0.895012 | 0.858758 | nothing produced there | nothing produced there |
| nl-10-016 "Make the tasks in Done green" | wrong | 0.963933 | 0.858758 | executed (same reading) c=0.945862 | held by confidence (same reading) c=0.784253 |
| nl-11-025 "Library goes between market and station" | extra | 0.987299 | 0.858758 | executed (same reading) c=0.978116 | executed (same reading) c=0.951304 |
| nl-11-033 "write Zone 2 on it" | wrong | 0.933172 | 0.858758 | held by confidence (same reading) c=0.515038 | held by confidence (same reading) c=0.668819 |
| nl-12-026 "can you get from Mill to Keep without going throug" | extra | 0.885628 | 0.858758 | held by confidence (same reading) c=0.773942 | executed (same reading) c=0.932136 |

