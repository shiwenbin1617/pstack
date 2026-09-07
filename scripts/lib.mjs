import { readdirSync, readFileSync, statSync, lstatSync, mkdirSync, rmSync, cpSync, existsSync, realpathSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { adaptCopiedSkillTree } from "./host-adapters.mjs";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SKILLS_DIR = join(REPO_ROOT, "skills");
export const AGENTS_DIR = join(REPO_ROOT, "agents");
export const CODEX_ADAPTER_DIR = join(REPO_ROOT, "adapters", "codex");
export const CLAUDE_ADAPTER_DIR = join(REPO_ROOT, "adapters", "claude-code");

export const HOSTS = {
  claude: {
    label: "Claude Code",
    skillsDir: (scope) => (scope === "project" ? join(process.cwd(), ".claude", "skills") : join(homedir(), ".claude", "skills")),
    agentsDir: (scope) => (scope === "project" ? join(process.cwd(), ".claude", "agents") : join(homedir(), ".claude", "agents")),
    memoryFile: (scope) => (scope === "project" ? join(process.cwd(), "CLAUDE.md") : join(homedir(), ".claude", "CLAUDE.md")),
    modelConfig: "~/.claude/pstack-models.md",
    invoke: (name) => `/${name}`,
  },
  codex: {
    label: "Codex",
    skillsDir: (scope) => (scope === "project" ? join(process.cwd(), ".agents", "skills") : join(homedir(), ".agents", "skills")),
    agentsDir: (scope) => (scope === "project" ? join(process.cwd(), ".codex", "agents") : join(homedir(), ".codex", "agents")),
    memoryFile: (scope) => (scope === "project" ? join(process.cwd(), "AGENTS.md") : join(homedir(), ".codex", "AGENTS.md")),
    modelConfig: "~/.codex/pstack-models.md",
    invoke: (name) => `$${name}`,
  },
};

export function detectHosts({ homeDir = homedir(), pathExists = existsSync } = {}) {
  const found = [];
  if (pathExists(join(homeDir, ".claude"))) found.push("claude");
  if (pathExists(join(homeDir, ".codex")) || pathExists(join(homeDir, ".agents"))) found.push("codex");
  return found;
}

/** Parse the `name` and `description` out of a SKILL.md's YAML frontmatter. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const out = {};
  // Only the two scalar fields pstack relies on; values may be quoted.
  for (const key of ["name", "description"]) {
    const km = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(m[1]);
    if (!km) continue;
    let v = km[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).replace(/\\"/g, '"');
    }
    out[key] = v;
  }
  return out;
}

/** Every SKILL.md under skills/, including nested category dirs. */
export function findSkills(root = SKILLS_DIR) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (!statSync(p).isDirectory()) continue;
      const skillFile = join(p, "SKILL.md");
      if (existsSync(skillFile)) {
        const text = readFileSync(skillFile, "utf8");
        const fm = parseFrontmatter(text);
        found.push({
          name: fm.name || entry,
          dirName: entry,
          description: fm.description || "",
          path: p,
          relPath: relative(root, p),
        });
      } else {
        walk(p);
      }
    }
  };
  walk(root);
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Install one skill for a host.
 * Nested category directories flatten to a single level, which is why build.mjs
 * rejects duplicate directory names.
 */
