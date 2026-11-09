# Review: ModernBERT grouping amendment

Date: 2026-11-08. Independent plan review requested with Astra Max. Launch used explicit `model=gpt-6-astra`, `reasoning_effort=max`, a fresh context, and the repository's plan-reviewer contract. Independent effective-model introspection was unavailable.

## Verdict

**APPROVE — scoped delta review.** Reviewed amendment: `reports/modernbert-next-grouping-amendment-2026-11-08_codex.md`, SHA-256:

```text
ff9a2eabf63e108dec65c0adc8e3499045568d203edbe6eb24a249eb1abd778b
```

The reviewer concluded:

> The amendment restores a conditional grouping stop without weakening support, separation, quality, seed, recovery or publication requirements. It records the earlier deviation honestly and permits continuation only after applicable evidence is checked. No amendment changes are required. This is design approval, not a C16 verdict or runtime signoff.

## Requirement coverage

| Owner requirement | Coverage | Status |
|---|---|---|
| Separate wording amendment | Only the original plan's §4 sentence is superseded; original files/hashes retained | Covered |
| Astra Max plan reviewer | Separate explicitly configured reviewer following the role contract | Covered at configured level |
| Continue once approved | Applicability checks, recorded disposition and current R verdict govern advancement | Covered |
| Original quality gates unchanged | Criteria 1–31, all quality/support rules and five-run cap explicitly retained | Covered |

## Findings (confidence ≥ 80)

None. No revision was required.

## Citation audit

The reviewer checked all material cited evidence paths and the protocol audit/clean membership: **13 supporting files**. The original plan and original review hashes matched; all five frozen-input hashes in the amendment matched. Unaffected source-review evidence was reused.

Read-only JSON aggregation independently confirmed:

- `col-0007`: 5,837 members, none in calibration or reserved r2.
- B/R/S actual cut-row joins: no unknown IDs and no training/calibration group intersections.
- Calibration: 939 request-bearing groups; fold counts 198/177/206/182/176; largest group 16.
- `t1_clean`: 1,354 requests in 1,285 groups; largest group four; no calibration-group intersections.

The saved audit contains the required source families, and frozen view support records retain the original minima. These are observed artifact checks, not a new full implementation or leakage verification. The checkpoint records the prior implementation reviews, deviation, hold and two used runs.

## Acceptance-criteria audit

| Requirement | Observable evidence | Review assessment |
|---|---|---|
| Applicable grouping/support evidence before lifting hold | Hashes, memberships and existing review records | Missing, stale or failing evidence blocks |
| No waiver of C16 | Current R verdict and root causes | Any measured miss still stops; no S on a miss |
| Preserve chronology/run budget | Checkpoint and immutable artifacts | B/R remain two of five; no repeat solely for wording |
| Preserve later gates | Original C17–31 and publication/stop rules | All retained; pending evidence remains pending |

## Decisions for the user

None. The current user request authorizes this reviewed correction and conditional continuation. It does not authorize publication or waive an experimental failure.

## Risks / open questions

None newly introduced. Before lifting the procedural grouping hold, the implementation coordinator must verify complete evidence applicability and inspect the current R verdict. Approval of the amendment alone does not establish either.

## Not assessed

The reviewer ran no tests, inference, training, GPU work, downloads, browser actions, file writes or Git mutations. It inspected files and performed read-only hashing/JSON aggregation. HEAD was `0ab687cc142e884ed16332925c6d7cd558e1b8fb`; the implementation dirty tree was not re-reviewed. Earlier implementation-review results remain delegated evidence. The original architect wording was checked against the supplied account and checkpoint, not reconstructed from its original session.
