---
name: architect
description: Design types, interfaces, and module ownership for a requested architectural change or an unresolved design choice.
disable-model-invocation: true
---

# Architect

Produce a design that fits the task and existing contracts. Read the affected implementation and reuse established context. Use **how** or **why** only when behavior or historical constraints remain unclear.

Sketch the caller's usage, types, signatures, and ownership at the detail needed to evaluate the choice. Routine changes can use one coherent sketch. Compare structurally distinct alternatives when tradeoffs are consequential and unsettled; use **arena** if independent candidates would help. A fixed candidate count or model panel is not required.

Use configured architect runners when delegating; otherwise inherit the parent model. Judge designs on behavior, compatibility, interface simplicity, and maintenance cost.

## Implementation

A design-only request ends with the design. For an implementation request, continue into code unless the user requested a checkpoint. Adjust routine details autonomously. Revisit the design when repeated implementation friction exposes a wrong assumption, without rerunning the entire workflow for a single new parameter.

Preserve public and persistent contracts. Remove only task-owned sketches or temporary scaffolding. A sketch does not authorize a commit or a breaking intermediate state in shared work.

## References

- [Runner prompt](references/runner-prompt.md) for independent design candidates.
- [Rationale template](references/rationale-template.md) for a design that needs a durable record.
- [Design red flags](references/design-red-flags.md) when assessing abstraction quality.

Deliver the chosen design, material tradeoffs, and verification if implemented. Keep the explanation proportional to the change.
