# ModernBERT rare-head loss experiment — 2026-11-09

Status: **completed experiment with a measured seed-zero failure; confirmation stopped.** Training/export, both fit measurements, the registered quality evaluation, automatic root causes, the sole public verdict and independent quality verification are complete. R0, both R1 rows, R2 and both R3 rows fail; P3 provenance passes. Verification confirms the integrity of this negative result, not acceptance of the model.

## Fixed experiment and evidence

W-s0 changes only the all-head square-root positive/absence class-loss weighting on the unchanged F corpus: 28,330 messages, 58,552 requests and 52 class heads. Eight epochs and all 14,640 updates completed, with `max_updates=0`; each training row retains the same exposure. The fixed data, recipe, memberships, views and calibration method are unchanged. The approved plan is `modernbert-rare-heads-plan-2026-11-09_codex.md`; source candidate v2 is `52a35fa7250204a1162ddd5d5ce9e3a22499637261881ec22a342b24c26c1b59`, frozen protocol `b15da300cb1817ad67e446c2de80aca54ba27cae523f4ba1bab0c1bd24e25738`, base HEAD `0ab687cc142e884ed16332925c6d7cd558e1b8fb` with preserved dirty/untracked work. Large artifacts remain under `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09`.

Completed plan/source/delta reviews, preflight verification, canonical P2, historical applicability and overfit evidence were reused on matching identities. They are source/fixture evidence, distinct from the actual model measurements below. The original running job was preserved across coordinator takeover. One of at most three trajectories was used; no replacement, tuning, data edit or confirmation has occurred.

## Actual own-training fit: R0 miss

Each runtime measured 1,699 head-target observations: 259 populated targets and 1,440 absent controls, across 1,574 distinct prepared requests and 197 batches. Counts refer to selected targets, not whole-request correctness. Index-zero absence is distinct from populated literal `none`.

| Target population | Float | Production Node q8 | Required correct |
|---|---:|---:|---:|
| Outline create, including populated `none` | 89/89 | 89/89 | 85/89 |
| Coloured outline create (subset) | 74/74 | 74/74 | 71/74 |
| Outline set | 97/97 | 97/97 | 93/97 |
| Added r2 description size | 35/35 | 35/35 | 34/35 |
| Canonical-word r2 subset | 21/21 | 21/21 | 20/21 |
| Direct size/count | 14/14 | 14/14 | 14/14 |
| Old contextual description size, separately reported | 24/24 | 24/24 | Not an R0 bar |
| Deterministic absent controls | **1,437/1,440** | **1,437/1,440** | **1,440/1,440** |

Both commands exited 1 because the absent-control bar missed. Their inference engines and Node producers exited 0; full receipts, batch/observation counts and unchanged before/after identity maps establish completed measurements. Selected positive action and word-tag predictions were also correct. All 259 populated observations, all absent controls, and action/tag results are published in `evidence/modernbert-rare-heads/training-fit-observations.jsonl`; all 52 head tallies are in the two fit summaries.

The same three absent observations predict description size `small` in both runtimes:

- Ordinal 20028, `p2-08-040`, “the herbs one dotted”: absent gold; no established same-input conflicting positive target. This is a measured size overprediction.
- Ordinals 19641 (`p2-02-015`) and 56301 (`tr-02-012`), “dashed”: absent gold. Another exact-input training row, ordinal 56532 (`tr-06-014`), labels size `small`. A deterministic head cannot satisfy all three labels. The two failures remain in R0; no gate or data was changed.

These three observations cover two distinct prepared inputs. The stored `conflict=false` flag counts distinct populated values and does not establish absence-versus-positive consistency. The 24 old contextual positives are reported separately: fitting annotations such as “push them out a bit” does not establish that a size is available from the words alone.

## Runtime and independent actual-model verification

Strict Python-ORT versus production Node-q8 parity passed at the registered `atol=rtol=0.001`: all 197 batches, 1,973,480 values including 304,680 padding values, with zero numerical failures or action/class/tag/word differences. Historical B's padding-logit failure remains a failure.

The export step exited 2 and finalized its artifacts. Seven fixture IDs have float-to-q8 decode differences; the separate `torch_vs_node` comparison has three text groups with one tag difference and two cut differences. Neither is a general float/q8 equivalence claim. The export's 41-fixture Python/Node q8 check also passed, separately from the larger fit check.

