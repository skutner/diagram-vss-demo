# Qwen3 as shipped on the natural-language sets: what the baseline is read as (written before it finished)

Written 2026-11-05 21:08 local, while `collect_qwen.mjs` was running on `collected_1` and `nl_a` (11 of 662 records written, none of `nl_a`'s scored).

- **Run.** The shipped reader (pinned GGUF `9465e63a…`, the fixed prompt `1d11a4c2…`, the JSON schema, `docs/js/qwen-contract.js` validation and wires) through a native llama-server (b12099, CPU, greedy), on `nl_a` (both parts) and `collected_1`; later the test parts of fresh2 and short3 and `scenes_test`. Context as `collect_set.mjs`: names, and the gold's last shapes in sessions. Scored by `training/neural/parity/score_arm.mjs` `scorePart` with no confidence (every validated request executed), either teacher on `nl_a`.
- **Floor.** A reader that writes nothing: 0 right, 0 wrong, cost score 0, by construction; published beside it.
- **What it is used for.** It is the zero of every fine-tuning arm: an arm's gain is measured against it on the same messages, and against SOP-BERT (9.2% right on the `nl_a` development part, every request executed, either teacher).
- **Read as, fixed now:**
  - right share on the `nl_a` development part **≥ 9.2%** (SOP-BERT's): the pretrained model already reads some of this language without training; fine-tuning has to teach the legend and the output, not English.
  - **< 9.2%**: the prompt alone does not carry it; any later gain comes from the training data, and the fine-tuned arms must be compared with SOP-BERT trained on the same data.
  - Either way the baseline does not stop the plan: the shipped reader has two examples and no training, so a low number is expected and says little about a fine-tuned model. What could stop it is the overfit test and the speed, not this number.
- **Also reported:** wrong share and extras (a prompted model that writes many requests will be confidently wrong often); validation failures by cause; requests blocked; outputs that hit a degenerate loop (more than 512 generated tokens).

Note added 21:53, after the review, not a change of the reading above: the 9.2% came from score files written at 20:31. `score_arm.mjs` and
`arm_lib.mjs` changed at 21:09 and 21:13 (another session). With the current scorer (`score_arm.mjs` SHA-256 `cab3e964…`) SOP-BERT on the
`nl_a` development part is 36/412 = 8.7% with either teacher, 35/392 = 8.9% against Opus (`reports/evidence/qwen3-finetune-plan/sop_rescored_current_scorer.json`).
The reading above is applied to the current number; the conclusion does not depend on the difference.

Note added 22:15: "none of `nl_a`'s scored" above is not exact. The 3-message smoke run of 20:52 (before this file was written) printed the
outcomes of `nl-01-003`, `nl-01-004` and `nl-01-005` of the `nl_a` development part: one wrong and two extras. The reading above does not
depend on them.
