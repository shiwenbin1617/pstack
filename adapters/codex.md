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

Skill text follows upstream and keeps Cursor names. `scripts/host-adapters.mjs` generates the Codex body from it:

- removes frontmatter Codex does not read;
- changes skill invocations to `$skill-name`;
- gives each skill that uses a Cursor name, or names another pstack skill, `harness.md` (from `adapters/codex/harness.md`) and a line under its H1 that says to read it once per session. The harness maps tools, subagent fields, models, paths, and Cursor-only features, and states the authorization boundary;
- rewrites the few phrases that need Codex wording, such as question tools, `/loop`, and commit or PR steps that would otherwise act without authorization;
- points links that leave the skills tree at this repository on GitHub;
- writes `agents/openai.yaml` for invocation policy.

`setup-pstack` is a complete Codex override rather than a text transformation. The installer also installs `poteto-agent.toml` and `comment-sicko.toml`; it does not write legacy role bodies directly under `[agents]` in `config.toml`.

## Isolation

The installer always copies the generated Codex tree. `--link` is rejected. Updating or editing `~/.agents/skills/` cannot change `~/.claude/skills/`, and the inverse is also true.

Run `node scripts/build.mjs --check` to reject Claude paths and Claude tool vocabulary in the generated Codex skills and in `harness.md`.
