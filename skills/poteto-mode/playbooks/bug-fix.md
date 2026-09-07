### Bug fix

Diagnose and fix the reported defect using evidence.

1. Reproduce with the closest useful existing check or runtime surface. If access or nondeterminism prevents reproduction, use available logs, traces, and code evidence and state the limitation. Do not keep probing without a plausible new lead.
2. Test hypotheses against the evidence until the cause is sufficiently supported. Read history when it can resolve a regression question; **how** and **why** are optional aids.
3. Implement the smallest fix that addresses the cause. Delegate only when independent investigation or implementation would help.
4. Recheck the original failure and affected behavior. Add a regression test when a practical test target exists. Do not claim full runtime verification from mocks or from compilation alone.
5. Deliver the verified fix and remaining limits. Use **Opening a PR** only with authorization.

Use **tdd** when requested or when a cheap local regression check makes the failure clear. A failing-test-first commit history is not required.

**Reply:** the failure, cause, fix, and actual verification result. Include only the output needed to substantiate the result.
