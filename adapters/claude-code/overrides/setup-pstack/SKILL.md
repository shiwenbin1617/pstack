---
name: setup-pstack
description: Configure which Claude Code models pstack uses per role. Use for /setup-pstack or requests to change pstack model routing.
---

# Set up pstack on Claude Code

Write the optional model configuration at `~/.claude/pstack-models.md`. Other pstack skills use it as an override and keep their inline tier defaults when a role is absent.

## Configure

1. Read the `Agent` tool's current `model` enum. It is the source of truth for accepted values. Never guess a model slug.
2. Read the existing configuration when present and preserve valid choices.
3. Bind the fast-code, precise-execution, and judgment tiers first. Then bind role and panel entries. A panel contains one model per seat. `inherit-parent` means omit the model argument.
4. Use the host's structured-question tool for choices the user must make.
5. Overwrite the complete file idempotently after validating every value against the current enum.

Use this shape:

```markdown
# pstack model configuration for Claude Code

fast code model: <model>
precise-execution model: <model>
judgment model: <model>

how explorer: <model>
how explainer: <model>
how critics: <comma-separated-models>
why investigators: <model>
why synthesizer: <model>
reflect tooling: <model>
reflect judgment, divergent, synthesizer: <model>
arena runners: <comma-separated-models>
arena cross-judge pool: <comma-separated-models>
swarm workers: <model>
architect runners: <comma-separated-models>
interrogate reviewers: <comma-separated-models>
```

Offer to append this exact line to `~/.claude/CLAUDE.md`, after checking it is not already present:

```text
When a pstack skill asks for a per-role model, read ~/.claude/pstack-models.md.
```

That file affects every project, so write the pointer only after explicit approval. Report the configuration path and note that it applies to new sessions.

