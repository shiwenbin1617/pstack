# pstack in Codex

pstack skills use Cursor names. In Codex, read this file once per session, then map each Cursor name in a skill with the tables below. The skills folder is the folder that holds this skill's folder, `~/.agents/skills/` or `.agents/skills/`. Every pstack skill sits next to it as `<skills folder>/<name>/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

## Authorization

A skill step never grants authorization. Commits, pushes, branches, PR changes, messages, deployments, external writes, and destructive operations follow the user's existing authorization and the host's approval rules. Prepare the reviewable local result first, then ask for what is missing. Preserve other people's edits.

## Tools

| Cursor | Codex |
| --- | --- |
| `Task` | Codex subagent tools. |
| `AskQuestion` | Codex's structured-question tool when available, otherwise plain text. |
| Open a todolist | The plan tool when the session offers it. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name`, `$name`, or "the **name** skill") | Read `<skills folder>/<name>/SKILL.md` and follow it. When you tell the user to type it, write `$<name>`. |
| `Grep`, `Glob` | `rg` in the shell. |

## Subagent fields

| Cursor | Codex |
| --- | --- |
| `subagent_type: generalPurpose` | The default subagent. |
| `poteto-agent`, `comment-sicko` | The custom agents of those names in `~/.codex/agents/` or `.codex/agents/`. Give `poteto-agent` the absolute path of `poteto-mode/SKILL.md` in its brief. |
| `readonly: true` | A custom agent with `sandbox_mode = "read-only"` when one exists. Otherwise the brief says "do not edit files", and you check `git status` afterward. |
| `readonly: false` | The default subagent. |
| `environment: "cloud"` | A cloud session only when Codex explicitly exposes one. Otherwise a local subagent in its own git worktree under `.codex/worktrees/`. Name the branch or commit it checks out. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Tell the worker to check out `<b>` first. |
| `run_in_background: true` | Run the subagents concurrently and wait for their results. |
| `resume` | Spawn a new agent and paste the earlier result into its brief. |
| `file_attachments` | List the paths in the brief. |

## Models

| Cursor | Codex |
| --- | --- |
| A `claude-*`, `grok-*`, `gpt-*`, or other slug | Use the role line from the model file below. With no line, omit the model override so the agent runs on the session model, and say so. |
| `auto` or `inherit-parent` | Omit the model override. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.codex/pstack-models.md`. Read it before the first spawn that names a role line. |
| A role value `<model> <effort>` | That model with that reasoning effort, when the subagent tool accepts them. |

## Paths

| Cursor | Codex |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.agents/skills/`, `~/.agents/skills/` |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | The skills folder. pstack is installed as plain skills, not a plugin. |
| `.cursor/worktrees/` | `.codex/worktrees/` |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`. Codex never reads `.mdc` files. The model rule is the exception. See Models. |
| A link to `docs/guide/`, `README.md`, or another pstack file outside the skills | That file is not installed. Use the GitHub link only when the user needs it. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | Run `node <skills folder>/recall/scripts/find-transcripts.mjs --host codex --workspace <path>`. It lists this workspace's sessions under `~/.codex/sessions/`, newest first, matched by their `cwd` metadata. Read only this workspace's transcripts. |
| `/loop` or a terminal wake chain | Codex's available recurring-monitoring or wait mechanism. |

## Cursor-only features

Codex has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in Codex: <step>. <reason>.`, then go on to the next step. Do not stop or retry. When a later step needs what the skipped step made, leave a placeholder and name it in the line.

| Cursor | Codex |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | See `environment: "cloud"`. Skip a step that needs the cloud agent itself. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`, within the authorization above. |
