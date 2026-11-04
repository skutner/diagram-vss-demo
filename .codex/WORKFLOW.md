# Document naming preference

Append `_codex` to the filename stem, immediately before the extension, only for plan and review files that are not committed to git (for example, `plan_codex.md` or `review_codex.md`). Do not duplicate the suffix when it is already present. Never add `_codex` (or `_claude`) to any file that will be committed to git, and never to code files (source, scripts, tests, configuration, fixtures); name those by the repository's or tool's conventions. This is a standing user preference across tasks and projects (refined 2026-10-09).

# Software engineering workflow

## Models and delegation

Preserve explicit user model and effort overrides. Use GPT-6.1 Sol and GPT-6.1 Terra for Codex agents. Use Terra Medium for focused exploration, assigned test execution and bounded worker tasks. Use Sol for implementation, planning, review, verification and escalations. Preserve each role's configured reasoning effort when changing models. For consequential cross-repository coordination or difficult diagnosis, use a GPT-6.1 Sol Medium/High lead or a Sol planning agent. Do not select Astra unless the user explicitly requests it. Max and Ultra are reserved for explicitly justified unusually demanding work.

Delegate independent exploration, bounded implementation and consequential review to the named subagents when it improves time to a verified result. This is an explicit standing request to use subagents for those cases. Do not create unnecessary agents for simple work. Parallelize independent read-heavy work; use one writer per source scope and respect the host's actual concurrency limit.

| Role | Default model and effort | Escalation |
| --- | --- | --- |
| repo-explorer, repo-explorer-medium | GPT-6.1 Terra Medium | repo-explorer-high: Sol High only for a justified escalation |
| code-implementer | GPT-6.1 Sol Medium | code-implementer-high: Sol High; critical-implementer: Sol High for credentials, concurrency, recovery or persistent failed approaches |
| worker | GPT-6.1 Terra Medium | Use code-implementer or code-implementer-high when the task needs deeper implementation work |
| test-runner, test-runner-medium | GPT-6.1 Terra Medium | test-runner-high: Sol High only for a justified escalation; source repairs go to an implementer |
| plan-architect, plan-reviewer, code-reviewer | GPT-6.1 Sol XHigh | Corresponding -xhigh roles use the same model and effort |
| implementation-verifier | GPT-6.1 Sol High | implementation-verifier-xhigh: GPT-6.1 Sol XHigh for unusually consequential security, concurrency, recovery or disputed evidence requiring escalation |

Use Medium effort by default for repository exploration, assigned test execution and failure interpretation, and routine implementation. Escalate those roles to High only when a Medium pass leaves a material issue unresolved or a concrete task-specific difficulty or risk justifies High from the outset. State the reason in the delegation prompt and handoff. Broad scope alone does not require High. The existing -medium aliases remain Medium profiles, not effort escalations.

Use named roles so their model and effort settings apply. For a different profile, use the appropriate named alias. Prefer a fresh focused context for a new work phase. In interfaces that make full-history forks inherit the parent model, use a fresh or bounded-history context for explicit model routing. Confirm actual settings when changing profiles; do not infer them from a label alone.

## Grounding and scope

Before editing, inspect the real entrypoint, current file, a neighboring or similar implementation, and the relevant test (or note that none exists). Prefer focused searches and official documentation for external APIs. Honor applicable repository instructions and preserve unrelated and concurrent changes. Resolve routine implementation choices autonomously. Existing user authorization persists; do not ask again for actions already authorized by the task.

Assess consequence rather than diff size. A clear bounded change following established patterns goes directly to implementation with a short intent/scope/check note when useful. Use plan-architect followed by independent plan-reviewer for material credential or permission boundaries, concurrency/recovery/resource ownership, consequential cross-repository contracts, irreversible migrations or unresolved material requirements. Reuse approved decisions and review only material design deltas.

## Review and verification

Use an independent code-reviewer for meaningful behavior changes, security, regressions, concurrency/recovery, test-harness pass/fail changes and required release candidates. Formatting, comments and similarly low-impact changes need appropriate author checks. The reviewer checks logic, contracts and coverage; test-runner executes assigned checks; implementation-verifier independently probes risky or explicitly required runtime claims. Do not duplicate broad reviews or repeat already-valid checks without a reason.

For bugs, reproduce failure at the baseline and success at the candidate where practical. Run relevant checks and inspect output. Skipped, cancelled, zero-test, blocked, stale or unrun checks do not count as passing. Never weaken assertions to get green. Follow canonical repository isolation, resource and live-target requirements. In Ploinky repositories, npm test is the E2E orchestrator; use only the authorized canonical runner and required exact-candidate isolation. Do not infer deployment or live/E2E authorization from a source change.

Identify the exact base and candidate in review/verification handoffs, including a dirty diff and included untracked files where relevant. Reuse evidence only when candidate, command, environment and assumptions still match. A changed candidate invalidates affected evidence. Source approval for a validation step and release readiness are separate: pending later-stage evidence stays pending without preventing the authorized check that produces it.

Use a compact handoff (normally 200–400 words plus evidence references): goal, ownership, exact candidate, relevant constraints, prior finding dispositions, checks and unresolved gates. This is a soft summary target; never truncate necessary evidence or source coverage. Only supported correctness, regression, security, data-loss, false-pass or materially unmet requirement findings block progress. Nits and speculative unrelated hardening do not.

## Evidence and continuity

Keep observed, inferred, implemented, reviewed, tested, reused and delegated evidence distinct. Cite commands and actual outcomes for verification claims. An agent's report is delegated evidence until personally checked. Report incomplete checks plainly, with the reason. Run validation proportionate to the change. Do not add tests or rerun completed checks merely to satisfy a hook; add regression coverage when it protects real behavior.

Completion hooks may flag explicit PASS claims contradicted by recorded results. Missing or unrecognized check evidence does not request another turn. Hooks do not establish semantic correctness, exact candidate identity, exhaustive tool coverage or a hard permission boundary. Shell/MCP edits and custom runners may require direct evidence outside the hook ledger. Do not treat absence of a hook warning as a pass. Before a context handoff or compaction, preserve objective, current candidate, ownership, open findings and remaining gates in the conversation or the established task checkpoint. Continue from that checkpoint without restarting completed work.
