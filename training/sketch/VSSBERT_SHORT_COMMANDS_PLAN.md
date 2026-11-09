# VSS-BERT on short literal commands, against the Rules (measurement plan)

Date 2026-11-08. Base commit `63fe9cc`. `docs/` has no uncommitted change (`git status --porcelain docs/` is empty), so the page served from
`docs/` locally is the page GitHub Pages serves.
Status: **approved, not run.** Owner, 2026-11-08: "go with your recommendations on all questions" (Q1-Q4 of section 14, each as
recommended: the bars of section 7 as written; `docs/bench/broad.json` as a reported set; `synth_short_t1` committed first; the spell
checker reported, not fixed here). Measurement only: no published reader,
model, confidence file or threshold changes, and nothing is trained. No file under `docs/` is written.
Written by the plan-architect agent (Opus 5.5, high) at the owner's request (2026-11-08: "have the plan architect design a plan to proceed
with the recommended approach"); saved by the coordinator.

## 1. The short answer

**The question.** People who are stuck fall back to short literal commands (owner, 2026-11-02 22:04). The chat always answers with
VSS-BERT (`docs/js/ui.js` READERS, first entry `['combined', 'VSS-BERT']`). On "draw a circle" VSS-BERT read `create shape=circle` and did
not do it: combined confidence about 0.938 against a threshold of 0.9488. The Rules and VSS did it. What AGENTS.md calls the production check
has never been run for VSS-BERT: "the learned readers on short commands covering what the Rules detect, against the Rules". This plan runs it.
It also measures VSS-BERT's two parts, SOP-BERT and VSS, each at the gate its own tab uses, plus the Rules, on the same messages.

**The hypothesis (written before any result).** At its default gate, VSS-BERT reads most short literal commands right. Its gate holds a
large share of the ones it reads right (the "draw a circle" pattern), and it rarely executes one wrong. The cause hypothesis: in most of those
held requests both readers agree. What lowers the confidence is SOP-BERT's own size, cut or word signals. Those percentile tables were fitted
on the calibration part of fresh2 and short3 (`combined.json` "protocol": 368 messages, 808 requested actions). Short commands are about a
quarter of those requests (short3), and none of them is a literal command in the Rules' grammar: that is the gap this plan measures, not
"short commands" in general.

**What it decides.** Nothing is published. The numbers decide which follow-up, if any, gets its own plan (section 7).

## 2. What the demo does (the path the harness reproduces)

One message, in the order of `ui.js`:
1. The spell checker corrects the text before every reader (`ui.js:1192`, `spell.js` `load` = `create(...)` at `spell.js:160-169`).
2. Each tab reads with its own cutter. The BERT cut (SOP-BERT's cut head) is read by VSS and by the Rules too (`crossReads`, `ui.js:645-674`).
3. Gates, each at its default level `cost` (`GATE_DEFAULT = 'cost'`, `ui.js:99`; `combGate` `ui.js:361`; `neuralGate || 'cost'` `ui.js:607`):
   - **VSS-BERT**: `CC.combine(combined.json, {text, cut: 'bert', sop, vss}, combGate)` (`ui.js:398`). VSS's own confidence comes from
     `vss.json` (`ui.js:395`). A request that uses one not done is held too (`ui.js:418-421`).
   - **VSS tab**: `VT.columnVss(vote3.json, voteMsg(...), vssGate, {agreement: 'engine'})`. Its inputs include the votes of SOP-BERT
     and **the Rules** (`ui.js:586-599`, `VOTE_OPTS` `ui.js:493`).
   - **SOP-BERT tab**: `VT.columnSop(...)`, also with the Rules' vote. A request without head signals or cut output is held (`ui.js:601-616`).
   - Then, for every gate, the name rule `holdNamed` (`ui.js:1335-1363`) and the destructive policy `holdDestructiveIn` (`ui.js:1560-1562`).
   - The Rules execute what they read. Only the destructive policy's rule (b) applies to them.
4. Thresholds at `cost` (read from the files, never typed): VSS-BERT 0.94883 (`combined.json` `cuts.bert.levels.cost`); VSS tab commands
   0.90936; SOP-BERT tab commands 0.95507 (`vote3.json` `columns.*.levels.cost.command`).

**A structural difference, stated now.** The VSS and SOP-BERT tab confidences read the Rules' vote (`agree_rules`, `rules_clean`,
`rules_notes` are inputs of both `vote3.json` columns). VSS-BERT's does not (`combined.json` has no Rules input). On a set whose gold is the
Rules' reading, "the Rules agree" almost means "the reading is right". So on the synthetic sets, the VSS and SOP-BERT numbers show what those
tabs do, not how good their confidence is. "VSS executes it, VSS-BERT holds it" is expected there. On `short3`, where the gold is an
annotation, the Rules' vote is a real signal.

## 3. The data, and which reader may be judged on which set

Training data of the shipped readers (arm ALL, 2026-11-03): the 9 folders of `make_data.py` DIRS, the 2 sample folders, and the 12
`EXTRA_DIRS` of `docs/model/micro/registry.json`. That is 23 folders, 24,698 messages (the SOP-BERT README says 24698). The confidence
files were fitted on the calibration part of fresh2 and short3 (`sha256(id) % 3 == 0`).

Overlap was measured on 2026-11-08, exact text after lower case and collapsed spaces, and again with punctuation removed:

| set | VSS / SOP-BERT / VSS-BERT may be judged on it? | overlap with the 23 training folders | role here |
|---|---|---|---|
| `llm_bench/synth_short_t1` (1,793, uncommitted) | **yes**: not trained on, not calibrated on | 0 texts, 0 ids (both normalisations) | reported per form and narration (view `t1s`) |
| **bare view of t1** (new, section 3.1) | **yes** | 9 distinct spans exact (14 with punctuation removed): `undo`, `redo`, `undo that`, `redo that`, `add a green square`, ... | **deciding** (view `t1b`, core forms, texts not seen) |
| `llm_train/synth_short_r2` (1,997) | yes: only arm R2, which was not adopted (TRAIN_PLAN_R2.md "Result ... not adopted"), trained on it | 8 texts exact, 12 with punctuation removed | its bare view, minus the spans it shares with t1's (239 shared), is the **replication** (view `r2b`); never pooled with t1 |
| `llm_bench/short3` (530) | the **test part only**. The calibration part is the calibration data of all four confidence files: never used to judge | 6 texts | reported; gold = annotation; the "Rules read it right" subset is reported apart |
| `llm_short` (`sonnet_short`, `haiku_short`, 3,000) | **no**: training data of SOP-BERT and of the VSS cutter | all | not measured |
| fresh2 + short3 (raw) | only for the reproduction check (section 5) | n/a | tool check |

