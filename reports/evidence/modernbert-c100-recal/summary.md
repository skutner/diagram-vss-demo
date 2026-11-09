## F_ctrl against the published score file (`/home/skutner/.cache/diagram-vss-modernbert/arms/C100-s0/eval/cal-fresh2-short3-nl_a.score.json`)

Deep comparison of the blocks of fresh2, short3, collected_1, scenes_test, nl_a, fresh2+short3 (every number, including per kind, per trigger group, paraphrase, sessions) and of threshold, calibrated_on, artifact, reader: **0 differences**.

## The two fits

| | F_ctrl | F_short |
|---|---|---|
| calibrated_on | ["fresh2","short3","nl_a"] | ["fresh2","short3","nl_a","short_synth"] |
| messages | 678 | 1357 |
| requested | 1216 | 1895 |
| produced | 1320 | 2004 |
| l2 | 0.1 | 0.01 |
| oof_auroc | 0.9404 | 0.925 |
| threshold_cost10 | 0.9228085704698455 | 0.8983988308316542 |
| oof_cost10_score | 22.5329 | 27.7045 |
| oof_executed | 373 | 734 |
| act_prior_create | 0.32685052102048145 | 0.5301521062886161 |
| act_prior_default | 0.5386363636363637 | 0.626746506986028 |
| levels (cost1, cost2, cost5, cost, cost20) | {"cost1":0.432,"cost2":0.7556,"cost5":0.8644,"cost":0.9228,"cost20":0.9228} | {"cost1":0.4495,"cost2":0.7343,"cost5":0.87,"cost":0.8984,"cost20":0.8984} |

## Both fits at their own cost-10 threshold (today scoring)

| set/part (view) | requested | F_ctrl right / wrong+extras / executed | F_short right / wrong+extras / executed | cost F_ctrl | cost F_short | difference (F_short - F_ctrl) | ci95 |
|---|---:|---|---|---:|---:|---:|---|
| synth_short_t1/all (gold) | 1793 | 556 / 39 / 595 | 786 / 8 / 794 | 9.258226 | 39.375349 | 30.1171 | [22.2841,37.7327] |
| short_synth/test (gold) | 1318 | 414 / 24 / 438 | 569 / 5 / 574 | 13.201821 | 39.377845 | 26.176 | [18.3612,34.1426] |
| short3/test (gold) | 432 | 53 / 5 / 58 | 91 / 6 / 97 | 0.694444 | 7.175926 | 6.4815 | [0,11.1111] |
| fresh2/test (gold) | 1313 | 682 / 8 / 690 | 729 / 13 / 742 | 45.8492 | 45.620716 | -0.2285 | [-4.519,3.577] |
| nl_a/development (opus) | 392 | 7 / 1 / 8 | 10 / 4 / 14 | -0.765306 | -7.653061 | -6.8878 | [-17.8667,0.5764] |
| collected_1/all (gold) | 44 | 0 / 1 / 1 | 0 / 3 / 3 | -22.727273 | -68.181818 | -45.4545 | [-113.6364,0] |
| scenes_test/all (gold) | 163 | 46 / 0 / 46 | 52 / 3 / 55 | 28.220859 | 13.496933 | -14.7239 | null |

collected_1 by kind (26 real messages each as sent and as corrected: too few to decide anything): `{"ctrl":{"as_sent":{"requested":22,"right":0,"wrong":1,"extras":0,"executed":1},"corrected":{"requested":22,"right":0,"wrong":0,"extras":0,"executed":0}},"short":{"as_sent":{"requested":22,"right":0,"wrong":2,"extras":0,"executed":2},"corrected":{"requested":22,"right":0,"wrong":1,"extras":0,"executed":1}}}`

Actions executed per 100 `nothing_to_do` messages (nl_a development): `{"ctrl":{"messages":18,"at_threshold":0,"all_executed":61.111111},"short":{"messages":18,"at_threshold":0,"all_executed":61.111111}}`

## Per form: short_synth/test (join by id to meta.form; at each fit's own threshold; all = every request executed)