An independent Sol High verifier loaded the actual final checkpoint and actual q8 artifact on padded batch 29 (8×10, 14 padding tokens, including “dashed”). Fresh float and Python q8 raw outputs exactly reproduced their saved outputs; fresh q8 versus Node had maximum differences of 2.19345e-5/3.81470e-5/1.14441e-5 for token/sequence/cut logits, with no tolerance failures. It independently recomputed the complete fit denominators, parity and misses. Probe runtime 11.61 seconds, peak RSS 2,075,082,752 bytes; source/protocol/model hashes unchanged. The CPU lock was released before quality evaluation. Persistent evidence: task `verification/actual-fit-v1/`; compact copies under `evidence/modernbert-rare-heads/`.

## Quality evaluation and registered decisions

The original quality evaluation completed at 11:43:39 Europe/Bucharest with exit 0: all ten collections, 33 sealed outputs and nine automatic root-cause parts with 162 successful scorer reconciliations. The resource supervisor recorded 2,975.973 seconds and peak RSS 1,448,824,832 bytes. This completion establishes the measurement, not acceptance of the model. The sole public seed-zero verdict completed at 11:51:18 with exit 1, no signal or tool error, and seven complete rows: six failed acceptance rows and the passing P3 provenance row. Independent verification of these new quality artifacts subsequently completed.

| Registered row | Result | Decisive evidence |
|---|---|---|
| R0: own-training fit | Fail | Absent controls 1,437/1,440 in both runtimes; all positive bars met |
| R1: W versus F | Fail | Clean-t1 cost gain +6.7947, but paired 95% CI [−1.4717, 14.9606]; clean-create gain −3.4483, CI [−37.5000, 29.1667] |
| R1: W versus B | Fail | Clean-t1 gain +9.8227, CI [2.8148, 17.1491], but execution risk rises; clean-create gain −6.8966, CI [−29.2683, 19.0476] |
| R2: clean-form capability | Fail | Outline-create 24/80 (30%) versus 90% required; all other form bars met |
| R3: W versus F, with C100 anchor | Fail | Full fresh2 Guard G fails against F and C100; labels, lowercase preservation and clean-t1 risk checks versus F pass |
| R3: W versus B, with C100 anchor | Fail | Full fresh2 Guard G fails; affected lowercase and short3 lowercase lose over two points; clean-t1 risk exceeds B |
| P3: trajectory provenance/contracts | Pass | Completed fixed schedule, unchanged F data/recipe and bound training/export evidence |

R1 requires both a cost gain of at least five and a positive paired interval lower endpoint, nonincreasing execution risk, and positive clean-create interval lower endpoint. The clean-create subset here is the separately frozen 29-request population; it is not the 80-request outline-create form.

Guard G requires cost difference ≥−5, paired interval upper endpoint ≥0, and at most one additional wrong/extra per 100 requests. All wrong/extra-increase checks pass. Full-view guard results follow; clean-subset comparisons remain in the linked verdict and appendix.

| Full guard view | W−F cost [95% CI] | W−B cost [95% CI] | W−C100 cost [95% CI] |
|---|---|---|---|
| fresh2 test | **−9.5963 [−17.0423, −5.8912], fail** | **−5.4075 [−12.6071, −0.5464], fail** | **−5.9406 [−15.9218, 2.5601], fail** |
| short3 test | 0.0000 [−14.8248, 12.8736], pass | −0.9259 [−15.9251, 12.7315], pass | −0.2315 [−14.9864, 13.9219], pass |
| nl_a development | +6.8878 [−3.6364, 21.1302], pass | +7.9082 [−3.1026, 21.9839], pass | +12.5000 [0.2674, 28.1167], pass |

The frozen grouped paired intervals and every numerical check are preserved in [seed0-verdict.json](evidence/modernbert-rare-heads/seed0-verdict.json). A passing full-view guard does not imply high coverage: W executes only ten correct nl_a requests of 392, with one extra.

## Correct readings, confident mistakes and held requests

Each arm uses its own threshold selected by the unchanged grouped cost-10 calibration method. Shares use all frozen requested actions; wrong execution and extras cost ten correct answers each. A held or unread request scores zero. Risk is wrong plus extras divided by executions; it is unavailable when there are no executions.

