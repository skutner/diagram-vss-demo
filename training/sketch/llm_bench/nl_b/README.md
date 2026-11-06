# nl_b: the headline test set of the ModernBERT parity plan (test data: keep out of training)

601 natural-language messages for `training/neural/MODERNBERT_PARITY_PLAN.md`, written 2026-11-05 by a model family that wrote no training text, and labelled blind by both teachers. **Sealed until M5's seed 0 is frozen:** no reader reads it and no number on it is looked at before then (`training/neural/MODERNBERT_RUNLOG.md`, "nl_b: written now, sealed until M5"). The texts are read-only, and `texts.sha256` holds their hashes.

| files | what |
|---|---|
| `texts/batch_NN.jsonl` | the texts, saved before any label: `{id, domain, kind, session?, group?, setup?, text}` |
| `opus/batch_NN.jsonl` | labels by Claude Opus 5.5, medium effort |
| `gpt/batch_NN.jsonl` | labels by gpt-6.1-sol, high effort, by `codex exec` |

**Writers.** Each worked in an empty folder holding only `../NL_TEST_SPEC.md`, and was given a domain and the people.

| batches | writer | what |
|---|---|---|
| 01, 02, 03, 06 | gpt-6.1-sol, high | whole messages: wiring, home automation, solar, IT inventories, call-centre flows, stage blocking, film schedules, festivals, museums, farms, irrigation, beekeeping, airports, bus routes, depots, brackets, rotas, org charts |
| 04 | gpt-6.1-sol, high | paraphrase groups |
| 05 | gpt-6.1-sol, high | step-by-step sessions |
| 07, 08, 09, 12 | gpt-6-astra, xhigh | whole messages: chemistry, biology, astronomy, rock layers, weather, customer journeys, help desks, onboarding, claims, moving house, travel, renovation, fitness, budgets, board and video games, escape rooms |
| 10 | gpt-6-astra, xhigh | paraphrase groups |
| 11 | gpt-6-astra, xhigh | step-by-step sessions |

Rows: 601. Kinds: long 57, short 35, self_correction 36, complaint 30, reference 42, nothing_to_do 29, indirect 32, typos 28, ambiguous 19, session 125, dictated 30, paraphrase 112, fragment 12, translated 14. 17 sessions and 24 paraphrase groups. 457 rows carry a `setup`.

**Labellers.** Each worked in a folder holding only `../../llm_train/ANNOTATION_SPEC.md` and its texts, and ran no engine or reader:
- Opus 5.5, medium: six sessions, two batches each.
- gpt-6.1-sol, high: four `codex exec` runs, three batches each.

Both label folders are first passes: no label was changed after the engine replay. `names` and `groups` come from `training/neural/parity/validate_rows.mjs --write`. A session row after a failed step carries `unreliable: true` and is left out of measures by engine effect.

**Engine replay** (outputs in `reports/evidence/modernbert-parity-baseline/nl_b/`):
- Opus: 714 wires, 96 rows with no wire, 46 hard failures on 29 rows (39 engine, 7 span), 54 rows unreliable.
- gpt: 644 wires, 161 rows with no wire, 24 hard failures.
