# ModernBERT next: amendment to the giant-group wording

Date: 2026-11-08. This is a separate amendment to `reports/modernbert-next-plan-2026-11-08_codex.md`, SHA-256 `0ef29893509256a11f2859fb4b2fbfab45ca2ae448db26795315ceeab26c587b`. The original plan and its review record remain unchanged.

The owner requested: “fix the wording in a separate amendment, have the plan reviewer with astra max review it, then tell Claude to continue once approved, keeping all the original quality gates unchanged”. This amendment takes effect only after that independent review approves the exact document and the coordinator records its disposition in the implementation checkpoint. Its review record is `reports/modernbert-next-grouping-amendment-review-2026-11-08_codex.md`.

## The correction

Only the following sentence in Interfaces / contracts §4 (original plan line 177) is superseded:

> A giant group or insufficient support stops the campaign before training; do not split groups or add an undeclared data round.

Read that sentence as:

> Stop before training if keeping connected groups intact prevents any of the plan's required calibration reservations, train/calibration or calibration/deciding-evaluation separation, per-fold/source-family support, or minimum evaluation-population support checks from passing. A connected group's size by itself is a reported diagnostic, not an independent stop criterion. Missing or unavailable required evidence is not a pass. Do not split groups, change frozen per-arm memberships or normalization, discard required realistic training messages, relax support or quality thresholds, or add an undeclared data round to make a check pass.

All other provisions of the original plan continue to apply. Full canonical regression populations remain distinct from the clean deciding populations, with the original exposure flags and reporting rules; this amendment does not turn a train-overlapping regression population into an independent test.

## Why a separate amendment is needed

The architect's draft said to stop if the reservation was too small or a giant group prevented the stated conditions. While condensing that draft, the Codex coordinator wrote the unconditional sentence quoted above. That wording was included in the reviewed immutable plan. The implementation coordinator subsequently proceeded after finding `col-0007`, reasoning that the required independent populations still had sufficient support. That did not follow the literal reviewed sentence.

The discrepancy was documented and further training was held. This amendment corrects the coordinator's wording error explicitly; it does not claim that the prior B-s0 and R-s0 runs complied with the old wording or were retrospectively approved. Their original chronology, evidence and the hold remain in the checkpoint.

The correction is based on the purpose of intact grouping and the existing split/support requirements, not on a model-quality result. It introduces no group-size threshold, new data choice or changed model-success criterion.

## Evidence relevant to the correction

Task cache: `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08`.

Observed by read-only inspection of the saved audit and group assignments:

- `audit/audit.json`, `giant_groups.largest[0]`: `col-0007` contains 5,837 messages. Its members include training and historical evaluation sources, connected by complete short request spans and session/group relationships.
- `protocol-v2/groups.jsonl`: all 5,837 members retain that group key; none has `in_calibration=true` or `reserved_r2=true`.
- Joining the actual B/R/S `cut_train.jsonl` message IDs to these group assignments gives zero intersections between each arm's training groups and the reserved calibration groups.
- The saved audit records 939 calibration groups with requested actions, fold counts 198/177/206/182/176, and the required source families. It records 1,354 requested actions in 1,285 `t1_clean` groups. The largest calibration group has 16 messages and the largest `t1_clean` group has four. These are evidence values, not replacement thresholds.
- The implementation checkpoint records the independent split review, exclusions of overlapping calibration/clean-evaluation groups, and the other support checks. Those recorded reviews are reused evidence, not a new full implementation verification by this amendment.

| Frozen input | SHA-256 |
|---|---|
| `audit/audit.json` | `f8b6640fef703c08bffbda141faf10652d3b3d5eb681a0ba6173d58ddafb7521` |
| `protocol-v2/protocol.json` | `3999991890f1a92b811fbe0cde86ccdf35ca38e71606b45d0ec14ea5dc872e78` |
| `protocol-v2/groups.jsonl` | `a407e2327be5f2cb007d2f3ecec2c168bb2b133fd27904571e54d7ae22e49724` |
| `frozen-lists/decision-rules-addendum.json` | `304a1be5fb5a27f944ce588a24e16e39676b497a860f4fd3a153b955dcdc1b19` |
| `views/manifest.json` | `df4abeeeec0e1948e3b8220d6c670d259cebe938e4765921d0f161ff0506cf5a` |

The implementation coordinator must verify the retained source/data identities and the complete required separation/support evidence before lifting the grouping hold. This table and its subset of counts do not independently certify every support or leakage check. If a required check fails, is unavailable, or no longer applies to the candidate, the original stop rule still applies; do not change populations to obtain a pass.

## Original quality gates remain unchanged

This amendment does not change acceptance criteria 1–31, Guard G, confidence fitting or the OOF cost-10 threshold rule, score definitions, full-gold denominators, paired resampling, confidence-interval conditions, support minima, source families, per-form bars, label-safety bars, seeds, model recipe, artifact identities, browser/resource gates, review requirements, publication scope or the five-run cap. The diagnostic-only word-name stratum stays diagnostic-only. The original tool-defect/recovery rules also remain unchanged.

In particular:

- B-s0 still needs C15. R-s0 still needs **every** C16 condition and its root-cause report before S-s0 can start.
- A numerical or otherwise measured C16 miss stops the campaign even if this amendment is approved. The amendment cannot convert that miss into a pass or authorize S anyway.
- S-s0 still needs every applicable S gate before R-s1/S-s1 confirmation. Confirmation and publication retain all original gates.
- No extra run, new seed, revised threshold, changed scoring mode, new population, group split, data round, reweighting or post-result rescue is authorized.
- The existing C16 cost-mode choice and decision-rules addendum are not revised here. Their pre-result provenance and any separate review obligations must remain accurately recorded; this amendment is not approval of an unrelated protocol change.

## Disposition after approval

Once the independent Astra Max plan reviewer approves this exact amendment, and the existing separation/support evidence is verified as applicable, the coordinator may clear **only the procedural hold caused by the unconditional giant-group sentence**. The owner's current instruction authorizes that disposition and continuation within the existing implementation scope; no additional blanket confirmation is required.

Preserve completed B/R runs and their numerical evidence; they continue to count as two of the five allowed training runs. There is no reason to repeat them solely because this sentence was corrected. Preserve all superseded and failed evidence, the original plan/review hashes, frozen protocol/views/addendum and the recorded deviation. Record the amendment path/hash, independent review path/hash, effective time, checks reused or newly performed, and the next eligible step in the checkpoint. Do not rewrite old manifests or claim that this amendment predates the runs.

If R evaluation is still running, finish it and its root causes, then apply unchanged C16. If it already has a verdict, inspect that verdict before choosing the next step. Continue to S only if all required gates pass; otherwise stop and report the miss. Any unrelated unresolved blocker or existing owner stop remains effective. This amendment grants no publication, permission-setting change, download or unrelated-work authorization.
