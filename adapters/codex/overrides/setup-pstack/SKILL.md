---
name: setup-pstack
description: Configure optional per-role model preferences for pstack on Codex. Use for $setup-pstack or requests to change pstack model routing.
---

# Set up pstack on Codex

Write the optional Codex pstack model configuration at `~/.codex/pstack-models.md`. Skills that support model routing read this exact path. Codex custom agents are installed separately under `~/.codex/agents/` or `.codex/agents/`; do not edit `[agents]` role declarations or another host's files.

## Configure

1. Inspect the active subagent tool schema for model values Codex accepts. Do not infer availability from documentation or memory. If the tool does not expose a dependable set, use `inherit-parent`.
2. Read the existing file when present. Treat it as the current state.
3. Ask the user only about values that cannot be preserved or inferred. Use Codex's structured-question tool when available.
4. Write the complete file atomically and idempotently. Every configured model must be accepted by the active subagent tool; `inherit-parent` means omit the model override.

Use this shape:

```markdown
# pstack model configuration for Codex

fast code model: <model-or-inherit-parent>
precise-execution model: <model-or-inherit-parent>
judgment model: <model-or-inherit-parent>

how explorer: <model-or-inherit-parent>
how explainer: <model-or-inherit-parent>
how critics: <comma-separated-models>
why investigators: <model-or-inherit-parent>
why synthesizer: <model-or-inherit-parent>
reflect tooling: <model-or-inherit-parent>
reflect judgment, divergent, synthesizer: <model-or-inherit-parent>
arena runners: <comma-separated-models>
arena cross-judge pool: <comma-separated-models>
swarm workers: <model-or-inherit-parent>
architect runners: <comma-separated-models>
interrogate reviewers: <comma-separated-models>
```

Do not add an `AGENTS.md` pointer. Codex pstack skills name this file directly. Report the path written and note that a new session is required only when custom agent TOML files changed, not when this Markdown file changed.
