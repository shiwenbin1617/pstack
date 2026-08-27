---
name: setup-pstack
description: Configure which models pstack uses per role. Detects the model values this session actually accepts and writes a config file the other pstack skills read. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Write the pstack model config, a file that sets pstack's model per role. The active host adapter defines its exact path and model-discovery mechanism. Never guess a path or read another host's config. The other skills fall back to their inline defaults when a line is absent, so this is an override layer, not a requirement.

## The three tiers

The other pstack skills never name a model. They name a tier, and this config binds each tier to something real. Bind all three before anything else; every role default below is written in terms of them.

| Tier | What it is for |
|---|---|
| **fast code model** | mechanical, well-specified edits. Speed matters more than depth. |
| **precise-execution model** | a specified sequence of steps to follow to the letter. Strongest instruction-following. |
| **judgment model** | prose, design calls, adversarial review, anything where the intent is vague. |

Three tiers can bind to three models, or to the same model three times when that is all the user has. Same-model panels still fan out; they just trade family diversity for seed diversity, which is weaker. Say so rather than implying parity.

## Host differences

The Claude Code and Codex adapters each replace this skill with a complete host-native implementation. Use only the active adapter's accepted model values, config path, agent format, and always-loaded instruction file. Do not mirror role bodies into another config format. Panel lists still set fan-out width on both hosts.

## Steps

### 1. Detect available models

Enumerate the model values the active host actually accepts in this session, using the host adapter's discovery procedure. The runtime schema is the dependable source, not memory of what models exist. Never write a value you have not confirmed is accepted — a config pointing at a model the user cannot use breaks every delegation that reads it.

The alias `inherit-parent` is always valid. It means: omit `model` so the role runs on the parent chat model. That is how a user on a single-model plan, or on Codex, stays on their model everywhere.

If you cannot detect any values, ask the user which models they have access to rather than guessing.

### 2. Load current state

The default role-to-model mapping is the shape shown in step 5. If the config already exists, read it and treat its values as the current choices. Otherwise start from the defaults.

### 3. Map and confirm

Bind the three tiers first, then show every role with its current model, marking any value not in the detected set as needing a choice. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent`. Prefer your host's structured-question tool over free text.

For panel roles (how critics, arena runners, architect runners, interrogate reviewers) the value is a list and one subagent runs per entry, `inherit-parent` entries included, so the list length sets the fan-out. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every value written must be in the detected set; `inherit-parent` always passes. If a chosen value is not available, stop and ask again.

### 5. Write the config

Write the config with one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```markdown
# pstack model configuration

The three tiers. Every role below defaults to one of these.
fast code model: <model>
precise-execution model: <model>
judgment model: <model>

One line per role. Delete a line to fall back to the skill default.
`inherit-parent` as a value: the role runs on the parent chat model (spawn it without naming a model).
An `inherit-parent` entry in a panel list still counts toward that panel's fan-out.

feature, refactoring: <fast code>
bug-fix: <precise-execution>
perf-issue: <precise-execution>
hillclimb: <precise-execution>
judgment and prose: <judgment>
hardest tasks: <judgment>
how explorer: <fast code>
how explainer: <judgment>
how critics: <judgment>, <precise-execution>, <fast code>
why investigators: <fast code>
why synthesizer: <judgment>
reflect tooling: <precise-execution>
reflect judgment, divergent, synthesizer: <judgment>
arena runners: <judgment>, <precise-execution>, <fast code>
arena cross-judge pool: <judgment>, <precise-execution>, <fast code>
swarm workers: <fast code>
architect runners: <judgment>, <precise-execution>, <fast code>
interrogate reviewers: <judgment>, <precise-execution>, <fast code>
```

Write real, runtime-confirmed model values, not the `<placeholders>`.

### 6. Offer the always-loaded pointer

Neither host reads the config automatically. A one-line pointer in the always-loaded instructions file fixes that, but that file applies to every project and every session, so it is the user's call, not yours.

Ask before writing it. Name the exact always-loaded file from the active host adapter and the exact line it specifies.

```
When a pstack skill asks for a per-role model, read the pstack model config next to this file.
```

On yes, append it, checking first that it is not already there; a duplicated line is the common re-run bug. On no, say that the skills will use their tier defaults, which is a working setup and not a degraded one.

### 7. Confirm

Tell the user the config was written, where it lives, and that it applies to new sessions. Re-running this skill updates it. Confirm that no other host's config or agent definitions were changed.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill`. On no, move on without pushing.
