# ModernBERT C100: refit its confidence with short commands (plan)

Date 2026-11-07. Base commit `63fe9cc` (the ModernBERT tab reads `docs/model/neural/modernbert-c100/`).
Status: **approved by the owner, not run.** Owner, 2026-11-07: "keep your plan", then "after finishing the plan use the plan implementer for
implementation, no need for my approval". Reviewed twice, independently: plan-reviewer (Opus 5.5 high: revise; two blocking and three
important findings) and plan-reviewer-xhigh (Opus 5.5 xhigh: approve with changes; two major findings and minor ones). All findings are
applied below. The published confidence file `docs/model/confidence/modernbert-c100.json` stays as it is unless every bar of section 5 passes.

## 1. The short answer

**The problem.** The ModernBERT tab reads "draw a circle" right (`create shape=circle`) but does not do it: its confidence is 0.672 and its
threshold 0.9228. It is not one message: on the short commands of `training/sketch/llm_train/synth_short_r2` (scratch scorer,
`reports/evidence/modernbert-c100-publish/synth_short_r2.C100-s0.txt`), C100 reads 99.4% of the creates right when every request is executed,
and at its threshold executes 26 of 169.

**The cause (measured).** The confidence was fitted on 678 calibration messages: 310 natural-language messages (`nl_a`), 195 long messages
(`fresh2`) and 173 short commands (`short3`). On that mix, ModernBERT's "create" readings were right about a third of the time, so one of the
24 confidence signals, `act_prior`, scores every create low (0.327 in the file; 0.539 is the default for an action). The reply says it in its
own words: "requests read as 'create' are often read wrong (right about 33% of the time on the calibration messages)". So the threshold is not
the problem; the calibration data does not look like short commands.

**The change: one, and only the confidence.** The same model, the same 24 signals, the same fitting code (`training/neural/parity/calibrate_arm.mjs`),
the same cost-10 rule for the threshold. Only the calibration data gets a fourth source: the calibration part of `synth_short_r2`
(679 short commands). No retraining, no new model, no hand-set threshold.

**How we know it worked:** on a fresh set of short commands from the same generator that nothing has seen (section 3), the refitted
confidence must do more right at its threshold, more right on creates in particular, without a higher share of confident mistakes; and on the
long, short and natural test sets it must not lose (section 5). If any bar misses, the result is reported and the published file stays.

## 2. What exists and what is reused