export function installSkill(skill, { host, scope, dryRun = false }) {
  const hostDir = HOSTS[host].skillsDir(scope);
  const dest = join(hostDir, skill.dirName);
  if (dryRun) return dest;

  mkdirSync(hostDir, { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  const adapterDir = host === "codex" ? CODEX_ADAPTER_DIR : CLAUDE_ADAPTER_DIR;
  const override = join(adapterDir, "overrides", skill.dirName);
  const source = existsSync(override) ? override : skill.path;
  cpSync(source, dest, { recursive: true });
  adaptCopiedSkillTree(dest, {
    host,
    skillNames: findSkills().map((item) => item.name),
    allowImplicitInvocation: !readFileSync(join(skill.path, "SKILL.md"), "utf8").includes("disable-model-invocation: true"),
    nativeCodex: source === override,
  });
  return dest;
}

export function installAgents({ host, scope, dryRun = false }) {
  const dir = HOSTS[host].agentsDir(scope);
  const sourceDir = host === "codex" ? join(CODEX_ADAPTER_DIR, "agents") : AGENTS_DIR;
  const extension = host === "codex" ? ".toml" : ".md";
  if (!dir || !existsSync(sourceDir)) return null;
  if (dryRun) return dir;
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(sourceDir).filter((f) => f.endsWith(extension))) {
    cpSync(join(sourceDir, f), join(dir, f));
  }
  return dir;
}

const MEMORY_START = "<!-- pstack:start -->";
const MEMORY_END = "<!-- pstack:end -->";

/** The managed block pstack owns inside CLAUDE.md / AGENTS.md. Everything else in the file is the user's. */
export function memoryBlock({ host }) {
  const h = HOSTS[host];
  const projectSkills = host === "codex" ? ".agents/skills/" : ".claude/skills/";
  return [
    MEMORY_START,
    "## pstack",
    "",
    `- 使用当前项目指定的技能副本；存在同名技能时，优先使用项目级 \`${projectSkills}\`，缺少时再使用用户级 \`~/${projectSkills}\`，不重复加载两份。`,
    `- 仅在用户明确启用 \`${h.invoke("poteto-mode")}\` 时进入完整流程，授权限于当前任务。只有技能需要角色模型配置时才读取 \`${h.modelConfig}\`。`,
    MEMORY_END,
  ].join("\n");
}

// Recognize top-level blocks and sections without treating fenced examples as instructions.
function memoryLayout(text) {
  const blocks = [];
  const sections = [];
  let blockStart = null;
  let section = null;
  let fence = null;
  for (const match of text.matchAll(/[^\n]*(?:\n|$)/g)) {
    if (!match[0]) continue;
    const line = match[0].trimEnd();
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && !fenceMatch[2].trim()) fence = null;
      continue;
    }
    if (fenceMatch) { fence = fenceMatch[1]; continue; }
    if (line === MEMORY_START) {
      if (blockStart !== null) throw new Error("Nested pstack memory markers; repair the markers or use --no-memory.");
      if (section) section.end = match.index;
      section = null;
      blockStart = match.index;
    } else if (line === MEMORY_END) {
      if (blockStart === null) throw new Error("Unmatched pstack memory end marker; repair the markers or use --no-memory.");
      blocks.push({ start: blockStart, end: match.index + line.length });
      blockStart = null;
    }
    if (/^ {0,3}#{1,2}\s/.test(line)) {
      if (section) section.end = match.index;
      section = /^ {0,3}##\s+pstack(?:\s+#+)?\s*$/i.test(line)
        ? { start: match.index, bodyStart: match.index + match[0].length, end: text.length }
        : null;
      if (section) sections.push(section);
    }
  }
  if (blockStart !== null) throw new Error("Unmatched pstack memory start marker; repair the markers or use --no-memory.");
  return { blocks, sections: sections.filter((s) => !blocks.some((b) => s.start >= b.start && s.start < b.end)) };
}

function isLegacyMemory(body, host) {
  const normalized = body.trim().replace(/\r\n/g, "\n");
  const current = memoryBlock({ host }).split("\n").slice(3, -1).join("\n");
  if (normalized === current) return true;
  const h = HOSTS[host];
  const lines = normalized.split("\n").filter((line) => line.trim());
  const prefix = /^pstack 技能位于 `[^`\n]+`。/.exec(lines[0] || "")?.[0];
  return lines.length === 2
    && prefix !== undefined
    && lines[0] === `${prefix}用户明确启用 \`${h.invoke("poteto-mode")}\` 时才进入完整流程，授权仅限当前任务。`
    && lines[1] === `技能需要角色模型配置时读取 \`${h.modelConfig}\`。`;
}

/**
 * Write the managed block into the host's memory file, replacing an earlier one so
 * reinstalls stay idempotent. Returns the path, or null when nothing changed.
 */
