---
name: principle-prove-it-works
description: Choose evidence that verifies the changed behavior and supports the completion claim.
disable-model-invocation: true
---

# Prove it works

Match verification to the claim and the risk. Complete required project checks and reuse existing tests before creating new infrastructure.

- For prose or a mechanical edit, inspect the diff and relevant references.
- For code behavior, exercise affected cases with the closest meaningful tests.
- For UI and integration claims, inspect the corresponding runtime path when available.
- For performance, compare measured results under a representative workload.
- For delegated work, inspect artifacts and evidence, not only the summary.

Distinguish compilation, unit tests, mocks, and real infrastructure checks. Report missing coverage without inventing a pass. Use a reusable verification script when its benefit justifies the cost.

Once checks pass, repeat or broaden them only after further changes, failures, or unresolved concerns. Verification does not authorize production access, external writes, or commits.
