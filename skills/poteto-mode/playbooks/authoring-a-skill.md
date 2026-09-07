### Authoring or modifying a skill

Write instructions that supply task-specific knowledge and decision boundaries.

- Keep the description short and precise about when the skill applies.
- Keep shared constraints and routing in `SKILL.md`; put substantial conditional detail in linked references.
- Preserve supported metadata and existing invocation policy. A mode workflow should require explicit invocation unless the user chooses otherwise.
- Prefer outcomes and constraints to fixed recipes for routine work. Retain exact steps when correctness, safety, or a fragile tool contract requires them.
- Validate frontmatter, naming, and references with the available project checks. Use realistic behavioral trials for substantial workflow changes when practical; wording-only changes do not require a new evaluation harness.

Update callers when removing a rule or reference. Deliver the changes and validation results; opening a PR requires authorization.
