---
name: setup-pstack
description: Configure which Claude Code models pstack uses per role and at what reasoning budget. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Set up pstack on Claude Code

Write `~/.claude/pstack-models.md`, the model configuration that sets pstack's model per role. pstack skills call it the `pstack-models.mdc` rule. They read it and fall back to their inline defaults when a line is absent.

## Steps

### 1. Detect available models

The detected models are the `model` values that the `Agent` tool schema lists, each with an effort from its `effort` values. Write a real model as `<model> <effort>`, such as `opus xhigh`. The effort is the last token. Never write a model the schema does not list. The aliases `inherit-parent` and `auto` are always valid. Both mean the role runs on the session model, so the `Agent` call omits `model`.

### 2. Load current state

The default role-to-model mapping is the shape in step 5. If `~/.claude/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5 is from a retired role or an older pstack, such as `how critics` or `fast code model`. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Use `AskUserQuestion`, or plain text when it is unavailable. Offer these four options with these exact labels, and name the current budget when the file records one. With no file, say that `large` matches the defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the defaults, and on a re-run keep any role you changed by model, list, or alias. `unlimited`, `large`, `medium`, and `small` set the effort of every real entry, panel entries included, to `max`, `xhigh`, `high`, or `medium`, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. If a model does not accept that effort, use its highest listed effort at or below the target. `inherit-parent` and `auto` do not change.

**(c) Show the roles and confirm.** Show every role with its value, and list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto`. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries values in list order, so order it by preference. An `inherit-parent` or `auto` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real model and effort written must be in the `Agent` schema. `inherit-parent` and `auto` always pass. If a chosen value is not available, stop and ask again.

### 5. Write the file

Write `~/.claude/pstack-models.md` with no frontmatter: the comment lines, a `# budget` line with the chosen label and its target effort, and one line per role. Overwrite the whole file so re-runs stay idempotent. Default shape:

```
# pstack model configuration for Claude Code. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the session model (omit Agent `model`). Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: sonnet xhigh
bug-fix: sonnet xhigh
perf-issue: sonnet xhigh
hillclimb: sonnet xhigh
judgment and prose: opus xhigh
hardest tasks: opus xhigh
how explorer: sonnet xhigh
how explainer: opus xhigh
why investigators: sonnet xhigh
why synthesizer: opus xhigh
reflect tooling: sonnet xhigh
reflect judgment, divergent, synthesizer: opus xhigh
arena runners: opus xhigh, sonnet xhigh
arena cross-judge pool: opus xhigh, sonnet xhigh
swarm workers: sonnet xhigh
architect runners: opus xhigh, sonnet xhigh
interrogate reviewers: opus xhigh, sonnet xhigh
```

### 6. Confirm

Offer to append this exact line to `~/.claude/CLAUDE.md`, after checking it is not already present:

```text
When a pstack skill asks for a per-role model, read ~/.claude/pstack-models.md.
```

That file affects every project, so write the pointer only after explicit approval. Report the path written and note that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, read the `create-verification-skill` skill's `SKILL.md` next to this skill's folder and follow it. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, read the `create-formal-verification-skill` skill's `SKILL.md` next to this skill's folder and follow it. On no, move on without pushing.
