# synth_short_t1: a fresh set of synthetic short commands (2026-11-07)

**Synthetic, template-made test data** (AGENTS.md, owner 2026-11-02 22:04), not LLM-written. It is the deciding test of
`training/neural/MODERNBERT_RECAL_PLAN.md` (refit of the ModernBERT C100 confidence with short commands). It is a test set only: no model
trained on it and no confidence is fitted on it.

What it is: the same generator as `training/sketch/llm_train/synth_short_r2` (`gen_short_r2.py`) with another seed and its own ids (`st1-*`),
then cleaned. Gold = the Rules' reading: a message is kept only when today's Rules (`docs/js/logic.js`) read it exactly as generated.

Made by (from the repository root; the candidate file stayed outside the repository):

```
python3 training/sketch/synth/gen_short_r2.py --seed 1 --n 2400 --id-prefix st1 --out <scratch>/t1_cand.jsonl
python3 training/sketch/synth/dedup_against.py <scratch>/t1_cand.jsonl <scratch>/t1_dedup.jsonl --report <report.json> \
  --against training/sketch/llm_train/synth_short_r2 --against $D/train.jsonl --against $D/cut_train.jsonl \
  --against training/sketch/llm_bench/nl_a/opus --against training/sketch/llm_bench/nl_a/gpt \
  --against training/sketch/llm_bench/nl_b/opus --against training/sketch/llm_bench/nl_b/gpt
python3 training/sketch/synth/check_file.py <scratch>/t1_dedup.jsonl training/sketch/llm_bench/synth_short_t1 --mode rules
python3 training/sketch/synth/size_gate.py training/sketch/llm_bench/synth_short_t1 --min-total 1500 --min-form create:120
```

`$D` = `~/.cache/diagram-vss-modernbert/arms/data/C100` (the training data of C100). Counts: 2,400 candidates; 1,830 after `dedup_against.py`
(481 equal a text of `synth_short_r2`, 54 repeat a text inside the file, 34 equal a text of C100's `train.jsonl`, 1 a text of its
`cut_train.jsonl`; none of `nl_a` / `nl_b`); 1,793 after `check_file.py` (37 dropped: 21 the Rules read as no request, 4 read as another act,
2 overlap a test text of `check_file.py`'s list, 10 other differences of the Rules; `synth/synth_short_t1_check.json`).
Size gate (fixed before any fit): at least 1,500 messages and at least 120 of form `create`: met (1,793 and 166).

| form (meta.form) | candidates | after dedup | kept |
|---|---|---|---|
| move | 172 | 172 | 172 |
| delete | 172 | 172 | 172 |
| connect | 171 | 171 | 171 |
| set | 172 | 171 | 171 |
| create ("add a ‹colour› ‹shape›", always with words around it, like every core form of the generator; never bare, never "draw") | 171 | 166 | 166 |
| outline_create | 80 | 80 | 80 |
| outline_set | 80 | 80 | 80 |
| arrow_style | 80 | 80 | 80 |
| arrow_label | 80 | 79 | 79 |
| at_xy | 80 | 78 | 78 |
| arrow_unlabel | 80 | 78 | 78 |
| tpl_items | 80 | 80 | 71 |
| outline_q | 80 | 76 | 69 |
| size_desc | 80 | 68 | 67 |
| free_text | 80 | 41 | 40 |
| redo | 171 | 46 | 38 |
| undo | 171 | 44 | 37 |
| every_arrow | 80 | 36 | 36 |
| tpl_count | 80 | 34 | 33 |
| undo_count | 80 | 28 | 28 |
| layout_op | 80 | 27 | 27 |
| count_arrows | 80 | 23 | 20 |

Forms with few possible texts (undo, redo, layout, arrow counts) are thinned by the dedup; that is not a gate. 1,279 of the 1,793 messages are
narrated (a request wrapped in words before or after it, `meta.narration`); each message holds one request.

What this test measures, said plainly: agreement with the Rules on short, template-made commands of this generator's forms. It is
in-distribution for a confidence fitted on `synth_short_r2`. The guard against fitting the generator is `short3` (short commands written by an
LLM writer blind to the Rules' cues). Rows carry `meta.form`; records do not, so a per-form number is joined by id.

Read by `training/neural/parity/sets.mjs` as set `synth_short_t1` (part `all`, kind `short`).
