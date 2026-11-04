# Portable Codex setup

This repository carries the portable parts of the owner's local Codex setup.
Start with the repository's `AGENTS.md`, then read `.codex/WORKFLOW.md`.
Research rules and the coordinator-only commit policy in `AGENTS.md` still apply.

## Included files

| Path | Purpose |
| --- | --- |
| `.codex/config.toml` | Local-client model, reasoning effort, service tier and subagent defaults. |
| `.codex/agents/*.toml` | Named Sol/Terra roles, with their instructions and model/effort choices. Alias references resolve from the repository root. |
| `.codex/WORKFLOW.md` | Portable engineering workflow and document naming preference. |
| `.agents/skills/deep-codebase-analysis/` | Read-only codebase investigation guidance. |
| `.agents/skills/verify/` | Adversarial verification guidance. |
| `.agents/skills/playwright/` | Browser automation guidance and CLI wrapper, with its license and notice. |

The profile filenames follow their agent names. They have no personal filename suffix.
Read-only roles retain their instructions; custom agent files do not establish a
separate permission boundary from the parent session.

Personal authentication, sessions, memories, project trust records, local paths,
notification scripts, hooks, MCP credentials and plugin caches are not included.
The local migration skill is for migrating other clients into Codex, so it is not
part of this project's workflow. Platform-bundled skills and connected apps must
be supplied by the destination environment rather than copied from local caches.

## Local Codex, including a CLI on your own VM

Clone the repository, authenticate Codex on that machine, and trust the project
through the client's supported trust flow. Start Codex in this repository.
Project configuration and agent definitions are discovered there; no copy into
the machine's global Codex directory is necessary.

The exported defaults are Sol High for the main agent and Terra Medium for
unqualified subagents. Named roles specify their own model and effort. Confirm
the selected model and registered agents in the destination client. Available
models, account access and managed requirements still constrain the setup.

For Playwright, install Node.js/npm so `npx` is available. The wrapper uses
`@playwright/cli`; installing its package and browsers requires the appropriate
network access or an existing cache. Resolve the wrapper from this checkout:

```bash
DIAGRAM_REPO_ROOT="$(git rev-parse --show-toplevel)"
"$DIAGRAM_REPO_ROOT/.agents/skills/playwright/scripts/playwright_cli.sh" --help
```

## Hosted Codex Cloud

Repository skills are available in Cloud tasks. Personal local skills do not
automatically sync. Custom agent TOML files and their model/effort routing are
documented for local Codex clients; their enforcement in hosted Cloud has not
been established for this setup. File presence alone does not prove activation.
The `AGENTS.md` workflow remains useful even when named local profiles are unavailable.

To prepare a cloud environment:

1. Open **Settings > Codex Cloud > Environments > Create environment** on the web
   or desktop app, or choose **Work in > Cloud > Create environment**.
2. Select `skutner/diagram-vss-demo`. Use a revision containing this setup.
3. Ask Codex to read `AGENTS.md` and `.codex/WORKFLOW.md`, inspect the repository,
   and prepare the dependencies needed for the intended task. Node.js/npm and
   Python are used by this project; training requires additional dependencies.
   Do not start training or download additional models just to activate this setup.
4. Ask it to discover `.agents/skills/` and report the subagent tools, named
   profiles, models and reasoning settings actually available. Treat any local
   setting it cannot confirm as unverified, rather than silently claiming parity.
5. Supply required service access through Cloud environment variables, network
   secrets or Personal vault. Configure allowed destinations separately.
6. Review setup checks, save and publish the environment, then verify the setup
   again in a new task. Existing tasks retain their own saved state.

Browser automation requires a runtime that supports it; vendoring the Playwright
skill does not make unsupported hosted browser capabilities available.

Suggested environment-setup request:

> Prepare this repository for coding tasks. Read AGENTS.md and
> .codex/WORKFLOW.md, discover .agents/skills, and install only dependencies
> needed for the task. Preserve the research rules and coordinator-only commits.
> Report which named agents and model/effort settings are actually registered;
> distinguish unavailable or unverified local settings. Do not train models or
> publish application changes as part of setup.

## Verification scope

Validate TOML syntax, agent names/model settings, alias targets and skill support
files when changing this setup. Reader changes require the regression command
and evidence specified in `AGENTS.md`. A configuration-only change does not
establish Cloud execution or model-selection behavior.

Official documentation: [configuration](https://learn.chatgpt.com/docs/config-file/config-basic),
[subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), and
[Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments).
