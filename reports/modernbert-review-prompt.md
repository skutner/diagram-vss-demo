# Prompt for an independent review of ModernBERT (give this whole file to a new Codex or Claude Code session)

You are an independent reviewer of the ModernBERT diagram reader in the repository `/home/skutner/browserLLM/diagram-vss-demo`
(GitHub: `skutner/diagram-vss-demo`; the demo is served from `docs/` by GitHub Pages: https://skutner.github.io/diagram-vss-demo/).
The owner wants a second opinion on how ModernBERT was trained, what its shortcomings are, whether the recommendations are right, and what
else could improve it. You have not seen any earlier conversation; everything you need is in files.

## Read first, in this order

1. `AGENTS.md` (the project's rules; they bind your recommendations: realistic data written by LLM agents or people, synthetic short
   commands from the Rules' grammar as training data, no hand-written equivalences between language and the legend, the main metric
   "do only what you are sure of", experiments pre-registered, root-cause analysis after every evaluation). Codex: also `.codex/WORKFLOW.md`.
2. `reports/modernbert-status-2026-11-08.md`: the status document written for this review (training history, numbers, shortcomings,
   recommendations, open questions, where everything is). Treat it as a claim to check, not as truth.
3. The primary records it cites: `training/neural/MODERNBERT_RUNLOG.md` (append-only run log), `training/neural/MODERNBERT_PARITY_PLAN.md`,
   `training/neural/MODERNBERT_PLAN.md`, `reports/modernbert.md`, `training/neural/MODERNBERT_RECAL_PLAN.md` (uncommitted),
   `training/sketch/VSSBERT_SHORT_COMMANDS_PLAN.md` (uncommitted), and the evidence folders `reports/evidence/modernbert-parity-baseline/`,
   `reports/evidence/modernbert-c100-publish/`, `reports/evidence/modernbert-c100-recal/` (uncommitted).
4. Code, as needed: `docs/js/neural.js` (the reader in the browser), `docs/js/neural-confidence.js` (its confidence and gate), `docs/js/ui.js`
   (tabs, gates, the chat), `training/neural/finetune_modernbert_batched.py` and `finetune_modernbert.py` (training),
   `training/neural/make_roles.py`, `make_data.py` (data conversion), `training/neural/parity/` (arm training, export, scoring, comparison),
   `training/neural/calibrate_modernbert.mjs`, `training/neural/parity/calibrate_arm.mjs` (confidence fitting).
5. Data and models outside the repository (read only): `~/.cache/diagram-vss-modernbert/arms/<arm>-s<seed>/` (export, eval records, score
   files, confidence fits, checkpoints) and `~/.cache/diagram-vss-modernbert/arms/data/<arm>/` (each arm's training data).

## What to do

1. **Verify.** Spot-check at least 10 numbers of the status document against their sources (run log lines, score JSON files, confidence
   files, `config.json`), including at least two from each of its sections 3, 4 and 6. Report each as confirmed or wrong, with the source.
2. **Review the training.** Recipe, data mix, label conventions, heads and layout, export, calibration. Is anything in the recipe or data
   likely to limit the model that the run log did not test (for example dropout 0 against SOP-BERT's 0.1, BF16, one seed per arm, the cut head's
   share of the updates, how short commands and natural language are mixed)? Back each point with evidence from the files, or label it a
   hypothesis.
3. **Review the shortcomings** (status document section 6). Are the causes right? Check at least the two largest short-command error
   classes yourself in the training data and the records (for example "move X left" read as a position, outline questions) and say whether
   the cause is data, labels, the model or the calibration.
4. **Review the recommendations** (section 7). For each: agree or not, why, its expected effect, its cost (GPU time on a 6 GiB laptop GPU,
   CPU time, browser size and latency), its risks, and how it should be measured (the bars you would pre-register, AGENTS.md style).
5. **Add what is missing.** Other ways to improve ModernBERT here, within AGENTS.md's rules: data, labels, training recipe, heads, decoding,
   calibration design, distillation, model size versus the browser budget, combining with the other readers. Rank them by expected value per
   cost. Say plainly which you would not do and why.
6. **Answer the open questions** of section 8 with your reasoning.

## Rules for you

- **Read-only, except one file.** Write your report to `reports/modernbert-review-<your tool>-<YYYY-MM-DD>.md` (for example
  `reports/modernbert-review-codex-2026-11-09.md`) and change nothing else: no code, data, models, configs or other documents.
- Do not commit, push, stash or switch branches; another session may be working in this repository (`training/qwen/*` belongs to it).
- Do not train, export, download models or packages, run the GPU, or run anything that writes under `docs/` or `~/.cache/`.
  Short read-only commands (`git log`, `grep`, `python3 -I` or `node` scripts that only read, `jq`) are fine.
- Separate **observed** (you read it or ran it; give file:line or the command and its output), **inferred** (your reasoning) and **not
  verified**. A number without a source is not allowed in your report.
- Use the project's terms (requested action, every request executed, at the threshold, cost score, confidently wrong share). Plain words, no
  dramatising; say "I don't know" where you don't.

## Your report's shape

1. Verdict in five lines: is the status document accurate; is the main recommendation right; your top three changes.
2. Verification table (claim, source, confirmed / wrong).
3. Training review.
4. Shortcomings: agree / disagree, with your own checks.
5. Recommendations: the document's, then yours, ranked, each with effect, cost, risk and the bars to pre-register.
6. Answers to the open questions.
7. What you could not check, and what you would check next.
