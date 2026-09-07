---
name: typescript-best-practices
description: Guide TypeScript type design, boundary validation, and type-safety reviews when implementing or changing TypeScript code.
---

# TypeScript best practices

Follow the repository's TypeScript conventions and compiler settings. Strengthen types where they prevent a concrete invalid state or unsafe operation; avoid adding type machinery without a caller that needs it.

- Use discriminated unions for mutually exclusive states and exhaustive handling for closed variants.
- Parse external data from `unknown` at trust boundaries. Use established schemas and derive types from their authoritative definitions.
- Prefer narrowing or `satisfies` to assertions that hide a mismatch. When an assertion is unavoidable, keep it local to a verified invariant. `as const` is not an unsafe cast.
- Use branded primitives when confusing identifiers is a real risk, and non-empty collections only where an operation requires one.
- Preserve established function signatures, logging conventions, and test patterns unless the requested change requires otherwise.

Read [patterns](references/patterns.md) when a concrete example is needed. This skill does not require loading a second principle skill or running unrelated runtime tests.
