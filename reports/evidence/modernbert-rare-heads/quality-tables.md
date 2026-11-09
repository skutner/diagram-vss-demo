# Quality tables: ModernBERT rare-head loss experiment

All values come from the sealed registered evaluation and unchanged cached comparators. W and F use the same training membership; B and C100 remain safety anchors. Each arm uses its own frozen-method cost-10 threshold. These are request-level outcomes; zero executions have unavailable risk.

## Calibration

| Arm | Cost-10 threshold | Selected L2 | Selection OOF AUROC | Fit units |
|---|---:|---:|---:|---:|
| W-s0 | 0.931999127 | 0.1 | 0.949712 | 1423 |
| F-s0 | 0.875764966 | 0.01 | 0.947094 | 1439 |
| B-s0 | 0.914965782 | 0.1 | 0.941611 | 1462 |
| C100-s0 | 0.870735468 | 0.01 | 0.931474 | 1509 |

Selection OOF AUROC chose L2 and is not an unbiased post-selection estimate. Population AUROC is reported separately below.

## Gated main and guard populations

| Population | Arm | Requested | Right | Wrong | Extras | Confidently wrong | Right/requested | Cost | Asked requests | Structural holds (produced) | Confidence holds (produced) | Unread | AUROC |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| t1_clean | W-s0 | 1354 | 1083 | 18 | 0 | 1.63% | 79.99% | 66.69 | 253 | 0 | 253 | 0 | 0.88 |
| t1_clean | F-s0 | 1354 | 1101 | 29 | 0 | 2.57% | 81.31% | 59.90 | 224 | 0 | 224 | 0 | 0.93 |
| t1_clean | B-s0 | 1354 | 820 | 5 | 0 | 0.61% | 60.56% | 56.87 | 514 | 2 | 549 | 15 | 0.96 |
| t1_clean | C100-s0 | 1354 | 687 | 14 | 0 | 2.00% | 50.74% | 40.40 | 653 | 0 | 657 | 0 | 0.96 |
| fresh2_test/test | W-s0 | 1313 | 540 | 3 | 4 | 1.28% | 41.13% | 35.80 | 738 | 14 | 802 | 32 | 0.91 |
| fresh2_test/test | F-s0 | 1313 | 676 | 4 | 4 | 1.17% | 51.49% | 45.39 | 601 | 14 | 664 | 32 | 0.92 |
| fresh2_test/test | B-s0 | 1313 | 621 | 5 | 3 | 1.27% | 47.30% | 41.20 | 660 | 7 | 719 | 27 | 0.92 |
| fresh2_test/test | C100-s0 | 1313 | 708 | 11 | 5 | 2.21% | 53.92% | 41.74 | 559 | 0 | 622 | 35 | 0.90 |
| short3_test/test | W-s0 | 432 | 94 | 6 | 0 | 6.00% | 21.76% | 7.87 | 292 | 12 | 314 | 40 | 0.86 |
| short3_test/test | F-s0 | 432 | 114 | 6 | 2 | 6.56% | 26.39% | 7.87 | 264 | 7 | 298 | 48 | 0.85 |
| short3_test/test | B-s0 | 432 | 98 | 5 | 1 | 5.77% | 22.69% | 8.80 | 294 | 8 | 315 | 35 | 0.81 |
| short3_test/test | C100-s0 | 432 | 95 | 6 | 0 | 5.94% | 21.99% | 8.10 | 297 | 0 | 325 | 34 | 0.83 |
| nl_a_development/development | W-s0 | 392 | 10 | 0 | 1 | 9.09% | 2.55% | 0.00 | 262 | 75 | 372 | 120 | 0.87 |
| nl_a_development/development | F-s0 | 392 | 13 | 2 | 2 | 23.53% | 3.32% | -6.89 | 263 | 66 | 402 | 114 | 0.88 |
| nl_a_development/development | B-s0 | 392 | 9 | 1 | 3 | 30.77% | 2.30% | -7.91 | 255 | 73 | 374 | 127 | 0.85 |
| nl_a_development/development | C100-s0 | 392 | 11 | 2 | 4 | 35.29% | 2.81% | -12.50 | 260 | 0 | 453 | 119 | 0.87 |
| fresh2_test_clean | W-s0 | 639 | 294 | 3 | 3 | 2.00% | 46.01% | 36.62 | 325 | 3 | 364 | 17 | 0.90 |
| fresh2_test_clean | F-s0 | 639 | 350 | 3 | 1 | 1.13% | 54.77% | 48.51 | 274 | 7 | 309 | 12 | 0.93 |
| fresh2_test_clean | B-s0 | 639 | 318 | 2 | 2 | 1.24% | 49.77% | 43.51 | 304 | 2 | 341 | 15 | 0.91 |
| fresh2_test_clean | C100-s0 | 639 | 361 | 6 | 3 | 2.43% | 56.49% | 42.41 | 258 | 0 | 299 | 14 | 0.90 |
| short3_test_clean | W-s0 | 330 | 73 | 5 | 0 | 6.41% | 22.12% | 6.97 | 220 | 7 | 243 | 32 | 0.88 |
| short3_test_clean | F-s0 | 330 | 89 | 5 | 1 | 6.32% | 26.97% | 8.79 | 196 | 4 | 229 | 40 | 0.87 |
| short3_test_clean | B-s0 | 330 | 78 | 4 | 1 | 6.02% | 23.64% | 8.48 | 219 | 8 | 238 | 29 | 0.83 |
| short3_test_clean | C100-s0 | 330 | 76 | 5 | 0 | 6.17% | 23.03% | 7.88 | 222 | 0 | 246 | 27 | 0.86 |
| nl_a_development_clean | W-s0 | 339 | 8 | 0 | 0 | 0.00% | 2.36% | 2.36 | 223 | 61 | 299 | 108 | 0.87 |
| nl_a_development_clean | F-s0 | 339 | 11 | 2 | 2 | 26.67% | 3.24% | -8.55 | 226 | 58 | 316 | 100 | 0.87 |
| nl_a_development_clean | B-s0 | 339 | 7 | 1 | 2 | 30.00% | 2.06% | -6.78 | 217 | 67 | 288 | 114 | 0.86 |
| nl_a_development_clean | C100-s0 | 339 | 10 | 2 | 4 | 37.50% | 2.95% | -14.75 | 223 | 0 | 365 | 104 | 0.87 |

