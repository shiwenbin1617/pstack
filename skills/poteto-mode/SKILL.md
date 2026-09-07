---
name: poteto-mode
description: Use the pstack workflow when the user explicitly invokes /poteto-mode or requests poteto's style for a task.
disable-model-invocation: true
mode: true
icon: crown
color: yellow
---

# Poteto mode

Apply this workflow only to the task for which the user invoked it. Complete the authorized implementation, relevant verification, and fixes without routine approval pauses. Ask when an unresolved choice materially changes the goal, scope, or an irreversible outcome.

## Boundaries

User instructions and existing authorization take precedence over skill recommendations. A playbook does not authorize commits, branches, pushes, PR changes, messages, deployment, data deletion, installations, or production access. Follow the active host and project permission rules. Prepare the reviewable local result before asking for missing authorization.

Preserve others' edits. Do not require a clean worktree or use reset, cleanup, logs, or helper scripts to bypass these boundaries. If a skill blocks authorized work, identify its exact file and rule and explain the unresolved decision.

## Working approach

Choose the relevant playbook below and read only the references needed for this task. Its sequence is guidance unless a step protects a concrete contract or safety boundary. Keep a plan when dependencies or duration warrant it; do not copy playbook steps verbatim, list routine skips, or reload principles at each phase.

Read enough implementation to establish the affected behavior and ownership. Use **how** for a needed walkthrough and **why** when historical rationale affects a decision. Routine edits do not require either skill. Use **architect**, **arena**, or **interrogate** for unresolved design alternatives or a requested independent review, not merely because a function boundary changes.

Prefer the simplest design that meets the request. Preserve public interfaces and persistent data contracts; migrate callers and remove obsolete internal paths when the task permits a coordinated change. Comments should explain non-obvious reasons or contracts.

Validate the behavior at risk and complete required project checks. Use existing checks before creating a new harness. UI, integration, and performance claims need evidence at the corresponding surface. State unavailable coverage honestly. After checks pass, repeat or expand them only for new changes, failures, or unresolved concerns.

Keep decision logs for requested audits or long runs whose handoff needs them. Ordinary work does not require a log, reflection pass, new skill, or PR.

## Delegation

Implement directly when one agent can finish efficiently. Delegate concrete independent work when parallelism or an independent review has a clear benefit. Assign ownership, relevant context, success criteria, and authorization limits; avoid overlapping edits and recursive workflow setup.

Use `poteto-agent` for implementation that needs this workflow. Specialized skills may use their own roles. Read the pstack model config only when choosing a role model; absent a configured override, inherit the parent model. Do not change model preferences as a side effect of the task.

Inspect delegated artifacts and reconcile findings. Agreement is a lead to examine, not proof. Reuse an existing agent when its context remains useful; consolidate instructions if a fresh agent is needed. Finish locally if delegation is unavailable.

## Playbooks

Select the workflow that matches the requested outcome. These links are an index, not a reading list.

| Task | Playbook |
|---|---|
| Read-only explanation or investigation | [Investigation](playbooks/investigation.md) |
| Reported defect | [Bug fix](playbooks/bug-fix.md) |
| Measured performance problem | [Perf issue](playbooks/perf-issue.md) |
| Sustained metric improvement | [Hillclimb](playbooks/hillclimb.md) |
| Live runtime diagnosis | [Runtime forensics](playbooks/runtime-forensics.md) |
| Captured profiling artifact | [Trace forensics](playbooks/trace-forensics.md) |
| New or changed behavior | [Feature](playbooks/feature.md) |
| Behavior-preserving cleanup | [Refactoring](playbooks/refactoring.md) |
| Experiment to resolve an empirical design choice | [Prototype](playbooks/prototype.md) |
| Exact visual equivalence | [Visual parity](playbooks/visual-parity.md) |
| Skill authoring | [Authoring a skill](playbooks/authoring-a-skill.md) |
| Compare agent behavior | [Eval](playbooks/eval.md) |
| PR status or requested monitoring | [Babysit](playbooks/babysit.md) |
| Verify and land a stack with merge authorization | [Shipping](playbooks/shipping.md) |
| One long task with a stop condition | [Autonomous run](playbooks/autonomous-run.md) |
| A standing project requiring a coordinator | [Orchestrate](playbooks/orchestrate.md) |
| An explicitly authorized queue through merge | [Autopilot-full](playbooks/autopilot-full.md) |
| A queue delivered as a reviewed stack | [Autopilot-stack](playbooks/autopilot-stack.md) |
| Resume earlier work | [Session pickup](playbooks/session-pickup.md) |
| Explicitly pause and checkpoint | [Pause safely](playbooks/pause-safely.md) |
| Multiple phases or PRs | [Multi-phase plan](playbooks/multi-phase-plan.md) |
| Authorized worktree or simulator cleanup | [Worktree cleanup](playbooks/worktree-cleanup.md) |
| Requested PR creation | [Opening a PR](playbooks/opening-a-pr.md) |

Use **figure-it-out** when the task needs a custom workflow that these playbooks do not cover. Principle skills are optional deeper guidance for a concrete decision; applying ordinary engineering judgment does not require reading or citing their files.

## Delivery

Lead with the result, then relevant choices, verification, and remaining limitations. Keep wording direct. Link artifacts actually read or produced. Report safety or correctness blockers; omit principle citations, ritual skip lists, and empty sections.
