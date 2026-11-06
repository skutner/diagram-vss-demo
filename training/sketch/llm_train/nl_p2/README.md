# nl_p2: natural-language training data, round 2 (2026-11-06)

1,518 messages for `training/neural/MODERNBERT_RUNLOG.md`, "Round 2 (`nl_p2`) and the learning curve". Written from `../NL_TRAIN_SPEC.md` and `../../llm_bench/NL_TEST_SPEC.md` only; texts saved before any label (`texts.sha256`).

| batches | writer | what |
|---|---|---|
| 01-12 | Claude Sonnet 5.5, medium | whole messages (01, 03, 05, 07, 09, 11), sessions (02, 08), paraphrase groups (04, 12), requests buried in chat / nothing to do / several requests (06, 10) |
| 13-16 | Claude Haiku 5.5, medium | terse, typo-heavy, dictated (13, 15), sessions (14), group-chat focus batch (16) |
| 17-20 | Claude Opus 5.5, medium | whole messages (17, 19), sessions (18), focus batch (20) |
| 21-30 | gpt-6.1-sol, high, by `codex exec` in a folder holding only the two specs | whole messages (21, 23, 25, 27), sessions (22, 28), focus batches (24, 29), paraphrase groups (26, 30) |

| folder | what |
|---|---|
| `texts/` | the texts, as saved |
| `opus_first/` | first labels, Claude Opus 5.5 medium, blind |
| `gpt/` | second labels, gpt-6.1-sol high, blind: a check, never training labels |
| `opus/` | the training labels: the first labels with 414 rows adjudicated by Opus 5.5 high (blind A/B; `adjudicated` field), `names` and `groups` from `validate_rows.mjs --write` |

Gates (`reports/evidence/modernbert-parity-baseline/nl_p2/`): teachers' agreement 75.7% (gate 65.7%); hard engine failures after adjudication 39 (2 are the writers' setups); round trip with `ROLE_TOO_RICH=context` passed in every curve build. Three texts equal a test text ("undo" twice, "make the title bigger", "bigger"); `training/neural/parity/nl_share.py` leaves such rows out of training.
