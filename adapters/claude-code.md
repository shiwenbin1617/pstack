# Claude Code adapter

Claude Code receives its own generated tree. It never reads or links to the installed Codex tree.

## Layout

| Capability | Claude Code location |
|---|---|
| Skills | `.claude/skills/` or `~/.claude/skills/` |
| Custom agents | `.claude/agents/*.md` or `~/.claude/agents/*.md` |
| Model preferences | `~/.claude/pstack-models.md` |
| Always-loaded pointer | `~/.claude/CLAUDE.md`, optional and approval-gated |

Invoke a skill with `/skill-name`. Claude Code keeps the source frontmatter, including `disable-model-invocation`, icon, and color. Most skills are manual-only, so a skill that runs another one reads its `SKILL.md` directly, as `harness.md` says.

## Build adaptation

Skill text follows upstream and keeps Cursor names. The build compiles a Claude-only tree:

- each skill that uses a Cursor name, or names another pstack skill, gets `harness.md` (from `adapters/claude-code/harness.md`) and a line under its H1 that says to read it once per session;
- links that leave the skills tree point at this repository on GitHub, and the link to upstream's `docs/harness/claude-code.md` points at the skill's `harness.md`;
- custom agents remain Claude Code Markdown agents, with `poteto-agent` finding `poteto-mode` under `.claude/skills/` or `~/.claude/skills/`;
- `setup-pstack` is a full override that uses the `Agent` tool model enum and writes only Claude Code configuration.

## Isolation

The installer always copies the generated Claude Code tree. `--link` is rejected. Updating or editing `~/.claude/skills/` cannot change `~/.agents/skills/`, and the inverse is also true.

Run `node scripts/build.mjs --check` to reject Codex paths and `$skill` invocations in the generated Claude Code skills and in `harness.md`.
