# diagram-vss-demo

[Open this fork's diagram demo](https://skutner.github.io/diagram-vss-demo/).
The existing four-reader live baseline and per-action drawings are recorded in
[the E2E report](reports/diagram-e2e-baseline.md). The experimental fifth reader, ModernBERT, completed training on Apparatus and
passed browser export parity. It failed the fixed task-quality criterion: only
16 of 1,745 requested actions passed its calibrated gate correctly (0.92%).
See [the full report](reports/modernbert.md) and
[integration status](reports/modernbert-status.md). Publication and the direct
five-reader live comparison remain pending.

**SOP Sketchpad**: a diagram editor you talk to in English, in the browser, with no server. Every message is formalized into SOP Lang
wires by the enabled readers (the table under "The readers"), and the same engine and the same Datalog reasoner run the wires,
whichever reader wrote them.

## Goal and metric

The research question (owner, 2026-11-02): **a reader that says clearly where it is not sure, does only what it is sure of, and asks about
the rest**, not one that approximates well; for approximation there are LLMs. In a drawing a confident mistake costs one undo; where a wrong
action has serious consequences it is what matters most. The diagram editor is the test bench.

What it is for: a reader that knows when it does not know is valuable where mistakes are very expensive: highly regulated industries, and
research, where it can filter material and bring people less work, more reliably and more trustworthily than an LLM, which tends to answer
confidently even when it is wrong. The value is caution by design: do what it is sure of, hand the rest to a person with the reasons, and keep
a symbolic layer that executes only known actions. In the demo one confident mistake costs as much as 10 right answers; VSS-BERT (SOP-BERT
paired with VSS) is confidently wrong in 1.8% of what it executes and says why it holds the rest; the models never act directly, the engine
does. VSS alone has the same property: its confidence is built from its own named steps. Where a capable LLM would be too expensive or too
slow, these readers are also small enough to run in a browser tab.

- **Main metric: precision of execution.** Of everything a reader executes (requested actions and extras nobody asked for), the share done
  right. It is reported with the share of requests done right at that precision; readers are compared by the share of requests done right
  **at equal precision** (the risk-coverage curve), with the AUROC of their confidence beside it.
- Each reader executes a request only when its confidence clears a threshold chosen on held-out data, and asks below it, saying why.
  "Not done / asked" is never an error. The Rules, which have no confidence, are measured by what they execute.
- Under it, per requested action: right / wrong / not done, plus extras (every number before 2026-11-02 is in this form, with every request
  executed). Rules: `AGENTS.md` ("What counts as an error"); decision record: `DECISIONS.md`.
- State on 2026-11-02: the confidences are measured (`training/sketch/RISK_COVERAGE.md`, `training/sketch/VSS_CONFIDENCE.md`); the
  confidence gate in the demo is in progress; the precision of each reader is measured (`training/sketch/PRECISION.md`: at 97% only VSS with its combined confidence qualifies, doing about a third of the requests and asking about half); a fresh test set neither
  learned reader has seen is planned.

## The readers

| reader | what it is | model |
|---|---|---|
| **Rules** | hand-written extractors keyed on the legend's cue words, with spelling correction and mention resolution | none (code) |
| **VSS** | a composer of 9 small VSS worlds (VSA route book, no transformer) trained on this demo's legend with the `sop` tool of [vss-demo](https://github.com/ml-circuits-research/vss-demo): a cutter cuts the message into units, the worlds read them, a context filler fills references | `docs/model/micro/` (the worlds, the cutter, `registry.json`), `docs/model/context/` |
| **Neural** | SOP-BERT: one DistilBERT fine-tuned on the annotated requests, run in the browser by Transformers.js; it cuts the message (the BERT cutter) and reads, per request, the act, the value of each legend key, who fills each role and the written names, labels and numbers, without the Rules reader. (Until 2026-11-02: an act classifier plus a ready-made QA model, removed.) | `docs/model/neural/sop-bert/` (hosted on this site, versioned) |
| **VSS-BERT** | SOP-BERT paired with VSS and its own calibrated confidence gate | the existing SOP-BERT and VSS artifacts, with `docs/model/confidence/vote3.json` |
| **ModernBERT (experimental)** | ModernBERT-base with joint action, value, role and request-cut heads, trained for one epoch. Uses 8-bit weight storage and FP32 arithmetic on browser WASM. Its fixed confidence gate currently holds almost every request. | `docs/model/neural/modernbert/`, `docs/model/confidence/modernbert.json` |

The **Benchmark** (menu ⋮ › Benchmark) runs the readers on the same labelled sentences in the browser and shows accuracy per test set, the model
size, the load time and the time per message.

Open it: `docs/` is the whole application (GitHub Pages from `/docs`, or `npx serve docs` locally; ES modules do not load from `file://`).

Working rules for this repository (scope, data, fairness): `AGENTS.md`. The VSS reader's design: `training/sketch/VSS_READER_SPEC.md`.

Help: the ? button above the drawing opens it full screen (deep links such as `index.html#help/sop-lang`). How it works inside (every component, model, data set, training run and measurement, with file paths and sizes): the Help pages under "How it works inside", also as one page, `docs/architecture.html` ([on the site](https://ml-circuits-research.github.io/diagram-vss-demo/architecture.html)).

## Layout

| path | content |
|---|---|
| `docs/index.html`, `docs/js/` | the application: `logic.js` (SOP Lang, legend, engine, plugins, rules formalizer, Datalog reasoner), `ui.js`, `scenarios.js`, `neural.js` (Transformers.js formalizer), `vss-formalizer.js` + `vss-composer.js` + `vss-context.js` + `vss-adapter.js` + `front.js` (the VSS pipeline), `vss.js` + `vss/` (the browser VSS reader, copied from vss-demo `app/src`), `bench-canon.js` (benchmark scoring) |
| `docs/model/micro/` | the 9 exported VSS worlds (each: `model.json`, `routebook.bin`, `stars.json` (word vectors generated in the browser), `manifest.json`, `front.json`), the cutters and `registry.json` |
| `docs/bench/` | the benchmark sets (labelled sentences with their gold wires) |
| `training/sketch/` | the VSS worlds: legend and sentence generator, world and cutter training (`train_micro.sh`, `train_cutter.py`), scoring (`llm_score.mjs`, `score_rules.mjs`), benchmark builder, the experiment records (`*.md`), run logs |

## The legend

One legend drives every reader. Its questions (Legend tab) are answered per message: action or question type, shape, colour, size,
name, label, position and anchor, direction and distance, from / to, line style and arrow, axis, layout, count, and five questions taken from
the vss-demo diagram world: **pairing** ("connect the circles in a chain"), **negated colour** ("the circles that are not red"),
**even spacing** ("distribute the shapes evenly"), **z-order** ("bring Start to the front") and **recency** ("the new diamond").
A new legend question needs: a legend entry in a plugin (`logic.js`), its cue words for the rules, a frame entry for the neural reader
(`neural.js`), and a role in the worlds' data (`training/sketch/generate.py`, `msg_to_world.py`) followed by a retraining of the worlds that hold it.

## Licences

This repository: AGPL-3.0 (LICENSE). `docs/js/vss.js` and `docs/js/vss/` are copied from ml-circuits-research/vss-demo `app/src`
(MIT, commit 9c85649). The training tool is copied into `training/vss` (MIT, see its PROVENANCE.md).