Asked requests = requested − executed-right − executed-wrong − unread. Hold columns count produced requests, including would-be extras, and are not additive to the requested denominator. Confidently wrong = (wrong + extras)/(right + wrong + extras); cost = 100×(right − 10×(wrong + extras))/requested.

## Ungated form and case populations

| Population | W right/requested | F right/requested | B right/requested | W exact training-span exposure |
|---|---:|---:|---:|---:|
| t1_clean_outline_question | 66/66 (100.00%) | 66/66 (100.00%) | 0/66 (0.00%) | 0/66 |
| t1_clean_outline_create | 24/80 (30.00%) | 15/80 (18.75%) | 3/80 (3.75%) | 0/80 |
| t1_clean_outline_set | 80/80 (100.00%) | 67/80 (83.75%) | 26/80 (32.50%) | 0/80 |
| t1_clean_label_removal | 78/78 (100.00%) | 78/78 (100.00%) | 78/78 (100.00%) | 0/78 |
| t1_clean_description_size | 60/64 (93.75%) | 15/64 (23.44%) | 3/64 (4.69%) | 0/64 |
| t1_clean_bare_move | 148/148 (100.00%) | 148/148 (100.00%) | 143/148 (96.62%) | 0/148 |
| t1_clean_create | 29/29 (100.00%) | 29/29 (100.00%) | 29/29 (100.00%) | 0/29 |
| t1_clean_label_setting | 105/105 (100.00%) | 105/105 (100.00%) | 103/105 (98.10%) | 0/105 |
| t1_all_undo_redo_count | 28/28 (100.00%) | 28/28 (100.00%) | 14/28 (50.00%) | 13/28 |
| lowercase_other_affected | 556/825 (67.39%) | 557/825 (67.52%) | 612/825 (74.18%) | 20/825 |
| lowercase_other_affected_original_case | 752/825 (91.15%) | 747/825 (90.55%) | 746/825 (90.42%) | 20/825 |
| data_attested_word_names | 250/374 (66.84%) | 250/374 (66.84%) | 279/374 (74.60%) | 15/374 |
| short3_lowercase | 60/134 (44.78%) | 41/134 (30.60%) | 63/134 (47.01%) | 4/134 |

## W-s0 seen and unseen triggers (gated)

