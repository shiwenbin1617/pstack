---
name: setup-pstack
description: Configure which Codex models pstack uses per role and at what reasoning budget. Use for $setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Set up pstack on Codex

Write `~/.codex/pstack-models.md`, the model configuration that sets pstack's model per role. pstack skills call it the `pstack-models.mdc` rule. They read it and fall back to their inline defaults when a line is absent. Codex custom agents are installed separately under `~/.codex/agents/` or `.codex/agents/`. Do not edit `[agents]` role declarations or another host's files.

## Steps

### 1. Detect available models

Inspect the active subagent tool schema for the model and reasoning-effort values Codex accepts. Do not infer availability from documentation or memory. Write a real model as `<model> <effort>` when the tool accepts an effort, otherwise as `<model>`. If the tool exposes no dependable set, use `inherit-parent`. The aliases `inherit-parent` and `auto` are always valid. Both mean the role runs on the session model, so the subagent call omits the model override.

### 2. Load current state

The default role-to-model mapping is the shape in step 5. If `~/.codex/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5 is from a retired role or an older pstack, such as `how critics` or `fast code model`. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Use Codex's structured-question tool when available, otherwise plain text. Offer these four options with these exact labels, and name the current budget when the file records one.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the defaults, and on a re-run keep any role you changed by model, list, or alias. The budget sets the effort of every real entry, panel entries included, to `max`, `xhigh`, `high`, or `medium`. If a model does not accept that effort, use its highest accepted effort at or below the target. `inherit-parent` and `auto` do not change.

**(c) Show the roles and confirm.** Show every role with its value, and list each line step 2 dropped. Ask only about values that cannot be preserved or inferred. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included. `arena cross-judge pool` is ordered by preference and Arena runs one judge from it. `swarm workers` is the default model for every worker.

### 4. Validate

Every configured model must be accepted by the active subagent tool. `inherit-parent` and `auto` always pass.

### 5. Write the file

Write the complete file atomically and idempotently. Default shape:

```
# pstack model configuration for Codex. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the session model. Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: inherit-parent
hardest tasks: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
why investigators: inherit-parent
why synthesizer: inherit-parent
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: inherit-parent
arena runners: inherit-parent, inherit-parent
arena cross-judge pool: inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent, inherit-parent
interrogate reviewers: inherit-parent, inherit-parent
```

### 6. Confirm

Do not add an `AGENTS.md` pointer. The Codex host adapter names this file directly. Report the path written. A new session is required only when custom agent TOML files changed, not when this Markdown file changed.

### 7. Offer verification skills (optional)

If the project has no way to drive the real app for proof (a `verify-*` skill or an existing harness), offer once to generate one with $create-verification-skill. If it has no formal verification skill, offer once to generate one with $create-formal-verification-skill. On yes, read that skill's `SKILL.md` next to this skill's folder and follow it. On no, move on.
