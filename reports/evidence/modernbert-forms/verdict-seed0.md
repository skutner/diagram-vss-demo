# ModernBERT forms: seed0 verdict: **DID NOT PASS**

Campaign modernbert-forms-2026-11-08; plan 0635a2470ad3; forms protocol 61524cc13da0. Only a row with status pass passes.

## P3 PASS: B-s0 passes Guard G against C100-s0 and the output-contract conditions

- Guard G vs C100-s0, fresh2_test: candidate cost 41.203351, comparator cost 41.736481; clean subset reported: {"difference":1.0955,"ci95":[-12.4194,16.9468],"ci95_reason":null}
- Guard G vs C100-s0, short3_test: candidate cost 8.796296, comparator cost 8.101852; clean subset reported: {"difference":0.6061,"ci95":[-18.0982,20.1923],"ci95_reason":null}
- Guard G vs C100-s0, nl_a_development: candidate cost -7.908163, comparator cost -12.5; clean subset reported: {"difference":7.9646,"ci95":[-7.7295,28.1967],"ci95_reason":null}
- pass: G B-s0 vs C100-s0: fresh2_test/test cost difference >= -5 (-0.5331)
- pass: G B-s0 vs C100-s0: fresh2_test/test paired interval upper end >= 0 (9.7724)
- pass: G B-s0 vs C100-s0: fresh2_test/test wrong+extras per 100 requested up by at most 1 (-0.609291)
- pass: G B-s0 vs C100-s0: short3_test/test cost difference >= -5 (0.6944)
- pass: G B-s0 vs C100-s0: short3_test/test paired interval upper end >= 0 (15.7754)
- pass: G B-s0 vs C100-s0: short3_test/test wrong+extras per 100 requested up by at most 1 (0)
- pass: G B-s0 vs C100-s0: nl_a_development/development cost difference >= -5 (4.5918)
- pass: G B-s0 vs C100-s0: nl_a_development/development paired interval upper end >= 0 (22.191)
- pass: G B-s0 vs C100-s0: nl_a_development/development wrong+extras per 100 requested up by at most 1 (-0.5102040000000001)
- pass: B-s0: output contract (acceptance 9-14), evidence bound to this arm

## F1 FAIL: F-s0 versus B-s0 on t1_clean and the clean create subset

- FAIL: t1_clean gated cost difference F-B >= 5 (3.0281)
- FAIL: t1_clean paired interval lower end > 0 (-6.094)
- pass: F-s0 executes something at its gate on t1_clean (1130)
- pass: B-s0 executes something at its gate on t1_clean (825)
- FAIL: confidently wrong share does not increase (F <= B) (0.019603)
- pass: t1_clean is a supported population (F-s0) (true)
- pass: t1_clean is a supported population (B-s0) (true)
- pass: t1_clean_create is a supported population (F-s0) (true)
- pass: t1_clean_create is a supported population (B-s0) (true)
- FAIL: clean create subset gated cost: paired interval lower end > 0 (-23.0769)

## F2 FAIL: F-s0: fixed form capability (ungated right / all gold)