export function writeMemory({ host, scope, skills = [], dryRun = false }) {
  const file = HOSTS[host].memoryFile(scope);
  const block = memoryBlock({ host, scope, skills });
  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  const { blocks, sections } = memoryLayout(existing);
  const ranges = [...blocks];
  for (const section of sections) {
    const body = existing.slice(section.bodyStart, section.end);
    if (!isLegacyMemory(body, host)) {
      throw new Error(`Custom ## pstack section in ${file}; keep it with --no-memory or merge it manually before using --memory.`);
    }
    ranges.push({ start: section.start, end: section.start + existing.slice(section.start, section.end).trimEnd().length });
  }
  ranges.sort((a, b) => a.start - b.start);

  let next;
  if (ranges.length) {
    next = existing;
    for (let i = ranges.length - 1; i >= 0; i--) {
      const { start, end } = ranges[i];
      next = next.slice(0, start) + (i === 0 ? block : "") + next.slice(end);
    }
  } else {
    next = existing.trimEnd();
    next = next ? `${next}\n\n${block}\n` : `${block}\n`;
  }
  if (next === existing) return null;
  if (dryRun) return file;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, next);
  return file;
}

/** Whether the host's memory file already carries a pstack block. */
export function hasMemory({ host, scope }) {
  const file = HOSTS[host].memoryFile(scope);
  return existsSync(file) && memoryLayout(readFileSync(file, "utf8")).blocks.length > 0;
}

/** Drop the managed block, leaving the rest of the file untouched. */
export function removeMemory({ host, scope, dryRun = false }) {
  const file = HOSTS[host].memoryFile(scope);
  if (!existsSync(file)) return null;
  const existing = readFileSync(file, "utf8");
  const { blocks } = memoryLayout(existing);
  if (!blocks.length) return null;
  let next = existing;
  for (const { start, end } of blocks.reverse()) next = next.slice(0, start) + next.slice(end);
  next = next.trim();
  if (dryRun) return file;
  writeFileSync(file, next ? next + "\n" : "");
  return file;
}

export function expandSkillDependencies(selected, catalog = findSkills()) {
  const selectedNames = new Set(selected.map((skill) => skill.name));
  const queued = [...selected];

  const readMarkdown = (dir) => {
    let body = "";
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules") continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) body += readMarkdown(path);
      else if (path.endsWith(".md")) body += `\n${readFileSync(path, "utf8")}`;
    }
    return body;
  };

  while (queued.length) {
    const current = queued.shift();
    const body = readMarkdown(current.path);
    for (const candidate of catalog) {
      if (selectedNames.has(candidate.name)) continue;
      const escaped = candidate.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, "i").test(body)) continue;
      selectedNames.add(candidate.name);
      queued.push(candidate);
    }
  }

  return catalog.filter((skill) => selectedNames.has(skill.name));
}

/** Installed pstack skills in one host dir, each tagged with whether it is a symlink. */
export function listInstalled({ host, scope }) {
  const dir = HOSTS[host].skillsDir(scope);
  if (!existsSync(dir)) return [];
  const ours = new Set(findSkills().map((s) => s.dirName));
  return readdirSync(dir)
    .filter((d) => ours.has(d) && existsSync(join(dir, d, "SKILL.md")))
    .map((d) => {
      const p = join(dir, d);
      let linkedTo = null;
      try { if (lstatSync(p).isSymbolicLink()) linkedTo = realpathSync(p); } catch {}
      return { name: d, path: p, linkedTo };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Remove a skill from one host. lstat, not exists, so a symlink left dangling by an
 * earlier removal still gets cleared.
 */
export function removeSkill(dirName, { host, scope, dryRun = false }) {
  const dest = join(HOSTS[host].skillsDir(scope), dirName);
  try { lstatSync(dest); } catch { return null; }
  if (!dryRun) rmSync(dest, { recursive: true, force: true });
  return dest;
}

/** The curated entry set. Installation expands its transitive skill references. */
export const CORE_SKILLS = [
  "poteto-mode",
  "setup-pstack",
  "how",
  "why",
  "architect",
  "interrogate",
  "unslop",
  "no-comments",
  "technical-writing",
  "tdd",
];