| what | where | state |
|---|---|---|
| the model | `~/.cache/diagram-vss-modernbert/arms/C100-s0/export/modernbert-C100-s0/` (the folder every C100 record names; artifacts hash `b57bedf4…`). `docs/model/neural/modernbert-c100/` holds the same model, tokenizer and config files plus a README, so its artifacts hash differs: **records are collected from the cache folder only** | unchanged by this plan |
| its readings | `~/.cache/diagram-vss-modernbert/arms/C100-s0/eval/rec_fs.jsonl` (fresh2, short3), `rec_nl.jsonl` (nl_a), `rec_cs.jsonl` (collected_1, scenes_test), with manifests; collected with `--allow-text-overlap` and `THREADS=5` (`parity/arm_eval.sh`) | reused, not collected again |
| the published fit | `eval/cal-fresh2-short3-nl_a.confidence.json` = `docs/model/confidence/modernbert-c100.json` (byte-identical), made by `calibrate_arm.mjs --cal fresh2,short3,nl_a` on `rec_fs rec_nl rec_cs` | the control (F_ctrl) |
| short commands for calibration | `training/sketch/llm_train/synth_short_r2` (1,997 messages, ids `sr2-*`; gold = the Rules' reading: a message is kept only when the Rules read it exactly as generated) | not a training folder of C100; 19 of its texts occur in C100's `train.jsonl` or `cut_train.jsonl` (`collect_set.mjs` checks both; the earlier "18" counted `train.jsonl` only) |

Every other synthetic short-command folder (`synth_rules*`, `synth_combo*`, `ops_formulations`) and all 3,000 texts of `llm_short` are in
C100's training data, so none can calibrate a confidence or guard the result: the model is surer on what it trained on.

**A correction this plan records.** The model README (`docs/model/neural/modernbert-c100/README.md`) and the run log entry of 2026-11-07
say C100's training data "lacks" outline, label removal, undo counts and sizes in descriptions. Counted in C100's `train.jsonl`: 70 requests
set an outline, 146 remove a label (`label=""`), 0 ask about an outline (the one row with `property=outline` is an `equalize`), 0 give an
undo or redo count. So outline questions and undo counts are absent; outline and label removal are present but rare. The correction goes in
the run log and in this plan's evidence README, **not in the model README**: any edit there changes the folder's version in `versions.json`,
which changes every model file's `?v=` and makes every returning visitor download the 156 MB model again. The model README is corrected the
next time the model files change anyway.

## 3. The data

**Calibration (added): set `short_synth`** = `synth_short_r2`, split by the rule fresh2 and short3 already use (`sha256(id) % 3 == 0` is the
calibration part): 679 calibration messages (6 of the 19 overlap texts among them), 1,318 test messages. The test part was already read once
(it is how C100 was chosen), so it is reported, never used to decide.

**Fresh test (new, decides): set `synth_short_t1`**, made by the same generator with another seed, its own ids, then cleaned:
1. `gen_short_r2.py` gets an `--id-prefix` option (default `sr2`, so seed 0's output is unchanged);
   `python3 training/sketch/synth/gen_short_r2.py --seed 1 --n 2400 --id-prefix st1 --out <scratch>/t1_cand.jsonl`
2. `training/sketch/synth/dedup_against.py` (new): drop every message whose text (lower case, spaces collapsed) equals a text of
   `synth_short_r2`, of C100's `train.jsonl` or `cut_train.jsonl`, or of `nl_a` / `nl_b`, and duplicates within the file; refuse (exit non-zero)
   if any id equals an id of `synth_short_r2` or of the training files;
3. `python3 training/sketch/synth/check_file.py --mode rules` (keeps a message only when today's Rules read it exactly as its gold; drops
   texts of fresh2, short3, collected and scenes_test) into `training/sketch/llm_bench/synth_short_t1/`, with a README and the check file.

**Gate before any fit, fixed now:** at least 1,500 messages kept, and at least 120 of form `create`; otherwise stop and report. The count per
form is reported (forms with few possible texts may be thinned by the dedup; that is not a gate).

**What this test measures, said plainly:** agreement with the Rules on short, template-made commands of this generator's forms, which is
narrower than "everything the Rules detect". It is in-distribution for the refit. Its create form is "add a ‹colour› ‹shape›" with or without
words around it; it never says "draw". The guard against fitting the generator is `short3` (short commands written by an LLM writer blind to
the Rules' cues), whose test part is a gate in section 5.

## 4. The two fits

Both on the same model readings, by `calibrate_arm.mjs`, nothing else different. All commands run from the repository root
(`/home/skutner/browserLLM/diagram-vss-demo`), with `C=~/.cache/diagram-vss-modernbert/arms/C100-s0` and `EV=$C/recal` (a new folder);
nothing in `$C/eval/` is written or overwritten.
- **F_ctrl** = `node training/neural/parity/calibrate_arm.mjs --cal fresh2,short3,nl_a $EV/ctrl.confidence.json $EV/ctrl.calibration.json $C/eval/rec_fs.jsonl $C/eval/rec_nl.jsonl $C/eval/rec_cs.jsonl`,
  run before any new record exists. **Reproduction check:** `cmp $EV/ctrl.confidence.json docs/model/confidence/modernbert-c100.json` must
  report no difference. If it does, the tools have drifted: stop and report.
- **F_short** = `node training/neural/parity/calibrate_arm.mjs --cal fresh2,short3,nl_a,short_synth $EV/short.confidence.json $EV/short.calibration.json`
  on the same three record files plus `$EV/rec_ss.jsonl`.

The calibration pool goes from 678 to 1,357 messages, of which 852 (63%) are short commands (short3's 173 and short_synth's 679).
`calibrate_arm.mjs` has no weighting, so each set counts by its messages. That mix is decision D1. Near-duplicate template messages of
`short_synth` fall into different folds, so its out-of-fold numbers may be optimistic; the decision rests on the fresh set, not on them.

Folds: `calibrate_arm.mjs` puts a calibration message in fold `index % 5` of the pooled list, ordered by `SET_ORDER` of `sets.mjs`
(`arm_lib.mjs` `loadRecords`). The new sets are appended after every existing set, so the folds of the 678 existing messages do not move
(a test in S2; the reproduction check also shows it).

## 5. The bars, fixed before any result

Every number at each fit's own cost-10 threshold. The score files are `score_arm.mjs` outputs over the same four record files
(`$EV/ctrl.score.json`, `$EV/short.score.json`); the paired comparison is `compare_fits.mjs` (S3) with A = F_short and B = F_ctrl
(asserted from each score file's `calibrated_on`: A's has `short_synth`, B's does not). Fields, exactly:
- **cost difference and its interval:** `comparisons['<set>/<part>'].variants['<view>.today.gate']`, fields `difference` and `ci95`, with
  `<view>` = `gold`, except `opus` for `nl_a`. The top-level variant, not `without_train_text_overlap`. Interval from `compare_arms.mjs`'s
  `pairedInterval` (1,000 resamples, seed 20261105). The unit resampled is `compare_arms.mjs`'s (a session, else a group, else the message),
  except on `synth_short_t1`: there `compare_fits.mjs` sets each message's group to its request's span, lower case, spaces collapsed, so the
  wordings of one command (with and without words around it) count as one unit.
- **"the interval is above 0"** = `ci95[0] > 0`; **"not entirely below 0"** = `ci95[1] >= 0`.
- **confident mistakes** = `wrong + extras` of `sets.<set>.<part>.views.<view>.today.at_threshold`, per 100 requested actions
  (`/ requested × 100`); **confidently wrong share** = that block's `wrong_execution_share` (a fraction).
- **A missing value is a miss:** a null `ci95`, a null share or a fit that executes nothing where a bar needs a share.

| | measure | set | it passes when |
|---|---|---|---|
| **P1** | cost difference, paired | `synth_short_t1/all` | `ci95[0] > 0` |
| **P2** | confidently wrong share | `synth_short_t1/all` | F_short's ≤ F_ctrl's (fractions, point values) |
| **P3** | cost difference, paired, on the messages of form `create` | `synth_short_t1/all`, subset | `ci95[0] > 0` |
| **G1** | cost difference, paired; confident mistakes per 100 requested | `short3/test` (432 requested) | `ci95[1] >= 0`, `difference >= -5`, and F_short's confident mistakes ≤ F_ctrl's + 1.0 per 100 requested: **at most 9** (F_ctrl: 5) |
| **G2** | the same | `fresh2/test` (1,313 requested) | the same; **at most 21** (F_ctrl: 8) |
| **G3** | the same | `nl_a/development`, view `opus` (392 requested) | the same; **at most 4** (F_ctrl: 1) |

The F_ctrl numbers above are those of the published score file (`$C/eval/cal-fresh2-short3-nl_a.score.json`); S6 reproduces them, and a
difference there is a tool defect to stop on. The G bars are written as "no detectable loss, a point loss of at most 5, at most one more
confident mistake per 100 requested actions": on these sizes (58 and 8 executions of F_ctrl on short3 and nl_a) a bar on an interval's lower
end or on the share of executions would be decided by one or two messages.

**The P3 subset:** the ids of `synth_short_t1` rows with `meta.form == "create"`, read from the set's own files (records carry no form).
`compare_fits.mjs` keeps those positions in every per-message array of both sidecars (`ids`, `session`, `group`, `overlap`, and each
variant's `right`, `bad`, `G` per message) and runs the same comparison on them.

**Reported, not deciding:** both fits on `short_synth/test`, `collected_1` (26 real messages, each as sent and as corrected; too few),
`scenes_test`; executions per 100 `nothing_to_do` messages; per form on the two short sets (joined to `meta.form` by id); `act_prior` of
create and `act_prior_default` before and after; "draw a circle" and the five browser-check messages.

**If P1, P2, P3 and G1–G3 all pass:** F_short replaces `docs/model/confidence/modernbert-c100.json` (S8). **If any misses:** stop, report the
numbers and the root causes, publish nothing. No second fit, no other mix, no moved bar (AGENTS.md, "Experiments"). A step that fails by a
defect of a tool (an exception, a refused input) is not a result: it is fixed, its test added, the step re-run to a fresh output path, and
the report says so.

## 6. The steps

The implementer (code-implementer) runs S0–S7 and S8 up to the review; it does not commit or push (AGENTS.md: agents do not commit). The
coordinator (the main session) reviews and commits.

| step | what | check that proves it |
|---|---|---|
| S0 | baseline of the tools | `node training/neural/parity/test_score_tools.mjs` passes before any edit |
| S1 | `--id-prefix` in `gen_short_r2.py`; `dedup_against.py`; `synth_short_t1` (section 3) | tests: the default prefix gives `sr2-` ids and the same texts as `--id-prefix sr2` for the same seed; `dedup_against.py` drops a text of `synth_short_r2`, of `train.jsonl`, of `cut_train.jsonl` and of `nl_a`, keeps a new text, refuses a colliding id; the size gate of section 3; the README and `synth/synth_short_t1_check.json` |
| S2 | `sets.mjs`: `short_synth` (files under `llm_train/synth_short_r2/`, parts calibration / test by `sha256(id) % 3`) and `synth_short_t1` (files under `llm_bench/synth_short_t1/`, part `all`), both appended at the end of `SET_ORDER`, each with `kind: 'short'` | new cases in `test_score_tools.mjs`: the counts (679 / 1,318; t1's size), the existing counts unchanged (1,113 items, 368 / 745), the order of the existing calibration records unchanged; every existing case still passes. **Scoring dry run:** `READER=rules node training/neural/parity/collect_set.mjs --train-data $C/../data/C100 --allow-text-overlap $EV/rules_ss.jsonl short_synth synth_short_t1`, then `node training/neural/parity/score_arm.mjs none $EV/rules_ss.score.json $EV/rules_ss.jsonl`: every request executed right on both sets must be 100% (the Rules wrote this gold), so the scoring of every form is checked before any model is scored |
| S3 | `training/neural/parity/compare_fits.mjs` (new): a thin wrapper over `compare_arms.mjs`'s `compareSidecars` and `pairedInterval`; skips only `assertSameFit` and refuses two score files of different records or artifacts; asserts A = F_short; the span unit on `synth_short_t1`; the P3 subset; the bars of section 5 as pass / miss, written to a JSON file | tests: a fit against itself gives 0 with an interval of [0, 0]; one more right request gives a positive difference; one more wrong request costs 10 per 100; different records are refused; swapped arguments are refused; the subset result equals `compareSidecars` run on a hand-filtered sidecar; the span unit groups two wordings of one command; each bar's rule (a fraction compared with a fraction; the confident-mistake limits; a null `ci95` or share is a miss) |
| S4 | F_ctrl and its reproduction check (section 4) | `cmp` reports no difference |
| S5 | read `short_synth` and `synth_short_t1` with C100: `READER=modernbert THREADS=5 MODEL=$C/export/modernbert-C100-s0 node training/neural/parity/collect_set.mjs --train-data $C/../data/C100 --allow-text-overlap $EV/rec_ss.jsonl short_synth synth_short_t1` | the manifest's `artifacts_sha256` is `b57bedf4ebf0557ac6f469a99e60239ff89963aee0366f333a3df4a30836b7ef`; it lists the 19 overlap texts, all in `short_synth`, none in `synth_short_t1`; 0 failed messages (a retry after a failure goes to a fresh output path) |
| S6 | F_short; `score_arm.mjs` for both fits on all four record files; the reproduction of F_ctrl's numbers of section 5; `compare_fits.mjs`; the table of section 5 with pass / miss | the table, the JSON and the commands in `reports/evidence/modernbert-c100-recal/` |
| S7 | root causes of what F_short still executes wrong, per form and per first cause (AGENTS.md: after every evaluation); the run log entry in `training/neural/MODERNBERT_RUNLOG.md`, pass or miss, with the correction of section 2 | the same folder; the run log entry |
| S8 | only if every bar passes: copy F_short to `docs/model/confidence/modernbert-c100.json`; `python3 training/sketch/stamp_models.py` (only the confidence entry may change); `node --test training/neural/modernbert_runtime_test.mjs`; `bash training/sketch/regress.sh`; in the run log entry, a note that the model README's confidence lines describe the first fit until the model files next change | the coordinator: the page served locally, the same five messages as the first browser check (readings unchanged, confidences from the new file); an independent review of the diff; then commit and push (the owner's go, given in advance) |

CPU only. No GPU, no training, no new data written by an LLM. Records stay outside the repository (`~/.cache/...`); summaries and commands go
in `reports/evidence/modernbert-c100-recal/`.

## 7. What changes for the user if it passes

The ModernBERT tab's default threshold is chosen again by the same rule on the new pool, so it moves, but not by hand. Expected (a
hypothesis, not a result): more short commands done at once, creates among them; long and natural-language messages about as before.
The level setting (ModernBERT › Settings) keeps its five levels, recomputed on the new pool. (Already so before this plan: the Settings
level table reads `heldout_oof_*` fields that `calibrate_arm.mjs` never writes, so ModernBERT's table shows dashes; not changed here.)

## 8. Decisions (taken: the owner, 2026-11-07, "no need for my approval"; each is the recommendation)

- **D1, the mix:** the 679 short commands are pooled with the 678 existing messages as they are (no weights exist in the tools, and any
  weight would be a knob).
- **D2, the gold of the short sets:** the Rules' reading of template-made text counts as right. Where the Rules and C100's training labels
  disagree (6 training rows "undo twice / 3 times" have no count; the generator's gold has `count`), the Rules win. This follows the owner's
  rule of 2026-11-02 (short commands are measured against the Rules).
- **D3, the bars** of section 5: P3 (creates) after the first review; the exact fields, the span unit on `synth_short_t1` and the guard
  limits as counts of confident mistakes after the second. P2 compares point values and is strict; the G bars accept a point loss of up to 5
  when no loss is detectable. Both are accepted as written.
- **Out of scope:** the same refit for SOP-BERT or VSS-BERT; retraining C100 on the forms it lacks (that is training data, a separate plan);
  the empty Settings level table.

## 9. Risks

- **Fitting the generator.** The added calibration data and the deciding test come from one generator. Guarded by G1 (`short3`, LLM-written);
  a pass says "better on this generator's commands", which is what the plan claims, no more.
- **A pool that is 63% short commands** lowers the price of a create everywhere, also in long messages where creates are often wrong. Guarded
  by G2 and G3, each with a limit on confident mistakes.
- **Bars passed by holding the wrong forms only.** Most of F_ctrl's confident mistakes on short commands are outline questions; a refit can
  learn to hold them and pass P1 and P2 while creates stay held. P3 is the bar for creates.
- **P2 against P3.** `outline_create` (0 of 79 right before) shares the act `create`; raising create's price can raise confident mistakes.
  That is what P2 is there to catch.
- **The t1 gate stops the run.** Today's Rules differ from those that built `synth_short_r2` (5 commits to `logic.js` since `bb575b8`), and
  the dedup thins the forms with few possible texts. The gate asks only for the total and the creates.
- **The reproduction check fails** (the published file cannot be rebuilt from the cached records): then no comparison is fair; stop.
- **Overlap.** 19 `short_synth` texts were seen in training; they are marked in the records and count in the calibration as they are. None
  may be in `synth_short_t1` (S1's dedup and S5's manifest check).