- exposure (display only) t1_clean_outline_question: 66 messages / 65 groups; sharing a group with training: B 0 msgs / 0 groups; F 0 msgs / 0 groups; C100 0 msgs / 0 groups
- exposure (display only) t1_clean_outline_create: 80 messages / 79 groups; sharing a group with training: B 0 msgs / 0 groups; F 0 msgs / 0 groups; C100 0 msgs / 0 groups
- exposure (display only) t1_clean_outline_set: 80 messages / 80 groups; sharing a group with training: B 0 msgs / 0 groups; F 0 msgs / 0 groups; C100 0 msgs / 0 groups
- exposure (display only) t1_clean_label_removal: 78 messages / 78 groups; sharing a group with training: B 0 msgs / 0 groups; F 0 msgs / 0 groups; C100 0 msgs / 0 groups
- exposure (display only) t1_clean_description_size: 64 messages / 58 groups; sharing a group with training: B 0 msgs / 0 groups; F 0 msgs / 0 groups; C100 0 msgs / 0 groups
- exposure (display only) t1_clean_bare_move: 148 messages / 132 groups; sharing a group with training: B 0 msgs / 0 groups; F 0 msgs / 0 groups; C100 0 msgs / 0 groups
- exposure (display only) t1_all_undo_redo_count: 28 messages / 14 groups; sharing a group with training: B 3 msgs / 2 groups; F 13 msgs / 8 groups; C100 3 msgs / 2 groups
- pass: outline_question ungated right share >= 0.9 (1)
- FAIL: outline_create ungated right share >= 0.9 (0.1875)
- FAIL: outline_set ungated right share >= 0.9 (0.8375)
- pass: label_removal ungated right share >= 0.9 (1)
- FAIL: description_size ungated right share >= 0.8 (0.234375)
- pass: bare_move ungated right share >= 0.95 (1)
- pass: undo/redo count ungated right share >= 0.9 (1)
- pass: F-s0: absent/count oracle for undo/redo counts, evidence bound to this arm

## contract:F-s0 PASS: F-s0: output-contract conditions (bound evidence)

- pass: F-s0: output contract (acceptance 9-14), evidence bound to this arm

## F3 FAIL: F-s0: safety and retained capability (Guard G against B-s0 and C100-s0; label setting; lower case)

