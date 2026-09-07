---
name: reflect
description: Review a completed task for reusable lessons when the user requests reflection or workflow improvements.
disable-model-invocation: true
---

# Reflect

Identify demonstrated workflow problems and useful lessons from the requested task. A correction, failure, or long conversation does not automatically require reflection or new persistent rules.

Use the current conversation when sufficient. If older evidence is needed, resolve `../recall/scripts/find-transcripts.mjs` relative to this skill and run it with `node`, `--host claude`, `--workspace` set to this workspace, and a bounded `--limit`. Do not scan unrelated projects' transcripts.

Review directly for a narrow lesson. For a complex task, independent judgment, tooling, or divergent reviews may help; load only the corresponding [judgment](references/judgment-reviewer.md), [tooling](references/tooling-reviewer.md), or [divergent](references/divergent-reviewer.md) template. The parent can synthesize without another agent.

Prefer a correction to an existing rule over a new skill. Add a script, lint rule, or check only when it reliably prevents a recurring problem at reasonable maintenance cost. Do not generalize a one-off into a universal policy.

When the user authorized instruction changes, apply the supported edits and validate them. If the request is reflection only, present recommendations. Existing authorization does not need another approval round. External tracker submissions require their own authorization.

Report the useful lessons, changes made, and any unresolved proposal. Omit empty categories and routine process narration.
