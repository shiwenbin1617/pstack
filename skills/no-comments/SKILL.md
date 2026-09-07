---
name: no-comments
description: Review and simplify comments or suppressions within a requested code scope.
disable-model-invocation: true
---

# No comments

Remove redundant narration, dead commented-out code, and stale explanations from the requested scope. Keep legal headers, public API contracts, and non-obvious reasons or constraints that code alone cannot explain.

Use the supplied files or diff. Review nearby code before accepting a deletion. For uncertain comments, retain the information until evidence resolves it; uncertainty is not a reason to delete.

A `comment-sicko` read-only review can provide an independent pass when useful. The parent judges the findings and performs authorized edits. Do not launch **how**, **why**, or **architect** merely to adjudicate wording.

Inspect suppressions against the compiler or lint rule they affect. Fix a real underlying issue when in scope; preserve necessary, justified suppressions. Do not remove a correctness constraint because its replacement needs separate authorization.

Verify behavior when code changes. For comments alone, inspect the diff and run required formatting checks. Report material deletions, fixes, and unresolved concerns.