- exposure (display only) t1_clean_label_setting: 105 messages / 99 groups; sharing a group with training: B 0 msgs / 0 groups; F 0 msgs / 0 groups; C100 0 msgs / 0 groups
- exposure (display only) lowercase_other_affected: 351 messages / 278 groups; sharing a group with training: B 90 msgs / 17 groups; F 90 msgs / 17 groups; C100 90 msgs / 17 groups
- exposure (display only) short3_lowercase: 109 messages / 105 groups; sharing a group with training: B 6 msgs / 2 groups; F 8 msgs / 4 groups; C100 6 msgs / 2 groups
- exposure (display only) fresh2_test (full guard view): 405 messages / 318 groups; sharing a group with training: B 109 msgs / 22 groups; F 109 msgs / 22 groups; C100 109 msgs / 22 groups
- exposure (display only) short3_test (full guard view): 340 messages / 309 groups; sharing a group with training: B 49 msgs / 19 groups; F 51 msgs / 21 groups; C100 49 msgs / 19 groups
- exposure (display only) nl_a_development (full guard view): 300 messages / 171 groups; sharing a group with training: B 43 msgs / 5 groups; F 44 msgs / 6 groups; C100 43 msgs / 5 groups
- Guard G vs B-s0, fresh2_test: candidate cost 45.392232, comparator cost 41.203351; clean subset reported: {"difference":5.0078,"ci95":[-2.719,13.0709],"ci95_reason":null}
- Guard G vs B-s0, short3_test: candidate cost 7.87037, comparator cost 8.796296; clean subset reported: {"difference":0.303,"ci95":[-19.5846,18.9911],"ci95_reason":null}
- Guard G vs B-s0, nl_a_development: candidate cost -6.887755, comparator cost -7.908163; clean subset reported: {"difference":-1.7699,"ci95":[-13.4483,7.4499],"ci95_reason":null}
- Guard G vs C100-s0, fresh2_test: candidate cost 45.392232, comparator cost 41.736481; clean subset reported: {"difference":6.1033,"ci95":[-7.2131,23.0294],"ci95_reason":null}
- Guard G vs C100-s0, short3_test: candidate cost 7.87037, comparator cost 8.101852; clean subset reported: {"difference":0.9091,"ci95":[-17.6471,19.3452],"ci95_reason":null}
- Guard G vs C100-s0, nl_a_development: candidate cost -6.887755, comparator cost -12.5; clean subset reported: {"difference":6.1947,"ci95":[-7.2948,22.1212],"ci95_reason":null}
- pass: G F-s0 vs B-s0: fresh2_test/test cost difference >= -5 (4.1889)
- pass: G F-s0 vs B-s0: fresh2_test/test paired interval upper end >= 0 (10.1574)
- pass: G F-s0 vs B-s0: fresh2_test/test wrong+extras per 100 requested up by at most 1 (0)
- pass: G F-s0 vs B-s0: short3_test/test cost difference >= -5 (-0.9259)
- pass: G F-s0 vs B-s0: short3_test/test paired interval upper end >= 0 (15.3453)
- pass: G F-s0 vs B-s0: short3_test/test wrong+extras per 100 requested up by at most 1 (0.462963)
- pass: G F-s0 vs B-s0: nl_a_development/development cost difference >= -5 (1.0204)
- pass: G F-s0 vs B-s0: nl_a_development/development paired interval upper end >= 0 (10.8642)
- pass: G F-s0 vs B-s0: nl_a_development/development wrong+extras per 100 requested up by at most 1 (0)
- pass: G F-s0 vs C100-s0: fresh2_test/test cost difference >= -5 (3.6558)
- pass: G F-s0 vs C100-s0: fresh2_test/test paired interval upper end >= 0 (14.0845)
- pass: G F-s0 vs C100-s0: fresh2_test/test wrong+extras per 100 requested up by at most 1 (-0.609291)
- pass: G F-s0 vs C100-s0: short3_test/test cost difference >= -5 (-0.2315)
- pass: G F-s0 vs C100-s0: short3_test/test paired interval upper end >= 0 (14.5251)
- pass: G F-s0 vs C100-s0: short3_test/test wrong+extras per 100 requested up by at most 1 (0.462963)
- pass: G F-s0 vs C100-s0: nl_a_development/development cost difference >= -5 (5.6122)
- pass: G F-s0 vs C100-s0: nl_a_development/development paired interval upper end >= 0 (19.6319)
- pass: G F-s0 vs C100-s0: nl_a_development/development wrong+extras per 100 requested up by at most 1 (-0.5102040000000001)
- pass: label-setting ungated right share falls by at most 2 points versus B-s0 (-1.9047999999999954)
- pass: gated empty-label outputs against nonempty gold across the evaluated views <= 0 (0)
- pass: every executed request has its raw arguments (label errors are complete) (0)
- pass: lowercase_other_affected is a supported population (F-s0) (true)
- pass: lowercase_other_affected is a supported population (B-s0) (true)
- FAIL: lowercase_other_affected: ungated right share loss <= 2 points versus B-s0 (6.666600000000001)
- pass: lowercase_other_affected: adds at most 1 confident mistake per 100 requests versus B-s0 (0.242424)
- pass: short3_lowercase is an available population with requests (F-s0) (134)
- pass: short3_lowercase is an available population with requests (B-s0) (134)
- FAIL: short3_lowercase: ungated right share loss <= 2 points versus B-s0 (16.417899999999996)
- pass: short3_lowercase: adds at most 1 confident mistake per 100 requests versus B-s0 (-0.746269)

## P4 PASS: honest completion and export of every accepted training run

