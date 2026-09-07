---
name: principle-guard-the-context-window
description: Reduce unnecessary context from repeated reads, large outputs, and duplicated delegation.
disable-model-invocation: true
---

# Guard the context window

Read what the task needs. Use targeted searches and bounded output, retaining file pointers for detail that is not needed yet. Reuse findings across phases instead of rereading unchanged material.

For a skill with multiple modes, load the relevant reference only. Keep common constraints in its entrypoint without duplicating the reference.

Delegate a bounded investigation when it can independently resolve a useful question. Moving a large payload to another agent is not automatically cheaper; include coordination and duplicate reading in the decision.

After compaction, continue from the preserved state and inspect only what is missing or has changed.
