import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ADAPTERS = join(dirname(fileURLToPath(import.meta.url)), "..", "adapters");
const HARNESS_FILE = "harness.md";
const UPSTREAM_HARNESS = "docs/harness/claude-code.md";
const GITHUB = "https://github.com/shiwenbin1617/pstack/blob/main";
const HOST_LABEL = { claude: "Claude Code", codex: "Codex" };

// Cursor names that the host harness maps. A skill that uses one gets the harness and a pointer to it.
const CURSOR_TERMS = [
  /`Task`|\bTask (tool|subagent|call)/,
  /AskQuestion/,
  /\btodo ?list\b/i,
  /generalPurpose/,
  /poteto-agent|comment-sicko/,
  /readonly: (true|false)|readonly\/Ask/,
  /environment: "(cloud|local)"/,
  /cloud_base_branch|run_in_background|`resume`|file_attachments/,
  /\b(claude-[a-z]+-\d|grok-\d|gpt-\d)/,
  /inherit-parent|pstack-models\.mdc/,
  /\.cursor\/|\.cursor-plugin|always-applied rule/,
  /agent-transcripts/,
  /Bugbot|Cursor [Aa]utomation|cursor\.(sh|com)\/automations|[Cc]loud [Aa]gent|built-in PR tool/,
];

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
    .replace(/`run_in_background: true`/g, "concurrently")
    .replace(/the `AskQuestion` tool \(structured multi-choice\)/g, "Codex's structured-question tool")
    .replace(/About to `AskQuestion`/g, "About to ask the user with the structured-question tool")
    .replace(/`AskQuestion`/g, "the structured-question tool")
    .replace(/AskQuestion/g, "structured-question")
    .replace(/`environment: "cloud"`/g, "a cloud session only when Codex explicitly exposes one; otherwise use a local subagent")
    .replace(/under `\/loop` in dynamic mode/g, "with Codex's recurring-monitoring mechanism")
    .replace(/`\/loop` per component/g, "repeat per component with the available monitoring mechanism")
    .replace(/\/loop/g, "a monitored loop")
    .replace(/Claude Code/g, "Codex")
    .replace(/\*\*Just do it\.\*\* Use any MCP tool\. Reversible work and external actions \(team chat, ticket updates, kicking off evals\) proceed without asking\./g, "**Respect the active authorization boundary.** Proceed with reversible local work. External writes, commits, pushes, PR changes, messages, and production actions require explicit scope and the host's approval rules.")
    .replace(/- Broken skill mid-task → fix it in its own PR\. Don't block\. Don't silently work around it\./g, "- Broken skill mid-task → report and fix it locally when in scope. Open a separate PR only when the user authorized PR creation.")
    .replace(/Commit it when stakes need an auditable record\. Keep it local otherwise\./g, "Keep it local unless the user explicitly authorized a commit.")
    .replace(/- Frontmatter `disable-model-invocation: true` by default\. Opt out only if the user explicitly wants their mode to apply on every turn\./g, "- Add `agents/openai.yaml` with `policy.allow_implicit_invocation: false` by default. Enable implicit invocation only when the user explicitly wants their mode to apply on every turn.");
}

export function adaptMarkdownForHost(text, { host, skillNames }) {
  if (host === "claude") return text;
  let adapted = stripUnsupportedFrontmatter(text);
  adapted = replaceSkillInvocations(adapted, skillNames);
  adapted = adaptCodexVocabulary(adapted);
  return adapted;
}

function installHarness(skillDir, host) {
  writeFileSync(join(skillDir, HARNESS_FILE), readHarness(host));
  const skillFile = join(skillDir, "SKILL.md");
  const text = readFileSync(skillFile, "utf8");
  const line =
    `In ${HOST_LABEL[host]}, read [the ${HOST_LABEL[host]} adapter](${HARNESS_FILE}) once per session before you follow this skill. ` +
    `It maps the Cursor names in pstack skills to ${HOST_LABEL[host]}.`;
  if (!/^# /m.test(text)) throw new Error(`${skillFile} uses Cursor names but has no H1 for the adapter line`);
  writeFileSync(skillFile, text.replace(/^(# .*)\n+/m, `$1\n\n${line}\n\n`));
}

export function writeCodexInvocationPolicy(skillDir, allowImplicitInvocation) {
  const agentsDir = join(skillDir, "agents");
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(
    join(agentsDir, "openai.yaml"),
    `policy:\n  allow_implicit_invocation: ${allowImplicitInvocation ? "true" : "false"}\n`,
  );
}

function harnessPath(host) {
  return join(ADAPTERS, host === "codex" ? "codex" : "claude-code", HARNESS_FILE);
}

export function readHarness(host) {
  return readFileSync(harnessPath(host), "utf8");
}

function routesToSkill(text, skillName, skillNames) {
  const others = skillNames.filter((name) => name !== skillName).join("|");
  if (!others) return false;
  return new RegExp(`the \\*\\*(${others})\\*\\* skill|\`/(${others})\``).test(text);
}

export function usesCursorNames(text, skillName, skillNames) {
  return CURSOR_TERMS.some((term) => term.test(text)) || routesToSkill(text, skillName, skillNames);
}

// Installed skills sit apart from docs/ and README.md, so links that leave the skills tree point at GitHub,
// and the upstream Claude Code adapter link points at the host harness copied into the skill.
function rewriteExternalLinks(text, { skillName, relPath }) {
  return text.replace(/\]\(([^)\s]+)\)/g, (link, href) => {
    if (/^[a-z][a-z0-9+.-]*:|^#|^\{/i.test(href)) return link;
    const target = href.replace(/[#?].*/, "");
    if (!target) return link;
    const resolved = posix.normalize(posix.join("skills", skillName, posix.dirname(relPath), target));
    if (resolved.startsWith("skills/")) return link;
    if (resolved === UPSTREAM_HARNESS) {
      return `](${posix.relative(posix.dirname(relPath), HARNESS_FILE) || HARNESS_FILE})`;
    }
    if (resolved.startsWith("..")) return link;
    return `](${GITHUB}/${resolved}${href.slice(target.length)})`;
  });
}

export function adaptCopiedSkillTree(skillDir, { host, skillNames, allowImplicitInvocation, nativeCodex = false }) {
  const skillName = basename(skillDir);
  let needsHarness = false;
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
      const relPath = relative(skillDir, path).split("\\").join("/");
      if (usesCursorNames(source, skillName, skillNames) || source.includes(UPSTREAM_HARNESS)) needsHarness = true;
      const linked = rewriteExternalLinks(source, { skillName, relPath });
      writeFileSync(path, adaptMarkdownForHost(linked, { host, skillNames }));
    }
  };
  if (!nativeCodex) {
    walk(skillDir);
    if (needsHarness) installHarness(skillDir, host);
  }
  if (host === "codex") writeCodexInvocationPolicy(skillDir, allowImplicitInvocation);
}