| View/part | Trigger | Requested | Right | Wrong | Extras | Confidently wrong | Right/requested | Cost | Asked | Structural holds | Confidence holds | Unread |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| calibration/calibration | seen | 1218 | 638 | 6 | 0 | 0.93% | 52.38% | 47.45 | 512 | 29 | 483 | 62 |
| calibration/calibration | unseen | 190 | 11 | 0 | 0 | 0.00% | 5.79% | 5.79 | 125 | 28 | 97 | 54 |
| fresh2_test/test | seen | 1201 | 500 | 2 | 0 | 0.40% | 41.63% | 39.97 | 676 | 6 | 670 | 23 |
| fresh2_test/test | unseen | 112 | 40 | 1 | 0 | 2.44% | 35.71% | 26.79 | 62 | 1 | 61 | 9 |
| short3_test/test | seen | 372 | 89 | 6 | 0 | 6.32% | 23.92% | 7.80 | 245 | 7 | 238 | 32 |
| short3_test/test | unseen | 60 | 5 | 0 | 0 | 0.00% | 8.33% | 8.33 | 47 | 2 | 45 | 8 |
| nl_a_development/development | seen | 223 | 7 | 0 | 0 | 0.00% | 3.14% | 3.14 | 164 | 26 | 138 | 52 |
| nl_a_development/development | unseen | 169 | 3 | 0 | 0 | 0.00% | 1.78% | 1.78 | 98 | 17 | 81 | 68 |
| t1_all/all | seen | 1793 | 1417 | 18 | 0 | 1.25% | 79.03% | 68.99 | 358 | 0 | 358 | 0 |
| lowercase_other/all | seen | 1013 | 138 | 0 | 0 | 0.00% | 13.62% | 13.62 | 831 | 16 | 815 | 44 |
| lowercase_other/all | unseen | 89 | 6 | 0 | 0 | 0.00% | 6.74% | 6.74 | 70 | 7 | 63 | 13 |
| t1s/all | seen | 1791 | 1416 | 18 | 0 | 1.26% | 79.06% | 69.01 | 357 | 0 | 357 | 0 |
| t1raw/all | seen | 70 | 54 | 0 | 0 | 0.00% | 77.14% | 77.14 | 16 | 0 | 16 | 0 |
| t1bs/all | seen | 1528 | 1262 | 19 | 0 | 1.48% | 82.59% | 70.16 | 247 | 0 | 247 | 0 |
| short3s/all | seen | 366 | 88 | 6 | 0 | 6.38% | 24.04% | 7.65 | 241 | 7 | 234 | 31 |
| short3s/all | unseen | 58 | 5 | 0 | 0 | 0.00% | 8.62% | 8.62 | 45 | 2 | 43 | 8 |

Seen/unseen trigger partitions cover matched requested actions; extras without a gold trigger remain in the full-set rows. These partitions therefore do not redistribute extras. All four arms and ungated rows are retained in quality-metrics.csv.

## Exposure

| Population | W exact-span matches / requests | F | B | C100 |
|---|---:|---:|---:|---:|
| fresh2_test_clean | 0/639 | 0/639 | 0/639 | 0/639 |
| short3_test_clean | 0/330 | 0/330 | 0/330 | 0/330 |
| nl_a_development_clean | 0/339 | 0/339 | 0/339 | 0/339 |
| t1_clean | 0/1354 | 0/1354 | 0/1354 | 0/1354 |
| t1_clean_outline_question | 0/66 | 0/66 | 0/66 | 0/66 |
| t1_clean_outline_create | 0/80 | 0/80 | 0/80 | 0/80 |
| t1_clean_outline_set | 0/80 | 0/80 | 0/80 | 0/80 |
| t1_clean_label_removal | 0/78 | 0/78 | 0/78 | 0/78 |
| t1_clean_description_size | 0/64 | 0/64 | 0/64 | 0/64 |
| t1_clean_bare_move | 0/148 | 0/148 | 0/148 | 0/148 |
| t1_clean_create | 0/29 | 0/29 | 0/29 | 0/29 |
| t1_clean_label_setting | 0/105 | 0/105 | 0/105 | 0/105 |
| t1_all_undo_redo_count | 13/28 | 13/28 | 3/28 | 3/28 |
| lowercase_other_affected | 20/825 | 20/825 | 20/825 | 20/825 |
| lowercase_other_affected_original_case | 20/825 | 20/825 | 20/825 | 20/825 |
| data_attested_word_names | 15/374 | 15/374 | 15/374 | 15/374 |
| short3_lowercase | 4/134 | 4/134 | 2/134 | 2/134 |

Exposure counts exact equality to a training request span; it is not a claim that all grammatical forms or trigger words are unseen. Undo/redo counts use a finite grammar and remain regression evidence.

## Label errors

Full label-error counts and all retained examples are in the score files; raw-argument completeness is required by R3.

### W-s0

```json
{
  "gated_empty_label_on_nonempty_gold": 0,
  "ungated_empty_label_on_nonempty_gold": 0,
  "gated_by_reason": {},
  "ungated_by_reason": {
    "text:label value": 15,
    "text:label missing": 19,
    "text:label unwanted": 6
  },
  "executed_without_raw_arguments": 0
}
```

### F-s0

```json
{
  "gated_empty_label_on_nonempty_gold": 0,
  "ungated_empty_label_on_nonempty_gold": 0,
  "gated_by_reason": {},
  "ungated_by_reason": {
    "text:label value": 16,
    "text:label unwanted": 4,
    "text:label missing": 21
  },
  "executed_without_raw_arguments": 0
}
```

### B-s0

```json
{
  "gated_empty_label_on_nonempty_gold": 0,
  "ungated_empty_label_on_nonempty_gold": 0,
  "gated_by_reason": {},
  "ungated_by_reason": {
    "text:label value": 6,
    "text:label missing": 17,
    "text:label unwanted": 6
  },
  "executed_without_raw_arguments": 0
}
```

### C100-s0

```json
{
  "gated_empty_label_on_nonempty_gold": 0,
  "ungated_empty_label_on_nonempty_gold": 0,
  "gated_by_reason": {
    "text:label missing": 1
  },
  "ungated_by_reason": {
    "text:label missing": 265,
    "text:label value": 22,
    "text:label unwanted": 21
  },
  "executed_without_raw_arguments": 0
}
```

