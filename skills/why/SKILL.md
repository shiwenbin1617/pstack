---
name: why
description: Investigate design rationale, regressions, or historical tradeoffs using cited evidence. Use how for runtime behavior.
---

# Why

Explain why a specific design or behavior exists. Separate recorded intent from inference; current code establishes behavior, not the author's motivation.

## Investigation

Anchor the question in the relevant symbols or change. Start with the strongest available lead: a supplied document, targeted history, the introducing PR, or its linked issue. Use bounded history queries before loading full patches.

Follow links or expand to another source when the answer has a material gap, evidence conflicts, or the user requests broader coverage. Available tools do not require searching every evidence category. Stop when the requested question is supported, or when remaining uncertainty has no useful accessible lead. An empty search means no result was found with that query, not that no record exists.

Use [source playbooks](references/source-playbook.md) for unfamiliar tools. Read only the relevant category. An incident investigation may also need [incident queries](references/sources/incident-postmortem.md); an ordinary guard or retry does not automatically require one.

Delegate independent leads when worthwhile, with bounded questions and read-only access. Reuse the code anchor and previous findings. The parent can investigate and synthesize directly; neither seven investigators nor a separate synthesizer is required. Use configured why-role models when delegating, otherwise inherit the parent model.

## Evidence and output

- Cite claims about intent to the actual PR, commit, ticket, document, or discussion.
- Label inference and explain the supporting evidence. Preserve contradictions and relevant gaps.
- Treat the user's suggested explanation as a hypothesis to check.
- Lead with the answer. Report search limits when they affect confidence; omit empty template sections and inventories of irrelevant tools.
- When a change follows, identify constraints that remain valid and distinguish them from historical choices that may no longer apply.

For complex records, use [epistemics](references/epistemics.md). Optional delegation templates: [investigator](references/investigator-prompt.md) and [synthesizer](references/synthesizer-prompt.md).