**Cleaning decision (taken now).** t1 does **not** need cleaning again for SOP-BERT or VSS training data: none of its texts is in it. Every
message still gets `seen_text` (its text, either normalisation, occurs in the 23 folders). It also gets `seen_trigger` (its gold trigger, lower
case, equals the trigger of a wire in the 23 folders; AGENTS.md "Fair comparison"). Rows with `seen_text` are reported apart and never decide.

**What t1 does not cover, said plainly.** The generator wraps every core command in narration (`gen_short_r2.py:148-150`: core forms come only
from `kind == "core_narr"`, and `narr = kind == "core_narr" or ...`). So t1 has **no bare create, set, move, delete, connect, undo or redo**.
Its create is always "add a ‹colour› ‹shape›": two parts, never "draw". (The t1 README's "with or without words around it" is wrong for core
forms.) "draw a circle" is bare, uses "draw", and has one part. That is why the bare view (3.1) decides, and why the probes (3.2) are reported
one by one.

### 3.1 The bare views (new, derived, outside the repository)

`t1b`: for each t1 row, the text becomes its gold wire's span. Gold, names and `meta.form` stay the same; `meta.narration = false` and
`meta.from = <source id>`; the id is `st1b-NNNNN` (the same number). Deduplicated by text (lower case, collapsed spaces; the first in file
order is kept). Then `check_file.py --mode rules`: kept only when today's Rules read the bare text exactly as its gold, and dropped when it
overlaps a test set. The **core forms** are create, set, move, delete and connect. Undo and redo are core too, but all 4 of their texts are seen
in training, so they are reported, never deciding. Expected size, counted before `check_file.py`: 736 distinct core spans that are not seen
texts (create 95, set 170, move 155, delete 150, connect 166).

`r2b`: the same steps on `synth_short_r2`, ids `sr2b-NNNNN`, minus every span that also occurs in t1's bare view (expected 725 core before
that subtraction).

### 3.2 The probes (new, 10 messages, `training/sketch/shortcmd/probes/msg_01.jsonl`)

Names = the start drawing's shapes and groups, as the page has them: Backdrop, IntakeZone, ReviewZone, Start, Process, Check, Done, MainTitle,
IntakeCaption, ReviewCaption, Intake, Review (`docs/js/start-diagram.js:15-31`). Gold = the Rules' reading (`check_rules.mjs` must say ok for
all 10).
1. draw a circle 2. make Start red 3. connect Start to Process 4. add a big blue square 5. move Done below Check (the five of the first
browser check) 6. delete Check 7. move Process left 8. add a cyan triangle 9. connect Done to Start 10. alright, make Done green please.
Probe 10 checks the spell checker, which turns "alright" into "right".

No probe holds a pronoun or a role that `last` could fill. So the harness's `last = []` cannot change their reading (the browser's `last`
after the start message is not readable from outside the page).

### 3.3 The spell checker

Measured on 2026-11-08 with the construction of `spell.js` `load` (`create({params, words: vocab + legendWords(legend), keep})`) and
`names = row.names`, it changes 70 of t1's 1,793 texts (mostly "alright" → "right", a direction word), 82 of `synth_short_r2`, and 12 of
short3 (e.g. "chevrons" → "cons"). The demo reads the corrected text, so **the harness reads the corrected text too** (views `t1s`, `t1bs`,
`r2bs`, `short3s`, `probes_s`). The 70 changed t1 rows are also read raw (`t1raw`: S2 writes the 70 raw rows to their own data folder, because `collect_rules3.mjs` reads no id filter), so the spell checker's effect is reported on its
own. A row whose gold span is no longer in the corrected text gets `span_lost: true` and is reported apart.

### 3.4 Optional set (owner decision Q2): `docs/bench/broad.json`

`docs/bench/broad.json` has 128 items, 20 of them creates: "Draw a circle", "add a hexagon", "Please draw a green triangle." ... It is the
only existing set with one-part "draw" commands. If the owner agrees, it is converted to rows (span = text, wire = its gold; items whose gold
is not one wire are skipped and counted). It is kept only where `check_rules.mjs` says ok, then spelled. It is reported, labelled "written
from the Rules' templates; favours the Rules; 7 texts seen in training". It never decides.

## 4. The harness

