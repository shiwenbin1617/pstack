<div align="center">

# pstack

**Senior engineering habits, installed into your AI coding agent**

A set of Markdown rules that make an agent understand the problem before it writes, and produce runtime evidence after. Not "done!" with nothing behind it.

[![npm](https://img.shields.io/npm/v/@shiwenbin1617/pstack?color=cb3837&logo=npm)](https://www.npmjs.com/package/@shiwenbin1617/pstack)
[![license](https://img.shields.io/npm/l/@shiwenbin1617/pstack?color=blue)](./LICENSE)
[![node](https://img.shields.io/node/v/@shiwenbin1617/pstack)](https://nodejs.org)

[Install](#install) · [Use it](#use-it) · [How it works](#how-it-works) · [Skills](#skills) · [FAQ](#faq)

Works with **Claude Code** and **Codex** · 44 skills · 23 playbooks · 21 engineering principles

[中文](./README.md) · English

```bash
npx @shiwenbin1617/pstack add
```

</div>

---

## Why pstack

The default failure mode of AI-written code is that it looks reasonable, does not run, or runs but nobody checked.

| What you get | What it does |
|---|---|
| **Understand before you touch** | `/how` and `/why` fan out parallel subagents across the subsystem and its design history. You do not move on until you can state the full call path |
| **Interfaces before implementation** | `/architect` fixes types, signatures, and module boundaries before any code crosses a function boundary. Skipping it requires a written reason and cannot hide inside the implementation |
| **Adversarial across models** | `/arena` runs N designs in parallel and grafts the best parts together. `/interrogate` sends different models at your diff in turn |
| **Evidence, not assertion** | The prove-it-works principle. Green CI is not evidence. An agent saying it passed is not evidence. Only a result observed on the real surface by someone who did not write the code counts |
| **23 playbooks** | Bug fixes, features, refactors, performance, shipping, and long unattended runs each have fixed steps, exit conditions, and acceptance criteria |
| **21 engineering principles** | From "pick the core data structure first" to "migrate the callers, then delete the old API". Skills cite them where they apply |
| **No AI smell** | `/no-comments` strips narrating comments. `/unslop` removes AI tells. `/technical-writing` handles PRs and commit messages |
| **One install, two hosts** | One body of methodology generates two native trees. Claude Code and Codex keep separate files, agents, and config |

The goal is not more output. It is less output where every line holds up.

---

## Requirements

- Node.js >= 18
- Claude Code or Codex. Install whichever you use. If both are present, pstack detects them.
- Bun is optional. Only the full PR watcher in `babysit` and the ledger CLI in `orchestrate` need it. The helpers never install dependencies behind your back.

---

## Install

```bash
npx @shiwenbin1617/pstack add
```

Pick your skills interactively. Arrow keys move, `space` toggles, `a` selects all, `enter` confirms. Ten core entry points come preselected, and their runtime dependencies get pulled in for you.

To type less, install it globally. The command is then `pstack`.

```bash
npm i -g @shiwenbin1617/pstack
```

> The unscoped `pstack` on npm is an unrelated package from 2015. It is not this project.

### Other ways to install

```bash
pstack add --core            # core entry points plus their dependencies
pstack add --all             # all 44
pstack add how why           # named skills only
```

### Managing what you installed

```bash
pstack list                  # what is installed, and where
pstack find review           # search the catalog
pstack update                # reinstall what you already have
pstack remove                # interactive uninstall
pstack doctor                # installation status for both hosts
```

Any of these also works as `npx @shiwenbin1617/pstack <command>` without a global install.

### Where files land

Each host always gets **independent copies**. Claude Code and Codex use different invocation syntax, frontmatter, agent formats, and config paths. Editing an installed file on one side never touches the other.

```
~/.agents/skills/how/          Codex skill, invoked as $how
~/.codex/agents/*.toml         Codex custom agents
~/.claude/skills/how/          Claude Code skill, invoked as /how
~/.claude/agents/*.md          Claude Code custom agents
```

| Flag | Effect |
|---|---|
| `--host claude` / `codex` / `both` | Target one agent. Defaults to whichever hosts are detected on this machine |
| `--scope user` / `project` | Install into `~/`, or into this repo at `./.claude/` and `./.agents/`. Defaults to user |
| `--copy` | Ask for independent copies explicitly. Currently the default and the only mode |
| `--dry-run` | Print what would happen. Write nothing |
| `-y` / `--yes` | Skip the confirmation |

### Giving it to your team

One line is all a colleague needs.

```bash
npx @shiwenbin1617/pstack add --core
```

To pin a version or serve from an internal mirror, publish this repo to a private registry and run `npx <your-package> add`. There is no Claude Code plugin entry point, because plugin loading would bypass the host adapter. Both hosts install their own artifacts through the CLI and nothing else.

---

## Use it

### 1. Bind your model tiers

This step is optional, but run it once.

```text
# Claude Code
/setup-pstack

# Codex
$setup-pstack
```

It reads the models your session can actually reach and binds three tiers.

| Tier | Where it goes |
|---|---|
| Fast code model | Mechanical changes with a clear spec |
| Precise-execution model | Work that must follow steps to the letter |
| Judgment model | Copy, design calls, adversarial review |

Skill text only ever says "use your judgment model". This file decides who that is. Claude Code writes `~/.claude/pstack-models.md` and Codex writes `~/.codex/pstack-models.md`. Neither reads the other. Skip the step and every skill falls back to its own inline tier defaults.

### 2. One entry point covers most days

```text
# Claude Code
/poteto-mode There is a strange bug in this PR. Reproduce it, fix it, then verify.

# Codex
$poteto-mode Add CSV and JSON export to the settings page, with runtime evidence.
```

### 3. It routes itself

It reads your request, matches a playbook, copies that playbook's steps verbatim into a todo list, and calls the other skills step by step.

On Claude Code, `/poteto-mode` keeps its native sticky mode. Codex has no such mode and pstack does not fake one. Invoke `$poteto-mode` for each new task there, and use the goal, wait, or recurring-monitoring features of your Codex session for long runs.

### 4. Call a skill by name when you want one

```
/how How do we cancel a run? Is there an N+1 query when cancelling in bulk?
/why Why was this retry written as exponential backoff with jitter?
/interrogate Review this PR.
```

On Codex, replace `/` with `$`, as in `$poteto-mode`.

---

## How it works

### The five-stage loop

```
  1 Understand     2 Design        3 Build         4 Verify        5 Deliver
  ────────────    ────────────    ────────────    ────────────    ────────────
  /how            /architect      write code      /interrogate    /unslop
  /why            /arena          /tdd            verification    /technical-writing
  /recall         /blast-radius   /swarm          real evidence   /no-comments
                                                                  open the PR

       └── every stage has an exit condition and blocks until it is met ──┘
```

| Stage | Exit condition |
|---|---|
| 1 Understand | You can state the full path from input to output without hedging |
| 2 Design | Interfaces and data shapes are fixed. Implementation is filling in blanks |
| 3 Build | The code explains itself without comments propping it up |
| 4 Verify | You hold runtime evidence, not an assertion |
| 5 Deliver | Nothing a human reads smells like AI wrote it |

### The 23 playbooks

`/poteto-mode` matches one of these.

| Group | Playbooks |
|---|---|
| **Find the problem** | `investigation` read-only research · `bug-fix` reproduce, locate, fix, prove · `perf-issue` optimize against a baseline · `hillclimb` push one metric over time · `runtime-forensics` leaks, idle spin, glitches · `trace-forensics` analyze a captured profile |
| **Write something** | `feature` new behavior built from a data shape · `refactoring` structural change that preserves behavior · `prototype` a throwaway sketch that settles a decision · `visual-parity` pixel-exact match between two implementations |
| **Deliver** | `opening-a-pr` · `babysit` drive a PR to merge-ready · `shipping` land a verified run after independent checks · `autopilot-full` one owner per PR through merge · `autopilot-stack` build a Graphite stack for a human to land |
| **Long runs** | `autonomous-run` drive to a predicate without stopping · `orchestrate` a standing multi-day, multi-PR, multi-agent program · `multi-phase-plan` work spanning phases · `session-pickup` take over another agent's in-flight work · `pause-safely` stop cleanly with a checkpoint |
| **Meta** | `authoring-a-skill` write a SKILL.md · `eval` blind-test the effect of a prompt change · `worktree-cleanup` prune worktrees and reclaim disk |

### What the `feature` playbook actually does

1. `/how` over the subsystem you are about to change.
2. `/architect` for parallel design exploration. **Skipping requires a written reason.** A design decision may not be folded silently into the implementation.
3. Write the throughput checkpoint. What must run first, what can run in parallel, and how shared state gets split.
4. Only now write code. A delegate gets file paths, the **data shape decided up front**, and acceptance criteria. You review the diff yourself.
5. Verify on the real surface. "Inconclusive" is not a pass, and neither is the wrong surface.
6. Rebase into small, ordered commits.
7. If the design is contested, run `/interrogate` before shipping.
8. Run `opening-a-pr`.

The phrase "data shape decided up front" in step 4 carries the weight. A state machine instead of scattered booleans. A table or registry instead of branching. A typed model instead of the same shape assumption repeated across files. You pick it **before the first line of logic**. This is where new features bury their landmines.

---

## Skills

| Group | Skills |
|---|---|
| **Entry point** | `poteto-mode` |
| **Understand** | `how` `why` `recall` `blast-radius` `teach` |
| **Design and build** | `architect` `arena` `swarm` `tdd` `typescript-best-practices` `figure-it-out` |
| **Verify** | `interrogate` `create-verification-skill` `maintain-verification-skill` |
| **Writing** | `unslop` `no-comments` `technical-writing` `bro` |
| **Meta** | `setup-pstack` `automate-me` `reflect` `show-me-your-work` |
| **21 principles** | `principle-*`, cited by the skills above where they apply |

<details>
<summary>The 21 principles</summary>

`boundary-discipline` `build-the-lever` `encode-lessons-in-structure` `exhaust-the-design-space` `experience-first` `fix-root-causes` `foundational-thinking` `guard-the-context-window` `laziness-protocol` `make-operations-idempotent` `migrate-callers-then-delete-legacy-apis` `minimize-reader-load` `model-the-domain` `never-block-on-the-human` `outcome-oriented-execution` `prove-it-works` `redesign-from-first-principles` `separate-before-serializing-shared-state` `sequence-verifiable-units` `subtract-before-you-add` `type-system-discipline`

</details>

Run `pstack find` for the full list with descriptions.

---

## Resources

| What you want | Where to look |
|---|---|
| Install it, or read the version history | [npm: `@shiwenbin1617/pstack`](https://www.npmjs.com/package/@shiwenbin1617/pstack) · [GitHub Releases](https://github.com/shiwenbin1617/pstack/releases) |
| File an issue or a PR | [github.com/shiwenbin1617/pstack](https://github.com/shiwenbin1617/pstack) |
| See what the port changed | [`adapters/claude-code.md`](./adapters/claude-code.md) · [`adapters/codex.md`](./adapters/codex.md) |
| Follow the original author through a full task | [`docs/guide/`](./docs/guide/README.md) |
| Validate a skill you edited | `node scripts/build.mjs --check` |
| Generate the distribution trees | `node scripts/build.mjs`, which writes `dist/` |
| Triage Slack issues automatically | [`automations/benny/`](./automations/benny/README.md), which needs your own Slack MCP and a scheduled agent |

---

## FAQ

<details>
<summary><b>How is this different from CLAUDE.md, AGENTS.md, or .cursorrules?</b></summary>

Those are **always-resident** project rules. Every session loads all of them into context, so they have to stay short and general. "Use TypeScript." "Tests go in tests/."

pstack skills load **on demand**. Only the description line of each of the 44 skills stays resident. The agent reads the body when it judges the skill relevant. That budget is what lets each skill go deep. The `feature` playbook has 8 steps with named exit conditions. The `refactoring` one demands a behavior fixture before any structural change. You cannot fit that density into an always-resident file.

They do not conflict. CLAUDE.md holds facts about your project. pstack holds general engineering method.

</details>

<details>
<summary><b>Is it Claude Code only?</b></summary>

No. Claude Code and Codex both work, and the installer detects which you have.

`skills/` holds the shared methodology. The builder generates two independent host trees. The Claude Code tree uses `/skill`, Markdown agents, and Claude frontmatter. The Codex tree uses `$skill`, `agents/openai.yaml`, TOML agents, and Codex paths. `scripts/build.mjs --check` blocks cross-host leakage.

Adding a third host touches none of the 44 skills. Write one adapter and add an entry to `HOSTS` in `scripts/lib.mjs`.

</details>

<details>
<summary><b>Will installing all 44 blow up my context?</b></summary>

No. Only the `description` line of each skill stays resident. Bodies load on demand.

Codex has a hard limit worth knowing. Its skill index gets 2% of context or 8000 characters, whichever is smaller, and long descriptions get truncated past that. pstack keeps its descriptions tight, but if you also run other skill packs and hit the truncation, install a subset with `pstack add` instead of `--all`.

</details>

<details>
<summary><b>Does it conflict with Trellis?</b></summary>

They divide differently, and one part does collide.

pstack is **stateless**. It owns the method and the standard for doing one thing. It remembers no project state across sessions. Trellis owns the specs, tasks, and work logs that accumulate in `.trellis/`, which solves the problem of an agent starting from zero every time.

The collision is workflow orchestration. Trellis runs plan, implement, verify, finish. pstack runs playbooks. Their verification bars are far apart. A Trellis check runs lint, type-check, and tests. pstack says none of those count as verification.

To combine them, let Trellis own state and pstack own method. Put the pstack core rules in `.trellis/spec/` so its auto-injection carries the standard into every task.

</details>

<details>
<summary><b>Does it make simple tasks slow?</b></summary>

It can, which is why `/poteto-mode` is aimed at work that needs rigor rather than at everything. When it cannot match a playbook it backs out instead of forcing a fit.

One principle exists for this specific risk. `laziness-protocol` ships the smallest change that reaches the goal and reverts speculative cleanup that might be useful later.

If it still feels heavy, skip `/poteto-mode` and call `/how` or `/interrogate` directly.

</details>

<details>
<summary><b>How do I make it ours?</b></summary>

Shared methodology lives in `skills/`. Host differences live in `adapters/claude-code/` and `adapters/codex/`. After editing, run `node scripts/build.mjs --check`, then `pstack update --host claude` and `pstack update --host codex` separately. Installed directories never sync to each other.

That check validates frontmatter, catches directory name collisions, resolves relative links, and finds hardcoded model names or host-specific tool names.

To make an agent work the way you personally do, run `/automate-me`. It reads your past sessions and drafts a `-mode` skill from how you actually work.

</details>

<details>
<summary><b>What changed in the port?</b></summary>

- Cursor's `readonly` mode strips MCP access. The `Explore` subagent in Claude Code does not, so it keeps MCP and loses file writes instead. The "please do not edit files" convention inside `why` and `reflect` is now enforced by the harness.
- Skills that depended on `cursor-team-kit`, namely `deslop`, `control-ui`, and `control-cli`, were replaced by the bundled `/unslop` and by project-local verification skills that `/create-verification-skill` generates.
- `grokbot/make-bot-ui` was deleted. It was tied to Cursor's automation webhook, which neither target host has.
- Every hardcoded model slug upstream became one of three semantic tiers, bound by `/setup-pstack`.

The full mapping is in [`adapters/`](./adapters/).

</details>

---

## Upstream and license

Forked from [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan ([@poteto](https://x.com/poteto), React core team, previously Meta, Netflix, and Cursor). The original [usage guide](./docs/guide/README.md) is preserved. It still uses Cursor as its backdrop, and the methodology carries over unchanged.

MIT License. Improvements and PRs welcome.
