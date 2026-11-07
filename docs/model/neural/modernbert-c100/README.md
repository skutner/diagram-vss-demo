# ModernBERT diagram reader: arm C100-s0 (experimental)

The ModernBERT tab of the demo reads this model (`docs/js/neural.js` `OURS`), with its own confidence file
`../../confidence/modernbert-c100.json`. It replaces, on the tab, the first ModernBERT experiment (`../modernbert/`, one epoch, a failed
quality experiment: it read "draw a circle" as `create shape=triangle`); that folder stays in the repository, unread, for the owner to remove.

**Why this model, and on what evidence.** The owner chose it on 2026-11-07 ("let’s go with your recommendations"). The parity plan's own
adoption bar was NOT met: no arm beat the SOP-BERT control on `nl_b` by 5 points (`training/neural/MODERNBERT_RUNLOG.md`, M5), and on natural
language written without the legend's words every ModernBERT arm is far from the teachers. The choice rests on short, literal commands, the
validation AGENTS.md names for production ("the learned readers on short commands covering what the Rules detect, against the Rules"):
`reports/evidence/modernbert-c100-publish/` (a scratch measurement, not the registered metric; one seed).

- On `synth_short_r2` (1,997 short commands, the Rules' reading as gold; not a training folder of any ModernBERT, but 18 of its texts
  also occur in the training data), the core forms (create, move, set,
  connect, delete, undo, redo; 1,007 messages), every request executed: 95.7% right (first experiment 49.7%; its creates 3.0%). At the
  cost-10 threshold: 474 right, 3 wrong, 530 asked. On all 1,997, including forms its training data lacks (outline, label removal, undo
  counts, sizes in descriptions): 636 right, 39 wrong, 1,322 asked; the wrong ones are mostly outline questions answered with another property.
- On the fresh2 + short3 test part (1,745 requested actions; `~/.cache/diagram-vss-modernbert/arms/C100-s0/eval/`, scored by
  `training/neural/parity/score_arm.mjs`): every request executed 78.5% right (SOP-BERT 77.8%, first experiment 39.7%); at the threshold
  735 right, 10 wrong, 3 extras, 931 asked, cost score 34.7, 1.7% of executions wrong.
- On natural language (`nl_a`, `nl_b`): low, as every arm (`MODERNBERT_RUNLOG.md`, "The learning curve: result"); C100 is the run log's best
  ModernBERT arm there.

## The model

- Base `answerdotai/ModernBERT-base` at revision `8949b909ec900327062f0ebf497f51aef5e6f0c8`; the joint action, value, role/span and cut heads
  of the first experiment's layout, plus the number-word table (`number_words_from: "table"`, arm L1), the implied scale (arm L2), more value
  heads for descriptions, and the `width` tags (`config.json` `reader`).
- Data (arm C100 of the parity plan's learning curve): F0's list (the first experiment's ALL folders with L1 and L2) with
  `ROLE_TOO_RICH=context`, plus all 2,215 natural-language training messages of `llm_train/nl_p1` and `nl_p2`: 26,913 messages, 57,135
  requests (`config.json` `reader.training_manifest`).
- Training: SOP-BERT's recipe, seed 0, 8 epochs, 14,288 updates, lr 6e-5, batch 32 (8 messages per step for the cut head), 6% warm-up,
  weight decay .01, clip 1, SDPA, BF16 autocast with FP32 weights (`config.json` `reader.training_provenance`). Checkpoint SHA256
  `140b8eb3f0cc00082add2bece91f9cb6ba61c3b6617e81b8c6813274bcd17164`.
- Export: `training/neural/parity/arm_export.py`, mode `weight-only-u8-fp32` (8-bit stored weights, FP32 arithmetic, Basic graph
  optimisation), shards under 90 MiB: the first experiment's export mode. Same tokenizer files as the first experiment (byte-identical).
- Confidence: `training/neural/parity/calibrate_arm.mjs` on the calibration parts of fresh2, short3 and `nl_a` (678 messages, 1,320
  produced requests), the 24 signals of `docs/js/neural-confidence.js`, out-of-fold AUROC 0.940, cost-10 threshold 0.9228. Its `artifacts` is
  one hash of the arm folder's file list (the arm format), not the per-file map of the first experiment's file; the page reads neither.

## What was checked, and what the canonical chain would add

- `arm_receipt.json` (the arm exporter's own checks): float ONNX against PyTorch and SDPA against eager within 1e-3; Python ONNX Runtime
  against Node on all 41 fixtures (ids, outputs, decoded readings, cuts, readMany). Its `passed` is `false` by its strict rule (PyTorch and
  Node decode every text the same): on 20 texts, act 19/20, tags 1,952/1,956, cuts 18/20, all near ties of the 8-bit weights; the run log
  reports this check and does not gate on it (M1). `export_parity.json` lists the 13 fixtures where 8-bit decodes differently from float.
- In the browser (`reports/evidence/modernbert-c100-publish/README.md`): the page served locally loads this folder and this confidence file;
  five messages give the same readings and confidences as Node to three decimals.
- `bash training/sketch/regress.sh`: exit 0, unchanged (it covers Rules and VSS).
- **Missing, and why:** `export_manifest.json`, `export_candidate.json`, `node-receipt.json` and `browser-receipt.json` of the first
  experiment's canonical chain. `training/neural/export_modernbert.py` accepts only the first experiment's checkpoint and its retained
  dynamic graph, `check_modernbert.mjs` and `check_modernbert_browser.py` need its candidate manifest, and the browser check is written for
  macOS Chrome (on Linux its cleanup check would pass without checking anything). The arm export deleted its float and dynamic graphs, so
  such bindings cannot be rebuilt honestly; they were not written by hand. Not done either: the five-reader run on GitHub Pages after a push.
