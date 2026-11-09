# Views (VSSBERT_SHORT_COMMANDS_PLAN.md step S2)

Counts of the rows of each view as `collect_pair.mjs` reads them (`$C/data/<view>`, C = ~/.cache/diagram-vss-shortcmd). Spelled = after `spell_view.mjs` (the demo's checker).

## t1s: t1 as the demo reads it (1,793 rows, spelled): 1793 rows

| form | rows | narrated | spell_changed | span_lost |
|---|---|---|---|---|
| connect (core) | 171 | 171 | 5 | 0 |
| create (core) | 166 | 166 | 17 | 0 |
| delete (core) | 172 | 172 | 8 | 0 |
| move (core) | 172 | 172 | 11 | 0 |
| set (core) | 171 | 171 | 11 | 0 |
| arrow_label | 79 | 25 | 1 | 0 |
| arrow_style | 80 | 29 | 0 | 0 |
| arrow_unlabel | 78 | 18 | 1 | 0 |
| at_xy | 78 | 27 | 2 | 0 |
| count_arrows | 20 | 20 | 0 | 0 |
| every_arrow | 36 | 26 | 2 | 0 |
| free_text | 40 | 18 | 1 | 0 |
| layout_op | 27 | 26 | 1 | 0 |
| outline_create | 80 | 27 | 1 | 0 |
| outline_q | 69 | 23 | 0 | 0 |
| outline_set | 80 | 23 | 0 | 0 |
| redo | 38 | 38 | 1 | 0 |
| size_desc | 67 | 28 | 3 | 0 |
| tpl_count | 33 | 23 | 2 | 0 |
| tpl_items | 71 | 15 | 2 | 2 |
| undo | 37 | 37 | 0 | 0 |
| undo_count | 28 | 24 | 1 | 0 |
| **core forms** | 852 | | 52 | 0 |

## t1bs: bare view of t1, after check_file.py, spelled (V is its core forms without seen_text, span_lost or a spelling change): 1530 rows

| form | rows | narrated | spell_changed | span_lost |
|---|---|---|---|---|
| connect (core) | 166 | 0 | 0 | 0 |
| create (core) | 95 | 0 | 0 | 0 |
| delete (core) | 150 | 0 | 0 | 0 |
| move (core) | 155 | 0 | 0 | 0 |
| set (core) | 170 | 0 | 0 | 0 |
| arrow_label | 79 | 0 | 0 | 0 |
| arrow_style | 80 | 0 | 0 | 0 |
| arrow_unlabel | 78 | 0 | 0 | 0 |
| at_xy | 77 | 0 | 0 | 0 |
| count_arrows | 5 | 0 | 0 | 0 |
| every_arrow | 29 | 0 | 0 | 0 |
| free_text | 34 | 0 | 0 | 0 |
| layout_op | 13 | 0 | 0 | 0 |
| outline_create | 79 | 0 | 0 | 0 |
| outline_q | 68 | 0 | 0 | 0 |
| outline_set | 80 | 0 | 0 | 0 |
| size_desc | 61 | 0 | 0 | 0 |
| tpl_count | 26 | 0 | 0 | 0 |
| tpl_items | 71 | 0 | 2 | 2 |
| undo_count | 14 | 0 | 0 | 0 |
| **core forms** | 736 | | 0 | 0 |

## r2bs: bare view of synth_short_r2, minus the spans of t1bs, after check_file.py, spelled: 1358 rows

| form | rows | narrated | spell_changed | span_lost |
|---|---|---|---|---|
| connect (core) | 161 | 0 | 0 | 0 |
| create (core) | 21 | 0 | 0 | 0 |
| delete (core) | 120 | 0 | 0 | 0 |
| move (core) | 127 | 0 | 0 | 0 |
| set (core) | 159 | 0 | 0 | 0 |
| arrow_label | 80 | 0 | 0 | 0 |
| arrow_style | 79 | 0 | 0 | 0 |
| arrow_unlabel | 80 | 0 | 0 | 0 |
| at_xy | 73 | 0 | 0 | 0 |
| every_arrow | 22 | 0 | 0 | 0 |
| free_text | 32 | 0 | 0 | 0 |
| layout_op | 4 | 0 | 0 | 0 |
| outline_create | 79 | 0 | 0 | 0 |
| outline_q | 69 | 0 | 0 | 0 |
| outline_set | 80 | 0 | 0 | 0 |
| size_desc | 65 | 0 | 0 | 0 |
| tpl_count | 20 | 0 | 0 | 0 |
| tpl_items | 71 | 0 | 2 | 2 |
| undo_count | 16 | 0 | 0 | 0 |
| **core forms** | 588 | | 0 | 0 |

## short3s: short3 without its 17 messages that carry a pending gold wire (530 -> 513), spelled: 513 rows (spell_changed 12, span_lost 12)

## probes_s: the 10 probes, spelled: 10 rows (spell_changed 1, span_lost 0)

## bench_s: docs/bench/broad.json rows kept by check_rules.mjs (128 items: 10 multi-wire skipped, 5 the Rules do not read as the gold, 113 kept), spelled: 113 rows (spell_changed 3, span_lost 3)

## t1raw: the 70 t1 rows whose text the spell checker changes, as written: 70 rows (spell_changed 0, span_lost 0)

## spell_changed counts (plan 3.3)
| view | rows | spell_changed | span_lost | plan's expected |
|---|---|---|---|---|
| t1s | 1793 | 70 | 2 | 70 |
| t1bs | 1530 | 2 | 2 | not stated (the bare spans keep only the words of the span) |
| r2bs | 1358 | 2 | 2 | (the plan's 82 is for all of synth_short_r2, not measured here) |
| short3s | 513 | 12 | 12 | 12 (all 12 are in the 513 kept messages) |
| probes_s | 10 | 1 | 0 | "alright" -> "right" (probe 10) |
| bench_s | 113 | 3 | 3 | not stated |

## Plan numbers re-counted (cross-check of the normalisation; a mismatch would be a report, not a tuning target)
- The 23 training folders (make_data.py DIRS 9 + SAMPLE_DIRS 2 + registry.json EXTRA_DIRS 12): 24,698 messages, as the SOP-BERT README says (`test_shortcmd.mjs` and the scratch cross-check in Python agree).
- t1 bare spans: 1,539 distinct (after the dedup of 254), of which 9 are seen texts exactly and 14 with punctuation removed: as the plan says.
- Distinct core spans (create, set, move, delete, connect) of t1's bare view that are not seen texts (exact normalisation), before check_file.py: 736 (create 95, set 170, move 155, delete 150, connect 166): as the plan says. With the punctuation-removed normalisation too, 734 (create 93): the plan's number is the exact one.
- check_file.py (`--mode rules`): t1: 1,539 read, 1,539 read exactly by the Rules, kept 1,530 (9 dropped: overlap exact with short3_texts 5, llm_short 3, fresh2 1). Check file `training/sketch/synth/synth_short_t1_bare_check.json`.
- r2 bare view: 725 core spans not seen before the subtraction: as the plan says (create 95, move 150, delete 145, set 165, connect 170). bare_view.py dropped 232 spans that also occur in t1's kept bare view (the plan says 239: that is the count against t1's 1,539 spans before check_file.py; the 7 more are the spans check_file.py drops from t1 for overlapping a test set, and it drops them from r2 too, so the final r2 view is the same either way). check_file.py: 1,367 read, all read exactly, kept 1,358 (overlap exact with short3_texts 6, llm_short 2, fresh2 1). Check file `training/sketch/synth/synth_short_r2_bare_check.json`.

## Record line counts (S3): one line per input message in each of the 8 record files, ids equal to the data ids in order
(checked by `apply_gates.mjs`, which stops with exit 3 on a record without a data row, a data row without a record, or record files out of order)

- repro: [1113] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)
- t1s: [1793] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)
- t1raw: [70] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)
- t1bs: [1530] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)
- r2bs: [1358] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)
- short3s: [513] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)
- probes_s: [10] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)
- bench_s: [113] lines in each of 8 files (rules_bert, rules_own, rules_vss, sop_own, sop_vss, units, vss_bert, vss_own)

