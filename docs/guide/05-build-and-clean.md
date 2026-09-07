# Build and clean the change

Give the agent the changed behavior and the contract that must remain intact:

```text
/poteto-mode add a --json flag. text output stays byte-identical. verify both forms.
```

[Feature](../../skills/poteto-mode/playbooks/feature.md), [Bug fix](../../skills/poteto-mode/playbooks/bug-fix.md), and [Refactoring](../../skills/poteto-mode/playbooks/refactoring.md) select checks according to the affected behavior. Existing tests may be sufficient. A small change does not require a new harness or an independent implementation agent.

## Regression tests

Use [tdd](../../skills/tdd/SKILL.md) when you want a failing test first or the defect has a cheap local regression target. Avoid creating broad test infrastructure merely to satisfy a sequence.

For performance work, provide a representative workload and measure before and after. [Hillclimb](../../skills/poteto-mode/playbooks/hillclimb.md) is for an explicitly sustained experiment with completion criteria.

## TypeScript and prose

[typescript-best-practices](../../skills/typescript-best-practices/SKILL.md) guides type design and boundary validation during TypeScript implementation. Merely reading a TypeScript file does not require loading it.

[unslop](../../skills/unslop/SKILL.md) edits prose for clarity. It is bundled with pstack and does not require a separate pass for every reply or commit.

## Comments and delivery

Use [no-comments](../../skills/no-comments/SKILL.md) for a requested comment cleanup. Remove redundant narration and stale claims. Preserve useful contracts and non-obvious reasons, including constraints in the project's own code. Retain uncertain information until evidence resolves it.

A read-only [comment reviewer](../../agents/comment-sicko.md) is available when an independent pass would help. It does not automatically trigger architecture or historical investigations.

Finish with a reviewable diff and the actual checks performed. [Opening a PR](../../skills/poteto-mode/playbooks/opening-a-pr.md) applies only when PR creation is authorized.

Next: [Verify and ship](./06-verify-and-ship.md).