**Existing, used as they are (no edit):**
- `training/sketch/combine/collect_pair.mjs`. Records per message: `sop_own` (SOP-BERT, BERT cut), `vss_own` (VSS, its own cut),
  `vss_bert` (VSS on the BERT cut's units), `sop_vss` (SOP-BERT on the VSS cut), `units`. Defaults: `docs/model/neural/sop-bert`, the
  default registry, `SEG=composer` (`collect_pair.mjs:28`).
- `training/sketch/confidence3/collect_rules3.mjs`: `rules_own`, `rules_bert`, `rules_vss`.
- `training/sketch/combine/failures_vss_bert.mjs`: applies the shipped `combined.json` and `vss.json` as the demo does. Used here only as
  the second path of the reproduction check.
- These are **steps 1-2 of `confidence3/refit.sh` only**, with `REC` under `~/.cache`. `refit.sh` itself must **not** run: its steps 3-6
  write `docs/model/confidence/*` and stamp `versions.json` (`refit.sh:54,56,62`).

**New (training/sketch/shortcmd/):** see section 10 for the list. The core of the harness is `apply_gates.mjs`. It applies the four
gates to the records with the same `docs/js` modules the page imports: `combined-confidence.js`, `vote-confidence.js`, `vss-confidence.js`,
`neural-confidence.js`. Thresholds come from the files through `CC.threshold` and `VT.thresholdOf`. Per reader:
- VSS-BERT: the message shaping of `failures_vss_bert.mjs` (`demoF`: VSS's own confidence on the VSS cutter's edge signals; `bert_edges`
  for the combined `vss` part), then `CC.combine(COMB, msg, level)`.
- VSS: `VT.columnVss(vote3, m, level, {agreement: 'engine'})`. `m.vss` = `vss_own`, `m.sop` = `sop_vss`, `m.rules` = `rules_vss` +
  `rulesMsg`, each list through `VT.engineTargets(x, view)`, as `voteMsg` (`ui.js:538`). A request (same span) executes only when
  every wire of it clears its threshold, as `columnGate` (`ui.js:542-559`).
- SOP-BERT: `VT.columnSop(...)` with `m.vss` = `vss_bert` and `m.rules` = `rules_bert`. A request with no signals or no cut output is
  held (`ui.js:608`). The records always have the cut: `collect_pair.mjs` throws when the cut head was not called.
- All three learned readers: the name rule, the code of `failures_vss_bert.mjs` `DEP=names` (`holdNamed`, lines 62-80). This copy is
  labelled in the code; the original is `ui.js` `holdNamed`. It is not identical: it reads canonical values, and it lacks `ui.js`'s hold of a
  request that refers to a held request (`ui.js:1354-1355`). `apply_gates.mjs` counts the messages where either difference could matter
  (two or more produced requests), with the omitted rules below.
- Rules: `rules_own`, every request executed.
- The **view** of the drawing (`engineView`): for set rows, `{all: row.names, groups: empty, panels: empty}`. For the probes, the start
  drawing's (all = the shapes that are not panels; groups Intake and Review with their members; panels Backdrop, IntakeZone, ReviewZone).
- Every produced request of every reader is paired with the gold the same way (`layer_common.mjs` `pairValue`, `bench-canon.js`
  `canon` / `canonWant`, as `failures_vss_bert.mjs` `goldOf`). Kinds: `done_right`, `executed_wrong`, `extra_executed`, `held_right`,
  `held_wrong`, `extra_held`, `missed`. There are two levels per reader: `all` (execute every request) and `cost` (the gate).

**Not reproduced, and how it is counted (not hidden):**
- The two `ui.js` rules that need the wires' references: a request that refers to a wire of a held request, and the destructive policy.
  The records carry no references and no drawing. They can change a decision only in a message with two or more produced requests (references)
  or in a destructive request whose target is a description (rule (b)). At `cost`, rule (a) changes nothing: `logic.js:3213` holds when
  `!(u.conf >= opts.safe)`, and `safe` is the same cost threshold. `apply_gates.mjs` counts both kinds of message per reader and set. If they
  are more than 2% of a deciding set's requests, the report says that the parity claim is weaker for that set.
- `ctx.texts` (shape labels) and `last` (`collect_pair.mjs:246`: `last: []`). The probes are chosen so that neither can change them.
- Gold leak check: `collect_pair.mjs` passes the gold spans in `ctx.spans` (`collect_pair.mjs:246`). Only `llm_score.mjs` reads them, and
  only when `SEG=gold` (`llm_score.mjs:46,112-116`). Step S0 greps that no `docs/js` reader reads `ctx.spans`.

**Interfaces.**
- `apply_gates.mjs --set NAME --rec DIR --data DIR[,DIR...] [--parts all|sha3] [--view rows|start-diagram] [--compare-failures FILE] --out FILE`
  - Output JSON: `manifest` = sha256 of every record and data file, of the four confidence files, `docs/model/versions.json`, the `docs/js`
    modules and the script, plus `git rev-parse HEAD`.
  - `rows`: one per gold request and per extra, per reader and level. Fields: `{id, part, form, narration, seen_text, seen_trigger,
    spell_changed, span_lost, reader, level, kind, conf, threshold, situation (VSS-BERT: agree | disagree | sop_only | vss_only),
    reasons_group (CC.reasons group), own_group, top_pulls, n_produced}`.
  - `summary[reader][level]`: `{requested, right, wrong, held_right, held_wrong, missed, extras_executed, executed, cw_share,
    cw_wilson95, right_share, cost_score, auroc}`, and the same split by form, narration, `seen_text`, `seen_trigger`.
  - Exit 0 on success. Exit 2 on usage. Exit 3 on a refused input: a duplicate id, record files out of order, a record without a data row
    or the reverse, a gold span not in its text (unless `span_lost`), or `--compare-failures` differences.
  - `own_group`: the first group of `NC.reasons(sop-bert.json, {f, act, detail: <stub>})` or `VC.reasons(vss.json, {signals, world})`,
    taken only when the reader's own confidence is below its own `cost` threshold (`ui.js:426-427`). Only `.group` is kept: the plain
    sentence needs head details that the records do not carry, so the stub detail `{low: {}, stray: [], unkW: [], splitW: [], ctx: [],
    src: '', noCut: false}` is said in the code. `top_pulls`: the two largest pulls of `combined.json`'s `sop` part, computed as
    `failures_vss_bert.mjs` `sopPulls`.
- `outcomes.mjs ROWS.json...`: writes `outcomes.json`. Per outcome A-D of section 7: every value, its interval and `triggered: true|false`.
  A missing input → exit 3. A result, triggered or not → exit 0.
- `parity.mjs PROBE_ROWS.json BROWSER.json`: exit 0 when every rule of section 5.3 holds, else exit 1 with the differences.

## 5. Checks before any result (each with its stop rule)

5.1 **Scorer dry run.** On `t1s`, `t1bs` and `r2bs`, on the rows without a spelling change (`check_file.py` validated the unspelled
text), the Rules at `all` must be right on every request requested, with 0 wrong and 0 extras (the Rules wrote this gold). Anything else is a
scorer or pairing defect: stop, fix, add a test, rerun.

5.2 **Reproduction** (fresh2 opus_a-d + short3, raw text, collected today):
- (a) **blocking**: `apply_gates.mjs --compare-failures` finds the same kind for every gold request and extra of the test part as
  `DEP=names node failures_vss_bert.mjs` on the same records (two code paths, one set of records; `DEP=names` because the demo and
  `apply_gates.mjs` apply the name rule, `failures_vss_bert.mjs:59`).
- (b) **blocking for the tab paths**: on `training/sketch/confidence3/vote3_parity.json` (60 messages in the records' shape, built by
  `export3.mjs`), the VSS and SOP-BERT column confidences of `apply_gates.mjs` equal the file's within 1e-9, if the file holds expected
  confidences; if it holds none, this check is reported as not available and the probes (5.3) are the only check of the tab paths.
- (c) **reported**: the test-part numbers against the published ones, like for like:
  - VSS-BERT with the name rule: 758 executed, 746 right, 12 wrong or extra, score 35.9, confidently wrong 1.58%
    (`training/sketch/CLARIFY_DESIGN.md:217-219`; the file's own 761 / 747 / 14 / 34.8 / 1.84% are without the name rule);
  - VSS column and SOP-BERT column: `vote3.json`'s numbers (686 executed, score 22.9, 3.79%; 802, 33.4, 2.49%) were computed with
    `agreement: canon`; the page passes `agreement: 'engine'` (`ui.js:493`). `apply_gates.mjs` reports both modes on this check, and only
    the difference in the same mode is called drift.

  A difference in the same mode is code drift since the fits of 2026-11-03 (the VSS adapter `ee21ec2` and five `logic.js` commits came
  after). It is reported with counts and the commit list, not fixed.

5.3 **Browser parity (blocking).** Route (decided 2026-11-08, no download): the coordinator serves `docs/` locally
(`python3 -m http.server 8765 --bind 127.0.0.1 --directory docs`) and drives the page in the Claude desktop app's browser, as in the
ModernBERT check of 2026-11-07. Python Playwright is not installed on this machine (`import playwright` fails; `/opt/pw-browsers` does not
exist), so `test_combined_ui.py`'s frame is not used and nothing is installed. Per probe: a fresh page load, wait until every reader is
ready and the start message is answered, send the probe, open the message details and extract their text with JavaScript: the corrected
text, and per reader (VSS-BERT, VSS, SOP-BERT, Rules) the units, `confidence 0.xxx`, executed or not, and the SOP Lang wires. The coordinator
writes them to `$EV/browser_probes.json` in the format `parity.mjs` reads (its test fixes the format). A capture that is missing a probe or
a reader is a tool failure (`parity.mjs` exit 4), never a parity result. Parity holds when, for every probe and reader:
- the corrected text is equal;
- the units (their text) are equal;
- the reading is equal (wires parsed with `K.parse`, compared with `canon`);
- executed or held is equal;
- |Δconfidence| ≤ 0.002.

The details show 3 decimals. In the ModernBERT check of 2026-11-07, WASM and Node agreed to 3 decimals on these five messages
(`reports/evidence/modernbert-c100-publish/README.md`). A confidence within 0.002 that falls on the other side of the threshold counts as
a different decision. If parity fails: when the cause is in our code, fix it, add a test, and rerun to a fresh output path. When the cause
cannot be removed (WASM against Node numbers, a context the page has and the records cannot), **stop and report**. The numbers would then
be "the Node path", not "the demo", and the owner decides whether to continue. The coordinator also opens the live page, sends
"draw a circle", and compares the details with `browser_probes.json` (a screenshot in the evidence).

## 6. What is measured

For each reader (Rules, VSS, SOP-BERT, VSS-BERT), at `all` and at `cost`, on each view: per requested action (AGENTS.md "What counts as an
error"):
- right, wrong, not done (held right, held wrong, not read), extras executed;
- **confidently wrong share** = (executed wrong + extras executed) / executed, with a 95% Wilson interval;
- **share right** = right / requested;
- **cost score** = (right − 10 × (executed wrong + extras executed)) per 100 requested;
- AUROC of the confidence (right against not right, over the requests it produced).

Split by form, narration, `seen_text` and `seen_trigger`. Paired differences of the cost score use `compare_arms.mjs` `pairedInterval`
(1,000 resamples, seed 20261105). On `t1bs` and `r2bs` the unit is the message: one text each after the deduplication. On `t1s` it is the
group of messages with the same gold span (lower case, collapsed spaces), as in the recal plan. The probes are reported one by one.
**The deciding view V** = `t1bs` (the bare view of t1 as the demo reads it, after the spell checker), core forms (create, set, move,
delete, connect), rows without `seen_text`, `span_lost` or a spelling change.

The level `all` is a counterfactual ("execute every request this reader read"), not the page's "Execute all" setting: at "Execute all" the
page still holds destructive requests below the safety threshold (`ui.js:1463-1466`, `logic.js:3213`).

## 7. The interpretation, fixed before any result

All numbers below are on **V** (section 6) at `cost` unless said. Every outcome is evaluated, and several can hold. `outcomes.mjs` computes
them; nobody judges them by eye. Two corrections after the plan review, both before any result: C's bar is the demo's like-for-like test
value with the name rule, 1.58% (the file's 1.84% is without it, and the harness applies the name rule as the page does); D is decided on
`short3s` test only, because on Rules-gold sets the tabs' Rules vote makes D almost certain by construction (section 2).

| | outcome | triggered when | what it means | follow-up (a separate plan) |
|---|---|---|---|---|
| **C** (read first) | confidently wrong on short commands | VSS-BERT's confidently-wrong share has its 95% Wilson interval entirely above **1.58%** (the demo's test value with the name rule, `CLARIFY_DESIGN.md:217-219`) on V, on `t1s` (all forms) or on `short3s` test | it is surer than its own file promised, on the commands people fall back to | **F-C**: root causes of those confident mistakes, then a fix where the cause is. No plan that makes VSS-BERT execute more (F-A) starts before F-C is closed |
| **B** | it reads them wrong | VSS-BERT at `all` is right on fewer than **95%** of V's requests, or on fewer than **90%** of one core form with at least 30 requests | the reading is the problem, not the gate: these are the Rules' commands in the Rules' grammar, and the readers trained on `synth_rules*` (the same grammar) | **F-B**: a training-data plan for the forms and causes of section 8 (AGENTS.md 2026-11-02 22:04: the training data covers what the Rules detect) |
| **A** | the gate holds what it reads right | VSS-BERT at `all` is right on at least 95% of V; **and** held-but-right is at least **20%** of V's requests; **and** the paired difference (cost score at `all`) − (cost score at `cost`) has its interval above 0; **and** on `r2b` the point values agree (held right ≥ 20%, `all` > `cost`) | on short literal commands, executing what it reads would score better even when a mistake costs 10 right answers: the calibration, not the reading, holds them | **F-A**: a calibration plan for `combined.json` (only it) with short commands among the calibration data. It carries the ModernBERT lesson: guards on fresh2, nl_a and short3 (a pooled refit can move risk onto natural language). It needs a fresh short set: t1 and r2 are read by this plan |
| **D** | a part alone does better than the combination | on `short3s` test (annotation gold, where the Rules' vote is a real signal), the paired difference of the cost score at `cost`, (VSS tab or SOP-BERT tab) − VSS-BERT, has its interval above 0. On V and the other synthetic views the same difference is reported only | the demo's VSS or SOP-BERT tab acts better than its chat on short commands written without the Rules' cues. Part of it can still be the Rules' vote in their gates (section 2): **not** a finding about confidence quality alone | **F-D**: an owner decision. Giving VSS-BERT the Rules' vote is a new input, and changing which reader the chat speaks for is a change the owner did not propose. Both need the owner's approval (AGENTS.md "Working with the owner") |

- If A's other conditions hold but B also holds, B comes first. A is then reported as "also holds what it reads right".
- If **none** triggers, the report says so. The "draw a circle" hold is an instance (section 3.2 probes), and no follow-up beyond the root
  causes is proposed.
- The cause hypothesis of section 1 triggers nothing. It is reported as confirmed or not: is the most frequent situation among held-right
  requests on V `agree`, and is the most frequent `top_pulls` feature a size, cut or word signal (`n_roles`, `n_words`, `cut_*`,
  `unk_share`, `split_share`)?
- Reported, never deciding: `t1s` per form and narration, `short3s` test (annotation gold, and the subset the Rules read right), `r2b`
  beyond A's check, the probes, `bench_broad` (if Q2), and the spell checker's effect (`t1raw` against `t1s` on the 70 rows).

## 8. Root causes (AGENTS.md: after every evaluation)

`root_causes.mjs` reads the rows. Its counts must add up to the totals of `apply_gates.mjs`, else it exits 3.
- **Held but right** (VSS-BERT; also VSS and SOP-BERT; on V, `t1s` and `short3s` test, on the subset the Rules read right): counts by
  - the situation (agree, disagree, sop_only, vss_only),
  - the demo's reason group (`CC.reasons`: agree, disagree, action, alone),
  - the executing reader's own group (`own_group`),
  - the first `top_pulls` feature,

  each with 3 examples. These can disagree: the reason the chat shows is one thing, the pull that held it another. Where the cause sits:
  calibration (agree, the pull is a size, cut or word signal), the model or data (disagree: which reader read which key), the cut
  (sop_only / vss_only around narration), or our code (the spell checker, `t1raw` against `t1s`).
- **Executed wrong and extras executed**, per reader. Each one is read if there are 60 or fewer, else classified by rules and 20 are read.
  First cause: cut, action, value (which key), name or reference, the spell checker, or the gold itself questionable (the Rules' reading).
  With where it sits: data, front end, our code, calibration, model.
- **The tabs against each other**: requests VSS-BERT held that the VSS or SOP-BERT tab executed right, and the reverse, by form.

## 9. Steps

Agents do not commit (AGENTS.md). All commands run from `/home/skutner/browserLLM/diagram-vss-demo`.
`C=~/.cache/diagram-vss-shortcmd`, `EV=reports/evidence/vssbert-short-commands`, `SK=training/sketch`.
`F2="$SK/llm_bench/fresh2/opus_a $SK/llm_bench/fresh2/opus_b $SK/llm_bench/fresh2/opus_c $SK/llm_bench/fresh2/opus_d"`.
CPU only, **one heavy process at a time** (`collect_pair.mjs` header), `THREADS=2`.

| step | what | check that proves it |
|---|---|---|
| S0 | baseline | `node $SK/test_combined_confidence.mjs && node $SK/test_vote_confidence.mjs && node $SK/test_vss_confidence.mjs && node $SK/test_neural_confidence.mjs` exit 0; `sha256sum docs/model/confidence/{combined,vote3,vss,sop-bert}.json docs/model/versions.json $SK/llm_bench/synth_short_t1/msg_0*.jsonl $SK/llm_train/synth_short_r2/msg_0*.jsonl > $EV/inputs.sha256`; `git status --porcelain docs/` prints nothing; `grep -n "ctx\.spans" docs/js/*.js` prints nothing |
| S1 | tools: `bare_view.py`, `spell_view.mjs`, the probes file (and `bench_rows.mjs` if Q2), with tests | `python3 $SK/shortcmd/test_bare_view.py` and `node $SK/shortcmd/test_shortcmd.mjs` exit 0; `node $SK/synth/check_rules.mjs $SK/shortcmd/probes/msg_01.jsonl $C/probes_check.jsonl` gives `ok: true` for all 10 |
| S2 | views: `python3 $SK/shortcmd/bare_view.py $SK/llm_bench/synth_short_t1 --id-prefix st1b --out $C/cand/t1b.jsonl`, then `python3 $SK/synth/check_file.py $C/cand/t1b.jsonl $C/data/synth_short_t1_bare --mode rules`; the same for r2 with `--id-prefix sr2b --exclude-spans $C/data/synth_short_t1_bare`; `node $SK/shortcmd/spell_view.mjs <in> <out>` for t1, t1b, r2b, short3, probes (and bench); then the raw t1 rows listed in `$C/data/t1s/spell_changed_ids.txt` copied unchanged to `$C/data/t1raw/msg_01.jsonl` | counts per form written to `$EV/views.md`; `spell_view.mjs` writes `spell_changed_ids.txt` per view (t1: 70 expected, see 3.3); `check_file.py`'s check files `$SK/synth/synth_short_{t1,r2}_bare_check.json` exist |
| S3 | collection, one set at a time: `THREADS=2 node $SK/combine/collect_pair.mjs $C/rec/<set> <set> <data dirs> > $C/rec/<set>/log_pair.txt 2>&1`, then `node $SK/confidence3/collect_rules3.mjs $C/rec/<set> <set> <data dirs>`, for `repro` (`$F2 $SK/llm_bench/short3`), `t1s`, `t1raw` (the data folder `$C/data/t1raw` of the 70 raw rows whose text the spell checker changes, written in S2 from `spell_changed_ids.txt`), `t1bs`, `r2bs`, `short3s`, `probes_s` (and `bench_s`) | each of the 8 record files has one line per input message (`wc -l`); no error in the logs; the record ids equal the data ids in order |
| S4 | reproduction (5.2): `DEP=names node $SK/combine/failures_vss_bert.mjs $C/rec/repro $C/rows/repro_failures.json $F2 $SK/llm_bench/short3 2> $EV/repro_failures.txt`; `node $SK/shortcmd/apply_gates.mjs --set repro --rec $C/rec/repro --data <same dirs> --parts sha3 --compare-failures $C/rows/repro_failures.json --out $C/rows/repro.json` | exit 0 (0 differences); `$EV/repro.md` holds the drift table of 5.2(b) |
| S5 | browser parity (5.3): the coordinator captures the 10 probes in the desktop app's browser from the locally served `docs/` into `$EV/browser_probes.json` (section 5.3); `node $SK/shortcmd/apply_gates.mjs --set probes --rec $C/rec/probes_s --data $C/data/probes_s --view start-diagram --out $C/rows/probes.json`; `node $SK/shortcmd/parity.mjs $C/rows/probes.json $EV/browser_probes.json > $EV/parity.txt` | `parity.mjs` exit 0; the live-page screenshot of "draw a circle" in `$EV/` |
| S6 | independent review of the new code (section 12). **No deciding run before it passes** | the reviewer's verdict and the reviewed hashes in `$EV/README.md` |
| S7 | the measurement: `apply_gates.mjs` on `t1s`, `t1raw`, `t1bs`, `r2bs`, `short3s` (and `bench_s`); then `node $SK/shortcmd/outcomes.mjs $C/rows/*.json > $EV/outcomes.json` | the 5.1 dry run passes on the `apply_gates.mjs` output (the Rules rows of `t1bs` and `r2bs`, and of the unchanged `t1s` rows, at `all`: right = requested, wrong 0, extras 0); `$EV/outcomes.json` has A-D, each with `triggered` and its values; `$EV/tables.md` |
| S8 | root causes: `node $SK/shortcmd/root_causes.mjs $C/rows/*.json > $EV/root_causes.md` and the reading by an analysis agent | exit 0 (the counts add up); `$EV/root_causes.md` holds the classes, counts, examples and where each cause sits |
| S9 | the report: `$EV/README.md` (models by hash, data by hash, every command, every table); a "Result" section appended to this plan in plain words, outcome by outcome, with the follow-up each one justifies | at the end, `git status --porcelain docs/` prints nothing and `sha256sum -c $EV/inputs.sha256` passes |

**Estimates (not measurements).** Collection: refit.sh says "~4 min (2 CPU)" for fresh2+short3 with its fits. For about 7,000 messages over
all sets: 20-40 minutes. The browser capture: 5-15 minutes (two models load on the first page; then from the browser cache). `apply_gates`,
`outcomes` and `root_causes`: under a minute each. Implementation: one coherent slice. Long runs are reported when they finish, never predicted.

## 10. Files

**Create** (all new; nothing under `docs/`):
- `training/sketch/shortcmd/bare_view.py`: the bare view of a set folder (span as text, dedup by text, `--exclude-spans`, `--id-prefix`).
- `training/sketch/shortcmd/test_bare_view.py`: its tests.
- `training/sketch/shortcmd/spell_view.mjs`: the corrected text of every row with `spell.js` `create` exactly as `load` builds it; keeps
  `typed` and `spell_fixes`; `span_lost`; writes `spell_changed_ids.txt`.
- `training/sketch/shortcmd/apply_gates.mjs`: the four gates on the records (section 4).
- `training/sketch/shortcmd/outcomes.mjs`: outcomes A-D of section 7.
- `training/sketch/shortcmd/root_causes.mjs`: section 8's counts and classes.
- (no browser script: Python Playwright is not installed; the coordinator captures the probes in the desktop app's browser, section 5.3.)
- `training/sketch/shortcmd/parity.mjs`: harness against browser (section 5.3).
- `training/sketch/shortcmd/test_shortcmd.mjs`: tests of `spell_view`, `apply_gates`, `outcomes`, `root_causes` and `parity` (section 11).
- `training/sketch/shortcmd/probes/msg_01.jsonl`: the 10 probes.
- `training/sketch/shortcmd/bench_rows.mjs`: only if Q2.
- `training/sketch/synth/synth_short_t1_bare_check.json`, `synth_short_r2_bare_check.json`: written by `check_file.py`.
- `reports/evidence/vssbert-short-commands/`: README, `inputs.sha256`, `views.md`, `repro.md`, `browser_probes.json`, `parity.txt`,
  `tables.md`, `outcomes.json`, `root_causes.md`, the screenshot.

**Modify:** none. In particular `collect_pair.mjs`, `collect_rules3.mjs`, `failures_vss_bert.mjs`, `sets.mjs`, `compare_fits.mjs` and every
`docs/` file stay as they are.

**Reused patterns:**
- message shaping and the name rule: `combine/failures_vss_bert.mjs:41,55-80,86`;
- the column calls: `ui.js:593,607` (and `columnGate`, `ui.js:542-559`);
- the paired interval: `training/neural/parity/compare_arms.mjs:21-32` (importable: its main is guarded at line 104);
- the browser test frame: `training/sketch/test_combined_ui.py`;
- the bars-before-results format: `training/neural/MODERNBERT_RECAL_PLAN.md` section 5.

**Data flow (one bare command, "add a black circle", st1b-00001):**
1. `bare_view.py` makes the row from st1-00001's span.
2. `check_file.py` → `check_rules.mjs`: the Rules read it exactly; kept.
3. `spell_view.mjs`: unchanged.
4. `collect_pair.mjs` → `sop_own` (SOP-BERT's reading and its 24 signals), `vss_bert` (VSS on the BERT unit, with `cut_start_vss`),
   `vss_own`, `sop_vss`, `units`; `collect_rules3.mjs` → `rules_*`.
5. `apply_gates.mjs`:
   - VSS-BERT `CC.combine` → `conf` against 0.94883 → name rule → paired with the gold → `held_right` or `done_right`;
   - VSS `VT.columnVss` against 0.90936;
   - SOP-BERT `VT.columnSop` against 0.95507;
   - Rules executed.
6. `outcomes.mjs` → A-D.

## 11. Probes the implementer must run (in `test_shortcmd.mjs` / `test_bare_view.py`)

- **Boundary**:
  - a row whose span equals its text (bare already) stays one row;
  - an empty `names`;
  - a name with a non-ASCII letter ("Zoë") passes through spell and bare view unchanged;
  - a 300-character narrated text;
  - a row whose span the spell checker changes → `span_lost: true`, kept and flagged;
  - a set where a reader executes nothing → `cw_share` null and outcome C not triggered (a null is never a pass or a trigger by accident;
    the report says "executes nothing").
- **Idempotency**: `apply_gates.mjs` twice on the same inputs gives byte-identical output; `bare_view.py` twice gives the same file.
- **Orphan**:
  - a record id without a data row → exit 3;
  - a data row without a record → exit 3;
  - `--compare-failures` with one changed kind → exit 3 naming the id.
- **Error injection**:
  - a malformed JSON line → exit non-zero with file and line;
  - a duplicate id across the data folders → exit 3.
- **Gates on hand-made records**:
  - one SOP-BERT request at exactly the threshold executes, one 1e-9 below is held (`>=`, as `combine`);
  - a VSS request with two wires, one under its threshold, is held whole;
  - a SOP-BERT request without signals is held;
  - the name rule holds an executed connect that names the shape of a held create;
  - the cost score of 10 right and 1 wrong over 20 requested is 0.0;
  - the Wilson interval of 0/0 is null, and of 1/100 is about [0.0018, 0.0545].
- **Parity compare**: a confidence 0.0019 away passes; 0.0021 fails; an equal confidence with a different decision fails; a different wire fails.
- **Concurrency**: not relevant (one process; one heavy process at a time).

## 12. Review, verification and gates; who does what

- **Owner, before any run**: this plan (hypothesis, measures, section 7 bars), and Q1-Q4 (AGENTS.md "Experiments" 1).
- **Plan review**: the coordinator's choice (CLAUDE.md: one plan-reviewer round; Important findings applied as targeted edits).
- **code-implementer** (Sonnet 5.5, medium; AGENTS.md "pipeline wiring"): S1, the tools of S4-S5 and S7-S8, and their tests. No commits.
- **code-reviewer** (Opus 5.5, high), **required**: the new harness decides pass or fail. The packet: the diff of `training/sketch/shortcmd/`,
  the test outputs, `repro.md`, `parity.txt`. The questions:
  - does `apply_gates.mjs` call the same module functions with the same arguments as `ui.js` (`{agreement: 'engine'}`, `engineTargets`,
    the no-signals hold, the name rule, `>=`)?
  - is any threshold typed rather than read from a file?
  - is every omitted `ui.js` rule counted?
- **test-runner** (Haiku 5.5, medium; test-runner-medium only to interpret a failure): S0, S2-S4 and S7 runs. No source edits.
- **The browser capture of S5** is the coordinator's (the desktop app's browser; section 5.3).
- **implementation-verifier** (Opus 5.5, high): the faithfulness claim is the measurement's base. It reruns `parity.mjs` on the S5 files and
  checks two probes in the page by hand.
- **Analysis** (Sonnet 5.5, medium; AGENTS.md "error analyses"): S8's reading of the examples.
- **Coordinator**: the live-page spot check, the review of every result before it is reported, the Result section, and the commits when
  the owner says so.
- **Not required**: `regress.sh` (no reader code or model changes; AGENTS.md "Fair comparison"). No deployment and no browser end-to-end
  beyond S5.
- **Candidate identity**: the reviewed revision is `63fe9cc` plus the uncommitted files listed in section 13, pinned by
  `$EV/inputs.sha256` and the sha256 of each new script, recorded in `$EV/README.md` at S6.

## 13. Dependencies on uncommitted work (owner, 2026-11-07: "leave uncommitted")

- `training/sketch/llm_bench/synth_short_t1/`: **needed as data**, pinned by sha256 (msg_01 `e1e096aa…`, msg_02 `a223ec82…`).
  Committed and pushed as `0ab687c` (Q3, owner 2026-11-08), with `gen_short_r2.py --id-prefix`, `dedup_against.py`, `size_gate.py`, their
  test and the check file. Its README's create row was corrected there (every core form is narrated). This plan does not run those tools.
- `training/neural/parity/sets.mjs`, `compare_fits.mjs`, `test_score_tools.mjs` and the recal evidence: **not needed** (this plan does not
  use `collect_set.mjs` or `score_arm.mjs`). Nothing here edits them.

## 14. Decisions for the owner (each with the recommendation the plan uses; all four taken as recommended, owner 2026-11-08)

- **Q1, the bars of section 7**: held-but-right ≥ 20% (A); right at `all` < 95% overall or < 90% in a core form (B); confidently wrong above
  1.84% by its Wilson interval (C); D as written. Recommended as written. **Corrected after the plan review, before any result:** C's bar
  is 1.58% (the like-for-like value with the name rule) and D is decided on `short3s` test only (section 7).
- **Q2, `docs/bench/broad.json` as a reported set** (3.4): recommended yes. It is the only set with one-part "draw" creates, and it costs minutes.
- **Q3, commit t1 before this plan's evidence**: recommended yes (with its generator change and `dedup_against.py`), so the evidence can be
  rebuilt from git. The plan runs either way.
- **Q5, the browser route** (added after the plan review): the desktop app's browser, driven by the coordinator; nothing is installed.
  Taken by the coordinator as the route that needs no download (Python Playwright would be one); the owner may choose another.
- **Q4, the spell checker** turns "alright" into "right" (70 of 1,793 t1 texts) and "chevrons" into "cons" (short3). It is measured as the
  demo does. Fixing it is a separate change to reader code (`spell.js`) with its own `regress.sh`. Recommended: report it now; the owner
  decides whether to fix it.

## 15. Risks and open questions

- **Parity fails for a reason that cannot be removed** (WASM against Node; the SOP-BERT README records cut parity 19/20 against torch). Then
  the numbers are labelled "the Node path" and the owner decides (5.3).
- **Drift since the fits** (5.2(b)): today's readings differ from those the confidences were fitted on. This plan measures today's demo, which
  is the point. A large drift is itself a finding for the owner.
- **One generator.** V, `r2bs` and `t1s` come from `gen_short_r2.py`. `short3` (LLM-written, blind to the Rules' cues) and the probes are the
  guard. A pass or trigger says "on this generator's literal commands", no more.
- **Two-part creates only** on V. The one-part "draw a circle" form is in the probes and, if Q2, in `bench_broad`. A cue-variant set (every
  create cue of the Rules, `logic.js:875`) belongs to F-A or F-B if they are opened.
- **The Rules' vote in the tab gates** (section 2) makes the synthetic views a weak test of the VSS and SOP-BERT confidences; outcome D is therefore decided on `short3s` test. That is said wherever their
  numbers appear.
- **Omitted `ui.js` rules**: counted. If above 2% of a deciding set, said so (section 4).
- **check_file.py thins the bare view** (its token-set overlap with the test sets). The counts per form are reported. There is no size gate,
  because V's expected size (about 700) is not close to a level where the intervals stop meaning anything.

## Result (2026-11-08; written by the coordinator after reviewing the evidence)

Evidence: `reports/evidence/vssbert-short-commands/` (`README.md` with every command and exit code, `outcomes.json`, `tables.md`,
`root_causes.md`, `repro.md`, `browser_probes.json`, `parity.txt`). Checks before the result: the reproduction (5.2a: 0 differences against
`DEP=names failures_vss_bert.mjs` on 2,553 gold requests and 462 extras; 5.2b: the tab columns equal `vote3_parity.json`); the browser parity
(5.3: 10 probes x 4 readers, corrected text, units, readings and decisions equal, confidences within 0.002); the independent code review (S6:
blocked on one finding, fixed, approved on the delta); the scorer dry run (5.1: the Rules right on every request of `t1s`, `t1bs`, `r2bs`,
0 wrong, 0 extras). Today's demo differs from the published fit numbers (5.2c): on the old test part VSS-BERT executes 779 with 1.67%
confidently wrong, against 758 and 1.58% published; code drift since 2026-11-03, reported, not fixed.

| outcome | triggered | numbers (VSS-BERT at `cost` unless said) | follow-up the plan fixed for it |
|---|---|---|---|
| **C** confidently wrong on short commands | **yes** | V (734 bare core commands): 0 of 617 executed wrong, Wilson [0, 0.62%]; **`t1s`: 48 of 908, 5.3% [4.0%, 6.9%]**; **short3 test: 5 of 130, 3.8% [1.7%, 8.7%]**; bar 1.58% | **F-C**: root causes of those confident mistakes, then a fix where the cause is; no plan that makes VSS-BERT execute more (F-A) before F-C is closed |
| B it reads them wrong | no | at `all`, 734 of 734 right on V (every core form 100%) | |
| A the gate holds what it reads right | no | held but right 117 of 734 = 15.9% on V (bar 20%; `r2b` 14.2%); executing everything would score 100.0 against 84.1 (+15.9 [+13.4, +18.8]) | |
| D a part alone does better | no | on short3 test: VSS tab − VSS-BERT −6.9 [−22.1, +8.0]; SOP-BERT tab − VSS-BERT +1.2 [−5.8, +8.5] | |

**What C is made of** (`root_causes.md`; all 48 read): 30 are outline questions ("what is the border colour of X") read as
`property=color`; 9 are undo or redo with a count read without it; 9 drop a size word from a description ("erase the little squares").
SOP-BERT and the VSS tab make the same mistakes at similar confidence. The short3 test's 5 (LLM-written, annotation gold) are the same three
forms. In the 23 training folders of the shipped readers there are 0 outline-property questions, 0 undo or redo with a count, and 0 deletes
with a size filter (a one-off count by the implementer, not a registered measure). For undo counts the label conventions give undo no count
while the Rules do (`gen_rules_cover.py`), so the gold and the training labels disagree there. **So C's cause sits in the training data (and,
for undo counts, a label convention), not in the confidence**: the confidence cannot warn about a form the model never saw.

**C does not depend on the page rules the harness does not reproduce.** 21.7% of VSS-BERT's `t1s` requests are in messages where those rules
could change a decision (`omitted_rules` in `outcomes.json`; on V and `r2b`: 0%). Without the 6 destructive requests on a described target
and without every multi-request message, VSS-BERT is still wrong on 42 of 901 executed `t1s` requests, Wilson [3.5%, 6.2%], above the bar
(coordinator's check on `~/.cache/diagram-vss-shortcmd/rows/t1s.json`). What C rests on, said plainly: 30 of the 48 are questions answered
with the wrong property (nothing on the canvas changes), and 9 follow a label convention that conflicts with the Rules. Without the 30
questions the share would be under the bar. Both still count as confident mistakes under the metric fixed before the run.

**On the bare core commands (V) the readers read everything right** (all four 100% at `all`) and VSS-BERT executes none wrong; its gate holds
117 of them (SOP-BERT's tab 215, the VSS tab 4: the tabs' gates see the Rules' vote, section 2). The cause hypothesis of section 1 is
**confirmed on V and `r2b`**: 113 of the 117 held requests are cases where both readers agree (96.6%), and the largest pull holding them is
`n_words` (79.5%): 3-4-word commands are rare in the calibration data. It is **not confirmed** on `t1s` and short3 test, where the holds are
spread over agree, SOP-BERT alone and disagree.

**Reported, not deciding.** Probes: VSS-BERT executes 8 of 10 and holds "draw a circle" (0.938) and "move Process left" (0.923), all
readings right; SOP-BERT's tab holds 3, VSS's tab and the Rules hold none. `bench_s` (113 template items, favouring the Rules): VSS-BERT at
`cost` 86 right, 2 wrong of 88 executed. The spell checker changes 70 of 1,793 `t1s` texts; on them the Rules drop from 70 to 68 right (a typed
name, "Epilogue", turned into a canvas name, "Prologue").

**Next, by the plan's own rule:** F-C. Its cause points to training data for the learned readers (outline questions, undo and redo counts with
a decision on the label convention, sizes in descriptions), which is what AGENTS.md's owner rule of 2026-11-02 asks for; a separate plan.
**Independent verification** (implementation-verifier, Opus 5.5 high): PASS, "holds with caveats". It reran parity (holds; three deliberate
perturbations of the capture give exit 1, 1 and 4), recomputed the probes and every message of the four deciding sets from the records with
its own script calling the `docs/js` modules (confidences equal everywhere; one executed flag differed only because its own script applied
the name rule to VSS-BERT alone), and reran 5.2a (0 differences; a flipped kind is detected). On V and `r2b` the probes' situation (one unit,
both readers agree, no narration) covers 99.5% of the messages and no omitted rule applies, so the claim holds there. On `t1s` and short3
test, situations the probes do not cover (disagree, one reader alone, the cutter on narration, chat history for pronouns) are not checked
against the page; by section 4 the parity claim is weaker for short3 test (28-65% of its requests are in multi-request messages). Decisions
within ±0.0005 of a threshold (6 + 15 on V for VSS-BERT and SOP-BERT) cannot be separated from the page's 3-decimal display.
**C stands inside the verified situation:** all 48 of VSS-BERT's confident mistakes on `t1s` are single requests where both readers agree
(26 without narration, 22 with); on the 26 without narration alone it is 26 wrong of 103 executed, Wilson [17.9%, 34.4%] (coordinator's check).