| Clean t1, 1,354 requested | W-s0 | F-s0 | B-s0 |
|---|---:|---:|---:|
| Correct executed / requested | 1,083 / 79.99% | 1,101 / 81.31% | 820 / 60.56% |
| Executed wrong / extras | 18 / 0 | 29 / 0 | 5 / 0 |
| Confidently wrong share of executions | 1.63% | 2.57% | 0.61% |
| Cost per 100 requested | 66.69 | 59.90 | 56.87 |
| Asked requests | 253 | 224 | 514 |
| Held by confidence / structurally held / unread | 253 / 0 / 0 | 224 / 0 / 0 | 549 / 2 / 15 |
| AUROC on this population | 0.883940 | 0.930616 | 0.961311 |
| Selected execution threshold | 0.931999 | 0.875765 | 0.914966 |

Held counts describe produced readings; they need not sum with request outcomes because B can produce overlapping or differently paired readings. Asked requests and unread requests are separate request counts.

W reduces confident mistakes against F but still exceeds B's risk. At its calibrated gate, W holds more correct readings: clean t1 ungated correctness rises from F's 1,227 to W's 1,293, while correctly executed requests fall from 1,101 to 1,083. The poorer clean-t1 AUROC and remaining confident outline mistakes show that the calibrated confidence does not reliably separate every new correct reading from every wrong one. A threshold selected on calibration data is not a guarantee of safety on a particular form.

Full per-view and per-population outcomes, including asked/held/unread, risk/coverage, AUROC, exposure and seen/unseen-trigger splits, are in [quality-tables.md](evidence/modernbert-rare-heads/quality-tables.md) and [quality-metrics.csv](evidence/modernbert-rare-heads/quality-metrics.csv). The clean form and guard populations have zero exact training-request matches. Undo/redo counts have 13/28 matches; affected lowercase and its original-case control each 20/825; data-attested word names 15/374; short3 lowercase 4/134. These exposures are reported rather than treated as unseen data.

## Rare forms: gains and the remaining failure

The capability measure is ungated correct / all gold, including requests that would be held. Counts do not imply that all correct readings are executed.

| Clean form | W-s0 | F-s0 | B-s0 | Required |
|---|---:|---:|---:|---:|
| Outline question | 66/66 | 66/66 | 0/66 | 90% |
| Outline create | **24/80** | 15/80 | 3/80 | 90% |
| Outline set | 80/80 | 67/80 | 26/80 | 90% |
| Label removal | 78/78 | 78/78 | 78/78 | 90% |
| Description size | 60/64 | 15/64 | 3/64 | 80% |
| Bare move | 148/148 | 148/148 | 143/148 | 95% |
| Undo/redo count, frozen all-t1 population | 28/28 | 28/28 | 14/28 | 90% |

Weighting recovers rare values that F often omitted. For `st1-00009`, W reads the cyan outline in “add a purple square with a cyan outline”; F and B omit it. For `st1-00060`, W reads `size=small` in “move the little diamonds up”; F and B omit the size. Both W readings are correct but held. W executes only 26 of the 80 correctly read outline-set requests and eight of the 60 correctly read description-size requests.

Outline creation remains the decisive quality weakness: only eight correct executions and 18 wrong ones out of 80 requests, a 69.23% error share among its 26 executions. Those 18 are all of W's clean-t1 executed mistakes. The automatic first-cause analysis attributes all 18 to class values: 15 include wrong fill color and six wrong outline color; the key counts overlap and do not mean 21 requests. `st1-00169`, “add a black hexagon with a purple border”, executes black fill and black border. `st1-00294`, “add a blue diamond with a pink border”, executes pink fill and pink border. Even a recovered size can leave another error: `st1-00025` reads `tiny` correctly but adds the requested new teal color to the description of the existing target.

## Labels and lowercase names

Clean label setting is 105/105 ungated correct for W and F, versus 103/105 for B. Across evaluated views, W has zero gated empty-label outputs against nonempty-label gold and zero executions without raw arguments. Its ungated label-error reasons are 15 wrong values, 19 missing labels and six unwanted labels; none are executed. F has 16/21/4 and B 6/17/6 for those same reason categories. These broader errors remain reported despite the clean label-setting result.

