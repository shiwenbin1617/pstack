# Claude Code adapter

Claude Code receives its own generated tree. It never reads or links to the installed Codex tree.

## Layout

| Capability | Claude Code location |
|---|---|
| Skills | `.claude/skills/` or `~/.claude/skills/` |
| Custom agents | `.claude/agents/*.md` or `~/.claude/agents/*.md` |
| Model preferences | `~/.claude/pstack-models.md` |
| Always-loaded pointer | `~/.claude/CLAUDE.md`, optional and approval-gated |

Invoke a skill with `/skill-name`. Claude Code keeps the existing `disable-model-invocation`, mode, reminder, icon, and color frontmatter where the source defines them. `/poteto-mode` remains a sticky Claude Code mode.

## Build adaptation

The common method is compiled into a Claude-only tree:

- Codex transcript and skill paths are removed;
- Codex `$skill` examples are excluded;
- custom agents remain Claude Code Markdown agents;
- `setup-pstack` uses the `Agent` tool model enum and writes only Claude Code configuration.

## Isolation

The installer always copies the generated Claude Code tree. `--link` is rejected. Updating or editing `~/.claude/skills/` cannot change `~/.agents/skills/`, and the inverse is also true.

Run `node scripts/build.mjs --check` to reject Codex paths and `$skill` invocations in the generated Claude Code skills.
