# First live run on Pages (deployed 65e13e6), 2026-11-04 10:38-11:06 UTC

The frozen fixture with all six readers on https://skutner.github.io/diagram-vss-demo/?models=rules,vss,neural,combined,modernbert,qwen
(training/qwen/run_live.cjs, fresh profile, the model downloaded from the pinned Hugging Face URL). Complete except for one defect of the
new code: the details sheet rendered empty for every turn (`turnHTML` passed Qwen3's reading instead of its evidence to `qwenHTML`,
which threw, so `item.details` is empty for all six readers). The drawings (SOP and SVG), the per-turn summaries and Qwen3's own
per-turn record (`SketchpadInfo.qwenTurn`) were captured through other paths and are complete. The defect was fixed and the run
repeated (`../live-2-*`); this run is kept as evidence, in particular of the repeatability of Qwen3's greedy readings.

The Pages deployment job of 65e13e6 reported "Failed to create deployment (status: 502)"; `deployed-identity.json` shows the files
served were nevertheless those of 65e13e6 (cache-busted and plain URLs, 14 files, SHA-256 equal).
