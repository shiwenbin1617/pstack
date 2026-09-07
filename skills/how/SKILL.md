---
name: how
description: Explain code flow, subsystem architecture, or ownership and layering. Use why for historical rationale.
---

# How

Answer the requested architecture or runtime question from the relevant implementation. Trace the entry point, data flow, state changes, and boundaries far enough to explain the behavior with file references.

For a narrow question, read and answer directly. Reuse context already gathered. A code edit does not by itself require an architecture walkthrough.

For a broad subsystem, delegate independent slices only when that would save time or improve coverage. Give each explorer a distinct question and file scope; use read-only access where available. The parent reconciles findings and writes the answer. A separate explainer is optional, not a required handoff.

Use configured how-role models when delegating; otherwise inherit the parent model. If delegation is unavailable, continue locally.

## Critique

When architectural critique is requested, identify concrete problems after understanding the relevant behavior. Independent critics help with consequential or contested choices; a fixed panel is unnecessary for a small question. Judge findings against the code and project constraints, not vote counts. Report actionable findings before optional context.

## References

Read only what the current mode needs:

- [Explorer prompt](references/explorer-prompt.md) for a delegated exploration.
- [Explainer prompt](references/explainer-prompt.md) for a substantial walkthrough.
- [Critic prompt](references/critic-prompt.md) and [critique rubric](references/critique-rubric.md) for architectural review.

Lead with the answer, cite the relevant files, and explain material uncertainty. Include a diagram or file map only when it makes the flow easier to understand. Historical claims need evidence or an explicit inference label.