| Population, ungated correct | W-s0 | F-s0 | B-s0 |
|---|---:|---:|---:|
| Affected names in other drawings, lowercase | 556/825 (67.39%) | 557/825 (67.52%) | 612/825 (74.18%) |
| Same affected requests, original case | 752/825 (91.15%) | 747/825 (90.55%) | 746/825 (90.42%) |
| Data-attested word names | 250/374 (66.84%) | 250/374 (66.84%) | 279/374 (74.60%) |
| Realistic short3 lowercase | 60/134 (44.78%) | 41/134 (30.60%) | 63/134 (47.01%) |

W retains F's weakness on other lowercase drawings and remains 6.79 points below B; data-attested names remain 7.75 points below B. Short3 lowercase improves substantially against F but remains 2.24 points below B, beyond the allowed two-point loss. For the affected requests in other drawings, W's original-to-lowercase gap is 23.76 points. The short3 population has no original-case twin, so no case-gap claim is made there.

At W's gate the three selected lowercase populations have zero executed mistakes, with only 102/825, 37/374 and 17/134 correct executions respectively. This does not imply zero mistakes in the full lowercase view: that view contains three executed extras outside the affected population. The root-cause examples still omit names: “arrow from idle to running” loses `from=idle`; “connect ingest parse clean and load one after the other” loses the named endpoints. These observations locate reading errors in token/name roles; they do not establish why training produced them.

## Root causes, verification and disposition

The automatic analysis reconciles requested wrongs, extras, held and unread requests to the scorer. It assigns the first explaining cause, separating data/label ambiguity, output limits, cuts, actions, values/roles, preprocessing and calibration. This taxonomy is diagnostic attribution, not an experiment isolating each cause. Full t1 has 62 ungated wrong requests and one extra: 61 class-value errors, one name error and one cut-related extra. At the gate, 18 wrongs remain and 314 correct readings are held. These full-view totals differ from the clean-population table above.

The root analysis ran with `oracle=none`: perfect-label round-trip failures were not measured in this analysis, except that unsupported layout keys can still be detected. Its `categories.labels=null` is unmeasured, not zero label errors. Zeros under data or output limitations therefore do not establish that those causes are absent. The earlier fit contradiction and separate perfect-label evidence remain relevant, but do not fill this diagnostic gap for every evaluation request.

The completed source/fixture checks and actual-fit/raw-inference verification above are reused, not rerun. The independent quality verifier completed both new artifact-only scripts with exit 0: 3,416 assertions, 22 independently recomputed paired comparisons, all 162 root-cause reconciliations and nine adversarial probes. Separately, scoring the saved records through the same scoring functions reproduced 8,055 records across ten views, 17 populations, 27 sidecars and 10,499 threshold decisions. That reproduction checks saved-record consistency; it is not fresh inference or an independently implemented scorer. The verifier's integrity result is PASS while the campaign result remains FAIL. The coordinator inspected the reports and their successful check fields.

Compact evidence is bound by [quality-evidence-manifest.json](evidence/modernbert-rare-heads/quality-evidence-manifest.json) and [quality-verification-manifest.json](evidence/modernbert-rare-heads/quality-verification-manifest.json). [quality-verification.json](evidence/modernbert-rare-heads/quality-verification.json) and [quality-records-verification.json](evidence/modernbert-rare-heads/quality-records-verification.json) preserve the independent results; [root-causes.md](evidence/modernbert-rare-heads/root-causes.md) and its machine-readable companion retain the automatic analysis.

R0 alone already prohibits confirmation. Only W-s0 used the three-trajectory budget; no C100-s1 evaluation, F-s1 or W-s1 follows, regardless of the improvements in outline setting and description size. There was no tuning, resampling, replacement seed, new inference after evaluation, or repeated root-cause run. The negative result does not distinguish inadequate rare-form exposure from other optimization limitations; exposure was unchanged and only one W/F seed pair was measured.

At 11:55:24 EET, the coordinator confirmed that the original task processes had ended, no task CPU/budget/trajectory lock was held, and the ledger contained only completed W-s0. All 15 candidate files, 58 frozen sources, the protocol and HEAD still matched. See [final-resources.json](evidence/modernbert-rare-heads/final-resources.json).

Prior R and F campaign failures remain stopped. Release/browser/Settings gates remain pending; no publication, deployment, commit or push was performed.
