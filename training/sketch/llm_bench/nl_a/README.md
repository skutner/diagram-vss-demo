# nl_a: natural-language development and calibration set (test data: keep out of training)

610 messages for `training/neural/MODERNBERT_PARITY_PLAN.md`, written 2026-11-05 with no access to the repository's data, examples or known failures. Half are the confidence's calibration part, half are for comparing arms: `sha256(session or group or id) % 2 == 0` is calibration (`training/neural/parity/sets.mjs`).

| files | what |
|---|---|
| `texts/batch_NN.jsonl` | the texts, saved before any label: `{id, domain, kind, session?, group?, setup?, text}` |
| `opus/batch_NN.jsonl` | labels by Claude Opus 5.5, medium effort |
| `gpt/batch_NN.jsonl` | labels by gpt-6.1-sol, high effort, by `codex exec` in a folder holding only the spec and the texts |

Both label folders are first passes: no reader was run and no label was changed after the engine replay. Names and groups in the label rows come from `training/neural/parity/validate_rows.mjs --write`. A session row after a failed step carries `unreliable: true`: its `names` are the best replay, and it is left out of measures by engine effect. Outputs of the validator: `reports/evidence/modernbert-parity-baseline/nl_a/` (20 and 17 rows with an engine failure, of 610).

| batches | writer | what |
|---|---|---|
| 01, 02, 03, 06 | gpt-6.1-sol, high | whole messages: networks, cloud, software, wards, warehouses, labs, law, schools, families, recipes, business, floor plans, games, sports |
| 04 | gpt-6.1-sol, high | paraphrase groups |
| 05 | gpt-6.1-sol, high | step-by-step sessions |
| 07, 08, 09, 12 | Claude Opus 5.5, medium | whole messages: sensors, payments, factories, clinics, libraries, classes, weddings, games, funnels, seating, tactics, storyboards |
| 10 | Claude Opus 5.5, medium | paraphrase groups |
| 11 | Claude Opus 5.5, medium | step-by-step sessions |

Writers read only `../NL_TEST_SPEC.md`; annotators read only `../../llm_train/ANNOTATION_SPEC.md` and the texts. An agent's compliance with "read only" is not enforced by a tool for the Opus sessions. In batches 05 and 06, 7 Opus labels (05-025, 05-026, 06-001, 06-019, 06-035, 06-039, 06-040) changed after that annotator asked its advisor (the same model family), so those are not one annotator's judgement alone.
