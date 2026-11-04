---
name: deep-codebase-analysis
description: High-confidence codebase exploration for architecture, request flow, dependency tracing, and read-only analysis. Use when the user wants a thorough explanation, trace, audit, or map of existing code.
when_to_use: Trigger for prompts about how something works, where a behavior comes from, what handles a path, request or data flow, architecture, edge cases, or broad codebase review before implementation.
allowed-tools: Read Grep Glob Bash Agent
---

# Deep Codebase Analysis

Use this skill to increase analysis depth before proposing edits or conclusions.

## Default posture

- Stay read-only unless the user explicitly asks for implementation.
- Prefer gathering evidence over drafting fixes.
- Distinguish facts from interpretation.

## Minimum investigation bar

Before answering a non-trivial codebase question, inspect all that apply:

1. The real entrypoint or initiating surface.
2. At least one direct caller or callee.
3. At least one neighboring file in the same area.
4. The most relevant test, fixture, or note that none exists.
5. One similar implementation elsewhere in the repo if the question is about patterns or conventions.

If the prompt is broad, first build a quick map of the subsystem boundaries, then go deeper on the highest-signal files.

## Delegation

If the scope is large or would pollute the main context, dispatch the `repo-explorer` subagent and ask it to be **very thorough**. Make it inspect multiple locations, naming conventions, related files, and tests.

Use the `code-reviewer` subagent when the user wants a review of changes or risks.

Use the `implementation-verifier` subagent when a claim needs runtime validation.

## Output contract

Structure the answer as:

- **Observed**: direct facts from files, diffs, or command output.
- **Inferred**: conclusions that follow from those facts. Label them as inference.
- **Unknown / not yet verified**: gaps, ambiguities, and what was not checked.
- **Next checks**: the most useful follow-up reads, repro steps, or verification commands.

## Review-specific rules

If the user asks for a review:

- Start with findings, ordered by severity.
- Focus on correctness, behavioral regressions, security, edge cases, and missing tests.
- Do not pad with style commentary unless it materially affects behavior.
- Cite the exact file path and the specific evidence you inspected.

## Anti-patterns

Do not:

- claim a subsystem was reviewed thoroughly after reading one file
- infer behavior without naming the code path that supports it
- suggest fixes before understanding the current design
- present guesses as observations