| form | requested | F_ctrl all right | F_ctrl executed right / wrong+extras | F_short all right | F_short executed right / wrong+extras |
|---|---:|---:|---|---:|---|
| set | 117 | 117 | 112 / 0 | 117 | 115 / 0 |
| delete | 112 | 112 | 18 / 0 | 112 | 98 / 0 |
| move | 108 | 82 | 24 / 1 | 82 | 55 / 4 |
| connect | 107 | 107 | 102 / 0 | 107 | 99 / 0 |
| create | 104 | 104 | 19 / 0 | 104 | 37 / 0 |
| outline_set | 59 | 21 | 2 / 0 | 21 | 2 / 0 |
| outline_create | 57 | 0 | 0 / 0 | 0 | 0 / 0 |
| arrow_unlabel | 56 | 0 | 0 / 0 | 0 | 0 / 0 |
| redo | 54 | 54 | 16 / 0 | 54 | 26 / 0 |
| at_xy | 54 | 54 | 23 / 0 | 54 | 30 / 0 |
| arrow_label | 53 | 53 | 35 / 0 | 53 | 5 / 0 |
| outline_q | 52 | 0 | 0 / 22 | 0 | 0 / 0 |
| tpl_items | 52 | 52 | 0 / 0 | 52 | 3 / 0 |
| size_desc | 48 | 9 | 4 / 0 | 9 | 4 / 0 |
| arrow_style | 47 | 47 | 19 / 0 | 47 | 15 / 0 |
| undo | 45 | 45 | 13 / 0 | 45 | 35 / 0 |
| every_arrow | 45 | 44 | 3 / 0 | 44 | 21 / 0 |
| free_text | 41 | 41 | 20 / 0 | 41 | 21 / 0 |
| tpl_count | 34 | 34 | 0 / 0 | 34 | 1 / 0 |
| undo_count | 31 | 0 | 0 / 1 | 0 | 0 / 1 |
| layout_op | 26 | 22 | 0 / 0 | 22 | 0 / 0 |
| count_arrows | 16 | 16 | 4 / 0 | 16 | 2 / 0 |

## Per form: synth_short_t1/all (join by id to meta.form; at each fit's own threshold; all = every request executed)

| form | requested | F_ctrl all right | F_ctrl executed right / wrong+extras | F_short all right | F_short executed right / wrong+extras |
|---|---:|---:|---|---:|---|
| move | 172 | 134 | 25 / 0 | 134 | 82 / 8 |
| delete | 172 | 172 | 29 / 0 | 172 | 141 / 0 |
| connect | 171 | 170 | 162 / 0 | 170 | 154 / 0 |
| set | 171 | 171 | 159 / 0 | 171 | 167 / 0 |
| create | 166 | 166 | 29 / 0 | 166 | 68 / 0 |
| outline_create | 80 | 1 | 0 / 0 | 1 | 0 / 0 |
| outline_set | 80 | 24 | 0 / 2 | 24 | 0 / 0 |
| arrow_style | 80 | 80 | 35 / 0 | 80 | 30 / 0 |
| arrow_label | 79 | 79 | 42 / 0 | 79 | 4 / 0 |
| at_xy | 78 | 78 | 32 / 0 | 78 | 48 / 0 |
| arrow_unlabel | 78 | 0 | 0 / 0 | 0 | 0 / 0 |
| tpl_items | 71 | 71 | 2 / 0 | 71 | 5 / 0 |
| outline_q | 69 | 0 | 0 / 37 | 0 | 0 / 0 |
| size_desc | 67 | 11 | 5 / 0 | 11 | 3 / 0 |
| free_text | 40 | 40 | 20 / 0 | 40 | 22 / 0 |
| redo | 38 | 38 | 3 / 0 | 38 | 17 / 0 |
| undo | 37 | 37 | 7 / 0 | 37 | 29 / 0 |
| every_arrow | 36 | 35 | 5 / 0 | 35 | 13 / 0 |
| tpl_count | 33 | 33 | 0 / 0 | 33 | 1 / 0 |
| undo_count | 28 | 0 | 0 / 0 | 0 | 0 / 0 |
| layout_op | 27 | 25 | 0 / 0 | 25 | 0 / 0 |
| count_arrows | 20 | 20 | 1 / 0 | 20 | 2 / 0 |

## What F_short executes wrong, per form and per record cause (`cutter` = the read span is not a gold span, `heads` = the cut is right and the reading is not)

| set, form (record cause) | executed wrong or extra |
|---|---:|
| synth_short_t1/all move (heads) | 8 |
| short_synth/test move (heads) | 4 |
| short_synth/test undo_count (heads) | 1 |

Each one, with the reading, the gold and the confidence: `summary.json`, `f_short_executed_wrong`.

