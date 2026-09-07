### Refactoring

Improve structure while preserving the behavior and compatibility required by the task.

1. Establish the contract and existing coverage. Add a focused characterization or equivalence check when a meaningful behavior risk lacks coverage; a mechanical rename does not automatically require a new harness.
2. Choose the target shape from the actual constraints. Use **architect** only for unresolved design choices.
3. Make the scoped change, update callers and references, and remove obsolete internal paths. Preserve published APIs and persistent formats unless a breaking change is authorized.
4. Run checks that cover the behavior at risk. Review the diff for accidental behavior changes and unnecessary complexity.
5. Deliver the result. Commits, rebases, stacks, and PR creation follow the user's authorization.

For broad changes, use bounded stages and delegate independent portions when useful. Do not add a separate planning workflow solely because several files are involved.

**Reply:** what became simpler, the preserved contract, verification, and any remaining risk.
