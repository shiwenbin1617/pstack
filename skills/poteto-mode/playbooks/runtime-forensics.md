### Runtime forensics

**You own the diagnosis. Instrument the live process, don't theorize from source.** For "why is X leaking / spinning / slow at runtime", heap snapshots, idle-but-busy processes, intermittent glitches. The deliverable is a cited diagnosis, not a fix.

1. Capture the live signal on the matching surface via the control skill: a CPU profile for a spinning process, a heap snapshot for a leak, a CDP trace for a visual glitch. A real artifact, not a guess.
2. Reduce the artifact to the relevant hot path, retainer chain, or repeated scheduling. Use an existing parser and bounded output; delegate an independent analysis when useful.
3. Confirm the mechanism with an authorized local reproduction or instrumentation when possible. Do not mutate a production process to validate a theory. If confirmation is unavailable, distinguish the supported diagnosis from an untested hypothesis.
4. Map the finding back to source: file, symbol, the line that allocates or schedules.

**Reply:** the signal captured, the reduced finding, how you proved the mechanism, the source location, artifact paths. No fix unless asked; hand back to Bug fix or Perf once the cause is known.
