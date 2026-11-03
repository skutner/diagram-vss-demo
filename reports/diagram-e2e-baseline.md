# Live diagram command baseline

Date 2026-11-03. Site https://skutner.github.io/diagram-vss-demo/.
Deployed source `6cab8231d2e92d0161fad43a03f56896806fd35e`.

The reviewed fixture contains eleven natural-language messages, ten requested
actions and one unsupported-language control. Each message was submitted through
the live page once. All four readers were ready and began with identical SOP
drawings. Each subsequent reader kept its own state. Captured evidence includes
44 reader/case snapshots, proposed SOP commands, confidence holds, execution
replies, SVG and resulting drawing SOP. Models and CDN responses were loaded
normally. The same fixed messages are reserved for the five-reader follow-up.
[Fixture](../training/sketch/diagram_e2e_cases.json),
[raw capture](evidence/diagram-baseline-6cab823/record.json), and
[deployed source identity](evidence/diagram-baseline-6cab823/deployed-identity.json).

## Per requested action

The table was independently checked against the actual SVG/SOP changes and
question answers. Requested actions are the denominator. A held request is asked;
a failed dependency or rejected engine request is other not done. Wrong executions
and unrequested changes are reported separately.
[Per-action assessment](evidence/diagram-baseline-6cab823/assessment.json).

| Reader | Right / 10 | Asked | Other not done | Wrong execution | Extras |
|---|---:|---:|---:|---:|---:|
| Rules | 9 | 0 | 1 | 0 | 0 |
| VSS | 8 | 2 | 0 | 0 | 0 |
| SOP-BERT | 7 | 3 | 0 | 0 | 0 |
| VSS-BERT | 3 | 3 | 4 | 0 | 0 |

No executed mistake was observed among the 9/8/7/3 executed actions, respectively.
This small dependent sequence does not estimate general execution precision,
AUROC or a risk/coverage curve. Confidence levels came from the existing defaults
and were held fixed. The unsupported-language control caused no mutation or extras
in any reader and contributes zero requested actions to the table.
[Settings](evidence/diagram-baseline-6cab823/settings.txt) and
[complete assessment](evidence/diagram-baseline-6cab823/assessment.json).

## What the readers drew and why they differed

Rules drew the two named shapes and their directed arrow, applied the color,
position, rename and pronoun commands, and placed the shapes in a row. The label
request was parsed as `set` with a label-based target; name resolution rejected
it, leaving the drawing unchanged.
[Rules drawing](evidence/diagram-baseline-6cab823/rules.png).

VSS drew both shapes, their arrow and the requested row. It held the label request
after proposing `set`, with uncertainty about the world and words. It also asked
about the pronoun reference. The rectangle therefore retained its earlier color.
[VSS drawing](evidence/diagram-baseline-6cab823/vss.png).

SOP-BERT proposed the intended label, pronoun change and row layout, then held
them below its confidence thresholds. Its drawing contains the two shapes and
arrow with the rectangle below the circle, reflecting the earlier executed move.
[SOP-BERT drawing](evidence/diagram-baseline-6cab823/neural.png).

VSS-BERT held the first circle creation at confidence 0.898 against its default
0.9488 threshold. It then correctly created and renamed the rectangle. The missing
circle prevented connection, recoloring, relative movement and row layout from
executing, despite correct proposed commands. It held the label and pronoun
requests. Its final drawing therefore contains only the additional rectangle.
This cascade is tracked as four missing-prerequisite outcomes after the initial
hold. All readers answered the existing Start-to-Done path question correctly.
[VSS-BERT drawing](evidence/diagram-baseline-6cab823/combined.png) and
[turn-by-turn intent and execution evidence](evidence/diagram-baseline-6cab823/record.json).

## ModernBERT status

The fifth reader requires a trained diagram model and independently calibrated
confidence. Its implementation and experiment plan are in progress. The native
MPS pilot at source `62a5b8d` stopped at the registered host-memory guard after
17 request/cut pairs and one optimizer update, before reaching the eight-update
criterion. Available host memory was 2,145,796,096 bytes, below 2 GiB, after
26.54 seconds. This is an incomplete resource-limited attempt; it supplies no
ModernBERT diagram-quality result. The checkpoint remains in the task cache.
[Failure evidence](evidence/mps-pilot-62a5b8d/stopped.json),
[invocation](evidence/mps-pilot-62a5b8d/mps-pilot-62a5b8d.log), and
[preregistered training/device plan](../training/neural/MODERNBERT_PLAN.md).

The owner will report when Apparatus's GPU is restored. A fresh, reviewed CUDA
pilot must pass before full training, export parity, calibration and the direct
five-reader live comparison can complete.
