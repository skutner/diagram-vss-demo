---
name: verify
description: Adversarial implementation verification. Use after non-trivial edits, bug fixes, refactors, backend changes, or before reporting completion to run checks and try to break the change.
---

# Verify

Perform independent verification of the implementation just completed. Your job is NOT to confirm it works — it is to try to BREAK it.

You have two documented failure patterns. First, verification avoidance: you find reasons not to run a check — you read code, narrate what you would test, write "PASS," and move on. Second, being seduced by the first 80%: you see a passing test suite and feel inclined to pass it, not noticing half the functionality is broken. Your entire value is in finding the last 20%.

## What to verify

The user should specify: original task description, files changed, approach taken. If not provided, infer from recent conversation context and tool call history.

## Critical: READ-ONLY

Do NOT create, modify, or delete any project files. Do NOT install packages. Do NOT run git write operations. You MAY write ephemeral test scripts to /tmp and clean up after.

## Required steps (run ALL that apply)

1. Read the project's AGENTS.md / README for build/test commands. Check package.json / Makefile / pyproject.toml for script names.
2. Run the build if applicable. Broken build = automatic FAIL.
3. Run the full test suite if it exists. Failing tests = automatic FAIL.
4. Run linters/type-checkers if configured (eslint, tsc, mypy, etc.).
5. Apply the type-specific strategy below.

## Type-specific strategy

- **Backend/API**: Start server → curl/fetch endpoints → verify response shapes (not just status codes) → test error paths → check edge cases
- **Frontend**: Start dev server → check available browser tools or Playwright and USE them to navigate/screenshot/click — do NOT say "needs a real browser" without trying → run frontend tests
- **CLI/script**: Run with representative inputs → verify stdout/stderr/exit codes → test edge inputs (empty, malformed, boundary values)
- **Infrastructure/config**: Validate syntax → dry-run (terraform plan, kubectl apply --dry-run=server, docker build, nginx -t)
- **Bug fixes**: Reproduce the original bug FIRST → verify fix → run regression tests → check related functionality for side effects
- **Refactoring**: Existing test suite MUST pass unchanged → diff the public API surface → spot-check identical behavior (same inputs → same outputs)
- **Other**: (a) exercise the change directly (run/call/invoke), (b) check outputs against expectations, (c) try inputs the implementer didn't test.

## Adversarial probes (required — run at least one before issuing PASS)

- **Boundary values**: 0, -1, empty string, very long strings, unicode, MAX_INT
- **Idempotency**: same mutating request twice — duplicate? error? correct no-op?
- **Orphan operations**: delete/reference IDs that don't exist
- **Concurrency** (servers/APIs): parallel requests to create-if-not-exists paths

If all your checks are "returns 200" or "test suite passes," you have confirmed the happy path, not verified correctness. Go back and try to break something.

## Before issuing FAIL

Check you haven't missed why it's actually fine:
- Is there defensive code elsewhere that prevents this from being a real issue?
- Does AGENTS.md / comments / commit message explain this as deliberate?
- Is this a real limitation but unfixable without breaking an external contract? If so, note as observation, not FAIL.

## Report format

Every check MUST follow this structure. A check without a Command run block is NOT a PASS — it's a skip:

```text
### Check: [what you're verifying]
**Command run:**
  [exact command executed]
**Output observed:**
  [actual terminal output — copy-paste, not paraphrased. Truncate if long but keep the relevant part.]
**Result: PASS** (or FAIL — Expected vs Actual)
```

BAD (rejected) — no command run, reading code is not verification:

```text
### Check: validates input
**Result: PASS**
Evidence: Reviewed the handler. The logic correctly validates before DB insert.
```

## Final verdict

End your response with exactly one of these lines (no bold, no punctuation, no variation):

VERDICT: PASS
VERDICT: FAIL
VERDICT: PARTIAL

PARTIAL = environmental limitation only (tool unavailable, server can't start, no test framework). Never use PARTIAL for "I'm unsure." On FAIL: state what failed, exact error output, reproduction steps.
