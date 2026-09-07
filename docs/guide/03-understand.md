# Understand the code before changing it

Editing code you don't understand is how subtle regressions ship. pstack gives you four ways in. `/how` explains what the code does now. `/why` digs up the reasons it's shaped that way. `/teach` blends both into one explanation. `/recall` rebuilds your own recent context on a topic.

![A detective studies a machine blueprint with a magnifying glass while robots fetch case files; the evidence board behind her links clues under /how and /why.](./images/understanding.jpg)

## Trace behavior with `/how`

```text
/how do we dedupe notifications? is there an n+1 when we look up subscribers?
```

Ask the question you actually have. [`/how`](../../skills/how/SKILL.md) traces the relevant flow and ownership. It answers narrow questions directly and delegates independent slices of a broad subsystem when useful.

`/how` can also push back on the design. Ask for Critique mode when you suspect the structure itself:

```text
/how explain the sync service, then critique its ownership boundaries
```

The critique is grounded in the implementation and leads with actionable findings.

## Dig up history with `/why`

```text
/why was the retry limit set to five? does the reason still hold?
```

[`/why`](../../skills/why/SKILL.md) starts with the strongest available lead and expands when a material gap or contradiction warrants it. The answer cites recorded intent and separates inference from fact. An empty search does not prove that nobody recorded the reason.

The two compose naturally. `do why first then how` is a perfectly good prompt when you suspect the history explains the mess.

## Actually understand it with `/teach`

```text
/teach me how this PR changes retries. convince me it fixes the cause and not the symptom.
```

[`/teach`](../../skills/teach/SKILL.md) is for when a summary isn't enough. It runs `/how` and `/why`, for a small change maybe just one of them, and weaves the findings into a plain explanation that builds up diagram by diagram. The "convince me" framing is worth stealing. It turns the explanation into an argument you can poke at instead of a tour.

## Rebuild your own context with `/recall`

```text
/recall catch me up on the export work from last week
```

[`/recall`](../../skills/recall/SKILL.md) mines your own recent chats plus the shared record (issues, prior fixes, errors still firing) and hands back a brief on where things stand and what's next. Use it when you're returning to a topic cold. If you want to resume one specific chat, that's the Session pickup playbook below, not `/recall`.

## Take over prior work with Session pickup

When another agent (or you, last week) left a branch mid-flight:

```text
/poteto-mode take over this branch. read the decision log, figure out what's done, and continue from there. don't redo finished work.
```

The [Session pickup playbook](../../skills/poteto-mode/playbooks/session-pickup.md) treats the prior trail as authoritative. It reconstructs the branch state and decisions, names the resume point, and verifies inherited claims against the original goal instead of re-deriving everything from scratch.

Use these skills when an explanation or historical investigation is needed. Ordinary edits can rely on targeted code reading and context already gathered.

Next: [Design the change](./04-design.md).
