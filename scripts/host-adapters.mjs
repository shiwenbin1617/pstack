import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CODEX_TRANSCRIPT = "`~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl`, filtered by the session metadata `cwd` for the active workspace";

function stripUnsupportedFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return text;

  const kept = match[1]
    .split(/\r?\n/)
    .filter((line) => /^(name|description|metadata):/.test(line) || /^\s+/.test(line));
  return `---\n${kept.join("\n")}\n---\n\n${text.slice(match[0].length)}`;
}

function replaceSkillInvocations(text, skillNames) {
  const names = [...skillNames].sort((a, b) => b.length - a.length).join("|");
  const invocation = new RegExp("/(?:" + names + ")(?=[\\s`,.)'\"]|$)", "g");
  return text.replace(invocation, (value) => `$${value.slice(1)}`);
}

function adaptCodexVocabulary(text) {
  return text
    .replace(/--host claude/g, "--host codex")
    .replace(/On Claude Code that is `subagent_type: Explore`\.?/g, "On Codex, use a custom agent with `sandbox_mode = \"read-only\"`.")
    .replace(/using the Task tool/g, "using Codex subagent tools")
    .replace(/Task tool's error message/g, "subagent tool's validation error")
    .replace(/through the Task tool/g, "through Codex subagent tools")
    .replace(/`run_in_background: true`/g, "concurrently")
    .replace(/the `AskQuestion` tool \(structured multi-choice\)/g, "Codex's structured-question tool")
    .replace(/About to `AskQuestion`/g, "About to ask the user with the structured-question tool")
    .replace(/`AskQuestion`/g, "the structured-question tool")
    .replace(/AskQuestion/g, "structured-question")
    .replace(/\.claude\/skills\/<handle>\/\*\/` and `~\/\.claude\/skills\/<handle>\/\*\/` on Claude Code, `\.agents\/skills\/<handle>\/\*\/` and `~\/\.agents\/skills\/<handle>\/\*\/` on Codex/g, ".agents/skills/<handle>/*/` and `~/.agents/skills/<handle>/*/`")
    .replace(/\.claude\/skills\/verify-<app>\/` \(`\.agents\/skills\/verify-<app>\/` on Codex\)/g, ".agents/skills/verify-<app>/`")
    .replace(/`\.claude\/skills\/` \(`\.agents\/skills\/` on Codex\)/g, "`.agents/skills/`")
    .replace(/usually `\.claude\/skills\/verify-\*\/`, or `\.agents\/skills\/verify-\*\/` on Codex/g, "usually `.agents/skills/verify-*/`")
    .replace(/project `\.claude\/skills\/` or `\.agents\/skills\/`, user-level `~\/\.claude\/skills\/` or `~\/\.agents\/skills\/`, or plugin-installed paths under `~\/\.claude\/plugins\/`/g, "project `.agents/skills/` or user-level `~/.agents/skills/`")
    .replace(/~\/\.claude\/skills\//g, "~/.agents/skills/")
    .replace(/\.claude\/skills\//g, ".agents/skills/")
    .replace(/\.claude\/worktrees\//g, ".codex/worktrees/")
    .replace(/under `~\/\.claude\/projects\/<slug>\/`/g, `under ${CODEX_TRANSCRIPT}`)
    .replace(/`environment: "cloud"`/g, "a cloud session only when Codex explicitly exposes one; otherwise use a local subagent")
    .replace(/a real terminal `\/loop`/g, "Codex's available recurring-monitoring mechanism")
    .replace(/the `\/loop` skill \(your harness's, not a pstack skill\)/g, "Codex's available recurring-monitoring or wait mechanism")
    .replace(/under `\/loop` in dynamic mode/g, "with Codex's recurring-monitoring mechanism")
    .replace(/`\/loop` per component/g, "repeat per component with the available monitoring mechanism")
    .replace(/with the `\/loop` skill/g, "with Codex's available monitoring mechanism")
    .replace(/\/loop/g, "a monitored loop")
    .replace(/cloud-sleeper wake chain/g, "Codex long-running goal mechanism")
    .replace(/monitored-shell 30-minute sleep and emits an output-notification sentinel/g, "recurring monitor with a 30-minute heartbeat")
    .replace(/\/~\/\.claude\/CLAUDE\.md/g, "~/.codex/AGENTS.md")
    .replace(/Claude Code/g, "Codex")
    .replace(/pstack model config(?!uration)/g, "Codex pstack model config at `~/.codex/pstack-models.md`")
    .replace(/\*\*Just do it\.\*\* Use any MCP tool\. Reversible work and external actions \(team chat, ticket updates, kicking off evals\) proceed without asking\./g, "**Respect the active authorization boundary.** Proceed with reversible local work. External writes, commits, pushes, PR changes, messages, and production actions require explicit scope and the host's approval rules.")
    .replace(/- Broken skill mid-task → fix it in its own PR\. Don't block\. Don't silently work around it\./g, "- Broken skill mid-task → report and fix it locally when in scope. Open a separate PR only when the user authorized PR creation.")
    .replace(/, and open a separate PR to update the configured value or default table/g, ", and report that the configured value needs updating")
    .replace(/Commit it when stakes need an auditable record; keep it local otherwise\./g, "Keep it local unless the user explicitly authorized a commit.")
    .replace(/Frontmatter `disable-model-invocation: true` by default\. Mode skills are heavy and opinionated; they should only apply when the user explicitly invokes them \(by name or slash command\), not auto-trigger on description matching\. Opt out only if the user explicitly wants their mode to apply on every turn\./g, "Add `agents/openai.yaml` with `policy.allow_implicit_invocation: false` by default. Mode skills are heavy and opinionated; they should apply only when the user explicitly invokes `$<name>`. Enable implicit invocation only when the user explicitly requests it.");
}

function adaptClaudeVocabulary(text) {
  return text
    .replace(/\(`\.agents\/skills\/verify-<app>\/` on Codex\)/g, "")
    .replace(/ \(`\.agents\/skills\/` on Codex\)/g, "")
    .replace(/, or `\.agents\/skills\/verify-\*\/` on Codex/g, "")
    .replace(/`\.claude\/skills\/` and `~\/\.claude\/skills\/` on Claude Code, `\.agents\/skills\/` and `~\/\.agents\/skills\/` on Codex/g, "`.claude/skills/` and `~/.claude/skills/`")
    .replace(/project `\.claude\/skills\/` or `\.agents\/skills\/`, user-level `~\/\.claude\/skills\/` or `~\/\.agents\/skills\/`, or plugin-installed paths under `~\/\.claude\/plugins\/`/g, "project `.claude/skills/`, user-level `~/.claude/skills/`, or plugin-installed paths under `~/.claude/plugins/`")
    .replace(/\. Every line is one chat message\. Scope to this workspace; never sweep the whole store, that reads private chats from unrelated projects/g, ". Scope to this workspace; never sweep unrelated projects")
    .replace(/ \(`\.agents\/skills\/verify-<app>\/` on Codex\)/g, "")
    .replace(/ \(`\.agents\/skills\/` on Codex\)/g, "");
}

export function adaptMarkdownForHost(text, { host, skillNames }) {
  if (host === "claude") return adaptClaudeVocabulary(text);
  let adapted = stripUnsupportedFrontmatter(text);
  adapted = replaceSkillInvocations(adapted, skillNames);
  adapted = adaptCodexVocabulary(adapted);
  return adapted;
}

export function writeCodexInvocationPolicy(skillDir, allowImplicitInvocation) {
  const agentsDir = join(skillDir, "agents");
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(
    join(agentsDir, "openai.yaml"),
    `policy:\n  allow_implicit_invocation: ${allowImplicitInvocation ? "true" : "false"}\n`,
  );
}

export function adaptCopiedSkillTree(skillDir, { host, skillNames, allowImplicitInvocation, nativeCodex = false }) {
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules") continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!path.endsWith(".md")) continue;
      const source = readFileSync(path, "utf8");
      writeFileSync(path, adaptMarkdownForHost(source, { host, skillNames }));
    }
  };
  if (!nativeCodex) walk(skillDir);
  if (host === "codex") writeCodexInvocationPolicy(skillDir, allowImplicitInvocation);
}
