# Evidence: the ModernBERT tab reads arm C100-s0 (2026-11-07)

The owner, 2026-11-07, after the diagnosis that the published ModernBERT (the first experiment, one epoch) reads "draw a circle" as
`create shape=triangle`: "let’s go with your recommendations" (the recommendation: prepare C100-s0 for publishing, uncommitted).
What was published, and why the canonical receipts are missing: `docs/model/neural/modernbert-c100/README.md`.

## Files

| file | what it is |
|---|---|
| `short_eval.mjs` | scratch scorer (not the registered metric of `training/neural/parity/score_arm.mjs`): one reader on `training/sketch/llm_train/synth_short_r2` (1,997 synthetic short commands; the Rules read each exactly as its gold), `bench-canon.js` `score()` per message; every request executed, and at the reader's cost-10 gate (right / wrong / asked; extras are not counted) |
| `synth_short_r2.<model>.txt` | its output for the first experiment (`published`) and the arms M1-s0, F0-s0, C100-s0, W-s0, each with its own `cal-fresh2-short3-nl_a` confidence fit; per form, and the first wrong examples |
| `core_summary.txt` | the same, split into the core forms (create, move, set, connect, delete, undo, redo: 1,007 messages) and the forms no ModernBERT training data has (990) |
| `short_probe.mjs`, `short_msgs.txt` | 20 hand-written short commands read by one model folder with its confidence file |
| `probe20.first.txt`, `probe20.arms.txt`, `probe20.c100-published.txt`, `probe20.rules.txt` | the first experiment, the four arms (from the cache folders), C100-s0 from `docs/model/neural/modernbert-c100` (identical to the arm folder's reading, checked with `diff`), and the Rules |
| `regress.txt` | `bash training/sketch/regress.sh` on the working tree with the change (exit 0; identical to the table of commit 101edd9: the change does not touch Rules or VSS) |

Run from the repository root, e.g. `node reports/evidence/modernbert-c100-publish/short_eval.mjs C100 docs/model/neural/modernbert-c100 docs/model/confidence/modernbert-c100.json`
(needs `training/laptop/node_modules` with `@huggingface/transformers` 3.8.1; about 20 minutes of CPU per model).

## Results

`core_summary.txt`, gate = each model's own cost-10 threshold (first experiment 0.9766, M1 0.8787, F0 0.9156, C100 0.9228, W 0.9322):

| model | core: every request executed, right | core at the gate: right / wrong | all 1,997 at the gate: right / wrong; cost per 100 messages (not per 100 requested actions; extras not counted) |
|---|---:|---:|---|
| first experiment (published before) | 49.7% (create 3.0%, move 1.2%) | 0 / 0 (asks every time) | 0 / 0; 0 |
| M1-s0 | 93.8% | 480 / 0 | 668 / 123; -28.1 |
| F0-s0 | 95.7% | 410 / 0 | 514 / 55; -1.8 |
| C100-s0 | 95.7% | 474 / 3 | 636 / 39; +12.3 |
| W-s0 | 97.4% | 488 / 0 | 595 / 28; +15.8 |

Limits: one seed per arm; a scratch scorer (no extras); 18 texts also occur in the arms' `train.jsonl`. Most wrong executions are outline
questions answered with another property (nothing on the canvas changes) and, for M1, "remove the label" read without `label=""` (the engine
then asks what the label should say). Choice of C100-s0 over W-s0: the two are close on this set; C100 is the run log's best arm on natural
language, and W's seed 1 was significantly worse than C100's on `nl_a` at the threshold (MODERNBERT_RUNLOG.md, "W: result").

## Browser check (2026-11-07, this working tree)

`docs/` served on `http://localhost:8765` (`python3 -m http.server`), the page opened in the Claude desktop app's browser (Chromium):
- `NeuralKit.status('modernbert')`: published, nothing missing, 155,893,748 bytes; the network log shows the six model files fetched from
  `model/neural/modernbert-c100/` and `model/confidence/modernbert-c100.json` (all HTTP 200), nothing from `model/neural/modernbert/`.
- Five messages, the ModernBERT section of each message's details (Web ORT, WASM), against the Node run (`probe20.c100-published.txt`):

| message | browser reading | browser confidence | Node confidence | gate (0.9228) |
|---|---|---:|---:|---|
| draw a circle | create shape=circle | 0.672 | 0.672 | held |
| make Start red | set color=red target=Start | 0.992 | 0.992 | executed |
| connect Start to Process | connect from=Start to=Process | 0.980 | 0.980 | executed |
| add a big blue square | create shape=square size=large color=blue | 0.953 | 0.953 | executed |
| move Done below Check | move target=Done position=below anchor=Check | 0.994 | 0.994 | executed |

- The ModernBERT tab's drawing afterwards: Start red, a large blue `square1` added (11 shapes, 3 links; Start -> Process already existed).
- Not done: the canonical `check_modernbert_browser.py` receipt (written for macOS Chrome; see the model README), the five-reader run on
  GitHub Pages after a push.
