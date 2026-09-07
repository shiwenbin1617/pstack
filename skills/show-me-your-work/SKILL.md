---
name: show-me-your-work
description: Keep a reviewable decision log for a requested audit or a long-running task that needs a durable handoff.
disable-model-invocation: true
---

# Show me your work

Use one canonical log for decisions that a later reviewer or agent needs to reconstruct. Ordinary tasks and routine actions do not need a log.

## Format

Use [the TSV template](references/decision-log-template.tsv). Each row records `ts`, `phase`, `decision`, `why`, `evidence`, and `result`. Evidence is a resolvable path, URL, or identifier. Keep cells single-line.

Resolve `scripts/log.mjs` relative to this skill. Run it with `node` and arguments `<logfile> <phase> <decision> <why> <evidence> <result>`. It timestamps rows, writes the header, strips tabs and newlines, and escapes spreadsheet formula prefixes.

Log consequential choices, pivots, verification results, and blockers. For an experimental loop, record each measured iteration. Do not copy illustrative rows into a real log.

## Storage and review

Keep the log local at `decisions.tsv` or `.audit/<task-slug>.tsv`, unless another task location is specified. Commit only with authorization. Record a superseding row for a changed decision; do not silently rewrite the historical record.

Check claims against the evidence already gathered. Consult this run's transcript only for a specific gap; use `../recall/scripts/find-transcripts.mjs` with `--host claude` and the exact `--workspace`, never a whole-store search.

An independent review may help for a consequential or explicitly audited run. It is not required solely because a log exists, and no particular model family is mandatory unless configured or requested.

Link the log at delivery and call out material unresolved risks. An empty attention section and a second review of unchanged evidence add no value.
