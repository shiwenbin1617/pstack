# Route work through poteto-mode

Invoke `/poteto-mode` for the task that needs the pstack workflow. On Codex, use `$poteto-mode`. Activation is explicit and scoped to one task.

![The pstack workflow router.](./images/router.jpg)

## Describe the outcome

State the goal and any important constraints:

```text
/poteto-mode users get two notifications after a retry. fix it and verify the affected behavior.
```

The agent selects the relevant [playbook](../../skills/poteto-mode/playbooks/), reads the needed context, implements, and verifies. Routine steps adapt to the task. No verbatim todo list, principle recital, or fixed skill sequence is required.

A read-only request ends with an answer. An implementation request continues through fixes to a reviewable result. Say explicitly when you want an intermediate checkpoint.

## Boundaries and long tasks

State any required isolation, budget, or delivery boundary. Commits, branches, pushes, PRs, and external actions depend on authorization; enabling a workflow does not grant it.

For a long run, define completion and ask for a log when a durable handoff matters:

```text
/poteto-mode continue until the migration check reports zero old callers. keep a decision log. leave changes uncommitted.
```

Use [figure-it-out](../../skills/figure-it-out/SKILL.md) when the work needs a custom plan that existing playbooks do not cover. A large file count alone does not require another planning layer.

See [poteto-mode](../../skills/poteto-mode/SKILL.md) for routing and [long-running work](./07-overnight.md) for specialized workflows.

Next: [Understand the code](./03-understand.md).