- pass: F-s0 binding: training folder is the registered one (/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/F-s0)
- pass: F-s0 binding: model folder is F-s0's registered export (/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/F-s0/export/modernbert-F-s0)
- pass: F-s0 binding: training data folder is F's registered one (/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/data-v2/F)
- pass: F-s0 binding: F data manifest exists and is of arm F (F)
- pass: F-s0 binding: F data manifest is of this campaign (modernbert-forms-2026-11-08)
- pass: F-s0 binding: F data manifest binds this protocol's F membership sha256 (57a5242c11d428b7b463a6afa45355b5a5d924cf9a6a9af6d79e49e4f5ca53d8)
- pass: F-s0 binding: F data manifest binds this forms protocol file (61524cc13da0f20a0212def83b7f0855e6bad557fdfd99b3ceb3e36b857d2f39)
- pass: F-s0 binding: run/complete.json exists (true)
- pass: F-s0 binding: run is complete with the full schedule
- pass: F-s0 binding: run seed is 0 (0)
- pass: F-s0 binding: run trained on this data (train.jsonl sha256) (bfdb92373d8eecdc7902d23e309c68d29fc610ed63334ddad7f18213fb90c7ce)
- pass: F-s0 binding: export receipt weights sha256 equals the sha256 of the run's weights file (95e9a5043620a05595eeb009aa1b7c8e97737f74abaf97b756182980e7d07d34)
- pass: F-s0 training: complete === true (true)
- pass: F-s0 training: full_schedule === true (true)
- pass: F-s0 training: max_updates === 0 (0)
- pass: F-s0 training: seed equals the bundle's (0)
- pass: F-s0 training: recipe (settings without the seed) equals the reference recipe
- pass: F-s0 training: update === total > 0 and epoch === epochs
- pass: F-s0 training: training data train.jsonl sha256 equals the bundle's (bfdb92373d8eecdc7902d23e309c68d29fc610ed63334ddad7f18213fb90c7ce)
- pass: F-s0 training: data requests equal the rows of train.jsonl
- pass: F-s0 training: data messages / requests equal the data manifest
- pass: F-s0 training: export receipt: weights full_schedule === true (true)
- pass: F-s0 training: export receipt: weights update/total equal the run's
- pass: F-s0 training: export receipt: no source change since training
- pass: F-s0 training: export receipt: output contract bound to the parent protocol (3999991890f1a92b811fbe0cde86ccdf35ca38e71606b45d0ec14ea5dc872e78)
- pass: F-s0 export record (reported, not a parity claim): receipt passed=false (false)
- pass: B-s0 binding: training folder is the registered one (/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/B-s0)
- pass: B-s0 binding: model folder is B-s0's registered export (/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/B-s0/export/modernbert-B-s0)
- pass: B-s0 binding: training data folder is B's registered one (/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/data/B)
- pass: B-s0 binding: B data manifest is of arm B (B)
- pass: B-s0 binding: B data manifest sha256 is the pinned one (2b102ef3f901eb25e3e38e49b6daa664ac740c5376b1b11a8aba806bd6bfa7e6)
- pass: B-s0 binding: run/complete.json exists (true)
- pass: B-s0 binding: run is complete with the full schedule
- pass: B-s0 binding: run seed is 0 (0)
- pass: B-s0 binding: run trained on this data (train.jsonl sha256) (f0a539a06e8701c39e8a9a6e2c143f04e822cf0bd0699b84bceadd154aab5e97)
- pass: B-s0 binding: export receipt weights sha256 equals the sha256 of the run's weights file (08095e865e9e81b82a434b0fec822bab581704c023ad6b467bdbc2196ef5244f)
- pass: B-s0 training: complete === true (true)
- pass: B-s0 training: full_schedule === true (true)
- pass: B-s0 training: max_updates === 0 (0)
- pass: B-s0 training: seed equals the bundle's (0)
- pass: B-s0 training: recipe (settings without the seed) equals the reference recipe
- pass: B-s0 training: update === total > 0 and epoch === epochs
- pass: B-s0 training: training data train.jsonl sha256 equals the bundle's (f0a539a06e8701c39e8a9a6e2c143f04e822cf0bd0699b84bceadd154aab5e97)
- pass: B-s0 training: data requests equal the rows of train.jsonl
- pass: B-s0 training: export receipt: weights full_schedule === true (true)
- pass: B-s0 training: export receipt: weights update/total equal the run's
- pass: B-s0 training: export receipt: no source change since training
- pass: B-s0 training: export receipt: output contract bound to the parent protocol (3999991890f1a92b811fbe0cde86ccdf35ca38e71606b45d0ec14ea5dc872e78)
- pass: B-s0 export record (reported, not a parity claim): receipt passed=false (false)

