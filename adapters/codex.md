# Codex adapter

Codex receives a generated, host-native tree. It never reads or links to the installed Claude Code tree.

## Layout

| Capability | Codex location |
|---|---|
| Skills | `.agents/skills/` or `~/.agents/skills/` |
| Custom agents | `.codex/agents/*.toml` or `~/.codex/agents/*.toml` |
| Model preferences | `~/.codex/pstack-models.md` |
| Invocation policy | `<skill>/agents/openai.yaml` |
| Global instructions | `~/.codex/AGENTS.md`, not modified by the installer |

Invoke a skill with `$skill-name`. `poteto-mode` applies to the task for which it is invoked; Codex does not consume Claude Code's sticky-mode frontmatter.

## Build adaptation

`scripts/host-adapters.mjs` generates the Codex body from the common method:

- removes Claude-only frontmatter;
- changes skill invocations to `$skill-name`;
- maps read-only delegates to Codex agents with `sandbox_mode = "read-only"`;
- replaces Claude transcript, question, background, and long-running primitives;
- writes `agents/openai.yaml` for invocation policy;
- resolves the Codex model config at the explicit path `~/.codex/pstack-models.md`.

`setup-pstack` is a complete Codex override rather than a text transformation. The installer also installs `poteto-agent.toml` and `comment-sicko.toml`; it does not write legacy role bodies directly under `[agents]` in `config.toml`.

## Isolation

The installer always copies the generated Codex tree. `--link` is rejected. Updating or editing `~/.agents/skills/` cannot change `~/.claude/skills/`, and the inverse is also true.

Run `node scripts/build.mjs --check` to reject Claude paths, Claude tool vocabulary, and unsupported metadata in the generated Codex skills.
