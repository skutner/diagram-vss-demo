# Live five-reader diagram comparison

Date: 2026-11-04. Tested directly on
[the personal fork's GitHub Pages site](https://skutner.github.io/diagram-vss-demo/?models=rules,vss,neural,combined,modernbert).
Deployed source: `101edd92599c2bcae995082d037b7683637b1633`.

All five readers loaded and processed the same frozen eleven messages. ModernBERT
answered the path question correctly and held all nine drawing commands. It made
no diagram changes. The existing four readers reproduced their earlier drawings.
This confirms browser integration, while the first ModernBERT model remains too
uncertain to be useful for these drawing commands.

## Method and evidence

The [frozen fixture](../training/sketch/diagram_e2e_cases.json) has ten requested
actions and one unsupported-language control, submitted through the real page.
All five readers began with the same starter diagram and then maintained their
own canvas state. Every turn captures proposed SOP wires, confidence holds,
execution replies, SVG and resulting drawing SOP in the
[raw record](evidence/diagram-five-101edd9/record.json).

The [deployed identity check](evidence/diagram-five-101edd9/deployed-identity.json)
confirmed the Pages build at the above commit and matching live/source SHA256
hashes for all thirteen checked assets, including both ModernBERT weight shards.
Models and the normal Transformers.js CDN loaded normally. The harness recorded
131 responses and no HTTP response status of 400 or higher. It used a fresh
browser profile, with all four learned-reader confidence levels at `cost`
(default cost-10) and no stored gate overrides. The Rules have no confidence
selector. See [captured settings](evidence/diagram-five-101edd9/settings.json).
The initial console separately recorded an unrelated missing favicon (404),
retained in [the console log](evidence/diagram-five-101edd9/initial-console.txt).
No model HTTP errors occurred during the harness. No `Do it anyway` override was
used and no model, gate or fixture was tuned.

Requested actions, rather than messages or proposed wires, are the denominator.
A held request is **asked**. A request rejected by the engine or blocked by a
missing prerequisite is **not done**. Questions need the correct answer, without
a canvas mutation. Unrequested executed actions are counted separately as extras.
The harness labels its raw assessment pending: capture completion alone is not a
quality pass. The coordinator manually graded intent, replies and before/after drawings.
Independent grading confirmed all 50 requested-action outcomes and all five
unsupported controls, and exactly matched all 44 legacy SOP and rendered
shape/edge snapshots to the baseline. See the
[per-action assessment](evidence/diagram-five-101edd9/assessment.json) and
[independent audit](evidence/diagram-five-101edd9/independent-audit.json).

## Per requested action

| Reader | Right / 10 | Asked | Other not done | Wrong execution | Extras |
|---|---:|---:|---:|---:|---:|
| Rules | 9 | 0 | 1 | 0 | 0 |
| VSS | 8 | 2 | 0 | 0 | 0 |
| SOP-BERT | 7 | 3 | 0 | 0 | 0 |
| VSS-BERT | 3 | 3 | 4 | 0 | 0 |
| ModernBERT | 1 | 9 | 0 | 0 | 0 |

No wrong execution was observed among 9, 8, 7, 3 and 1 executed requested actions,
respectively. Those small counts do not establish general error rates or a
quality ranking. This dependent sequence also cannot estimate confidence AUROC
or a risk-coverage curve.

| Requested action | Rules | VSS | SOP-BERT | VSS-BERT | ModernBERT |
|---|---|---|---|---|---|
| Create red circle E2EAlpha | Right | Right | Right | Asked | Asked |
| Create blue rectangle E2EBeta | Right | Right | Right | Right | Asked |
| Arrow E2EAlpha → E2EBeta | Right | Right | Right | Not done: missing Alpha | Asked |
| Make E2EAlpha green | Right | Right | Right | Not done: missing Alpha | Asked |
| Move E2EBeta below E2EAlpha | Right | Right | Right | Not done: missing Alpha | Asked |
| Rename E2EBeta to E2EGamma | Right | Right | Right | Right | Asked |
| Label E2EGamma “Review queue” | Not done: engine rejected target | Asked | Asked | Asked | Asked |
| Make that shape yellow | Right | Asked | Asked | Asked | Asked |
| Arrange Alpha and Gamma in a row | Right | Right | Asked | Not done: missing Alpha | Asked |
| Path from Start to Done? | Right | Right | Right | Right | Right |

The unsupported “feel more optimistic about next quarter” control produced no
mutation or extra action in any reader. It contributes no requested action to
the denominator. ModernBERT proposed an uncertain `improve` request and held it.

## Intention versus what was drawn

**Rules** correctly drew both named shapes, connected them and performed the
color, position, rename, pronoun and row operations. It parsed the label request
as `set` with a label-based target, which the engine rejected. The failure changed
nothing, so it is not a wrong executed action.

**VSS** correctly drew both shapes and the arrow and executed the recolor, move,
rename and row layout. For the label request it proposed `set`, then held it with
world/word uncertainty. It also asked about the pronoun reference, leaving Gamma
blue rather than yellow.

**SOP-BERT** correctly drew the shapes and arrow, recolored Alpha green, moved
Beta below it and renamed Beta. It proposed the intended label, pronoun color and
row operations but held all three below its thresholds. Its final Gamma remains
blue and below Alpha.

**VSS-BERT** proposed the intended first red-circle creation but held it at
confidence 0.898, below 0.9488. It created and renamed the blue rectangle.
Subsequent proposed connection, recolor, relative movement and row layout were
correct in intent but could not run because Alpha was absent. These four engine
failures are missing-prerequisite outcomes, rather than wrong executed changes.
The label and pronoun requests were held. Only the extra blue Gamma rectangle
appears in this reader's final drawing.

**ModernBERT** held all nine diagram edits. Some proposals were correct, including
Alpha creation, movement, rename, label and row layout. Others had concrete wrong
values: the requested blue rectangle became a star with no blue; green became
red; and the pronoun request selected four starter shapes with red instead of
Gamma with yellow. None of those proposals executed. The default gate protected
the drawing but also prevented useful edits. The path question executed and
answered `Yes: Start → Process → Check → Done (3 steps)` correctly.

| ModernBERT request | Proposed intent | Confidence, gate 0.9766 | Result |
|---|---|---:|---|
| Red circle Alpha | Correct red circle and name | 0.044 | Asked |
| Blue rectangle Beta | Star, no blue | 0.070 | Asked |
| Arrow Alpha → Beta | Connect named endpoints; no explicit arrow value | 0.859 | Asked |
| Alpha green | Set Alpha red | 0.546 | Asked |
| Beta below Alpha | Correct move | 0.955 | Asked |
| Beta → Gamma | Correct rename | 0.919 | Asked |
| Gamma label | Correct label and target | 0.917 | Asked |
| “That shape” yellow | Set Start, Process, Check and Done red | 0.071 | Asked |
| Alpha and Gamma row | Correct row layout | 0.515 | Asked |
| Start-to-Done path | Correct path question and answer | 0.979 | Right |

The displayed confidences are rounded. The frozen actual ModernBERT threshold
remains `0.9765597115495379`. Correct proposals held below it remain asked, even
where a later command would lack a target because earlier creations were held.

All 44 after-turn drawing SOP strings for the original four readers, including
the unsupported control, exactly match the earlier
[four-reader live baseline](diagram-e2e-baseline.md). This is evidence that adding
the fifth reader preserved these observed legacy outcomes, not proof of every
possible regression being absent.

## Final drawings

Each screenshot shows the same site after the complete sequence, with the named
reader's own canvas selected. The common starter diagram remains in every one.

| Reader | Final additions and changes | Screenshot |
|---|---|---|
| Rules | Green Alpha and yellow Gamma in a row, with their arrow; requested label absent | [Rules drawing](evidence/diagram-five-101edd9/rules.png) |
| VSS | Green Alpha and blue Gamma in a row, with their arrow; label and pronoun edit held | [VSS drawing](evidence/diagram-five-101edd9/vss.png) |
| SOP-BERT | Green Alpha and blue Gamma below it, with their arrow; label, pronoun and row held | [SOP-BERT drawing](evidence/diagram-five-101edd9/neural.png) |
| VSS-BERT | Only the additional blue Gamma rectangle; Alpha never created | [VSS-BERT drawing](evidence/diagram-five-101edd9/combined.png) |
| ModernBERT | Starter diagram unchanged; path question answered correctly | [ModernBERT drawing](evidence/diagram-five-101edd9/modernbert.png) |

## Observed browser time and limits

Host: Apple M1, 16 GiB RAM, macOS 27.2, Chrome 156. The neural readers used WASM.
[Run metadata](evidence/diagram-five-101edd9/run-metadata.json) preserves hardware,
per-reader timing arrays and source identities. The following are the page's
per-reader formalization times over the eleven
messages, including the unsupported control. They are not isolated model-kernel
benchmarks. Shared reader votes and pipeline work affect the older readers;
ModernBERT makes two model calls per message. No browser load or network delivery
time is included in these medians.

| Reader | Median formalization time, 11 messages |
|---|---:|
| Rules | 3.4 ms |
| VSS | 14 ms |
| SOP-BERT | 71 ms |
| VSS-BERT | 77 ms |
| ModernBERT | 537 ms, range 474–579 ms |

This small sequential fixture is exploratory. It favors literal commands and
reuses dependencies, so an early hold can prevent several later actions. The
readers also differ in confidence recipes and training regimes. The ModernBERT
model trained one epoch, compared with eight for shipped SOP-BERT. These numbers
do not establish encoder superiority, equal-budget training quality or WebGPU
performance. For separate nonempty-call timings and the larger frozen quality
evaluation, see [the ModernBERT report](modernbert.md).

## Decision

Keep ModernBERT experimental and keep the existing readers available. Its first
frozen quality experiment already failed the 20% right-request criterion, reaching
0.92% on 1,745 held-out formalized actions. This live run adds direct evidence:
it runs alongside the other four on Pages, detects some intended actions, asks
before incorrect value proposals can change a drawing, and currently performs
none of these nine drawing edits. The weights and confidence gate remain frozen.
No further training run is implied by this report. The owned browser session was
closed after capture and its process exit was verified.
