### Opening a PR

Use when the user authorizes PR creation. Other playbooks can finish with local changes.

**Workspace.** Preserve existing work. Use an isolated worktree when needed and authorized. Never reset a dirty checkout or discard others' changes to prepare a PR.

**Commits.** Commit, rebase, or push only within the user's authorization. Prefer coherent commits; split a stack when it helps independent review or delivery, not to meet a fixed PR count.

**Title.** Use Conventional Commits: `type(scope): subject`, with a short imperative subject and no trailing period.

**Description.** Explain the problem, resulting behavior, material tradeoffs, and actual validation. Follow the repository template. A simple change can use a short paragraph and verification line; broader changes may need sections.

**Readiness.** Respect the user's requested draft or ready state. Use a draft when review is useful before required work is complete. Verify the returned PR URL and status before reporting them.

Opening a PR does not start monitoring or authorize merging. Run **Babysit** only when monitoring is requested. Return the PR URL and any remaining work.