## Commands
```
python3 $SK/shortcmd/bare_view.py $SK/llm_bench/synth_short_t1 --id-prefix st1b --out $C/cand/t1b.jsonl
python3 $SK/synth/check_file.py $C/cand/t1b.jsonl $C/data/synth_short_t1_bare --mode rules
python3 $SK/shortcmd/bare_view.py $SK/llm_train/synth_short_r2 --id-prefix sr2b --out $C/cand/r2b.jsonl --exclude-spans $C/data/synth_short_t1_bare
python3 $SK/synth/check_file.py $C/cand/r2b.jsonl $C/data/synth_short_r2_bare --mode rules
node $SK/shortcmd/bench_rows.mjs docs/bench/broad.json $C/cand/bench_rows
# short3 without the messages that have a pending gold wire (collect_pair.mjs stops on a wire without args):
python3 -c "import json; rows=[json.loads(l) for l in open('$SK/llm_bench/short3/batch_01.jsonl') if l.strip()]; open('$C/data/short3_defined/msg_01.jsonl','w').writelines(json.dumps(r,ensure_ascii=False)+'\n' for r in rows if not any('pending' in w for w in r['wires']))"
node $SK/shortcmd/spell_view.mjs <in> $C/data/<view>      # t1s: $SK/llm_bench/synth_short_t1; t1bs: $C/data/synth_short_t1_bare; r2bs: $C/data/synth_short_r2_bare; short3s: $C/data/short3_defined; probes_s: $SK/shortcmd/probes; bench_s: $C/cand/bench_rows
# t1raw: the rows of t1 whose id is in $C/data/t1s/spell_changed_ids.txt, copied unchanged to $C/data/t1raw/msg_01.jsonl
```
The 17 pending short3 messages: s3-0010 s3-0046 s3-0048 s3-0055 s3-0134 s3-0153 s3-0154 s3-0234 s3-0296 s3-0374 s3-0389 s3-0413 s3-0417 s3-0480 s3-0483 s3-0487 s3-0507.
