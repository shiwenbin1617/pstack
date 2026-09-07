---
name: principle-build-the-lever
description: Choose reusable automation when repeated work or deterministic verification justifies a script or codemod.
disable-model-invocation: true
---

# Build the lever

Use an existing tool when it performs the requested transformation or check reliably. Build a script or codemod when repetition, error risk, or reproducibility outweighs its implementation and maintenance cost.

A one-off edit can stay manual. A new file is not evidence of better engineering, and citing this principle does not require creating one.

For bulk changes, validate a representative sample before scaling. Prefer a deterministic transformation to agents repeating the same mechanical edit. Keep scripts scoped and safe to rerun.

Preserve useful tools when the task needs them. Committing or installing them requires the user's authorization.
