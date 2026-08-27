import { readdirSync, readFileSync, statSync, lstatSync, mkdirSync, rmSync, cpSync, existsSync, realpathSync } from "node:fs";
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
    invoke: (name) => `/${name}`,
  },
  codex: {
    label: "Codex",
    skillsDir: (scope) => (scope === "project" ? join(process.cwd(), ".agents", "skills") : join(homedir(), ".agents", "skills")),
    agentsDir: (scope) => (scope === "project" ? join(process.cwd(), ".codex", "agents") : join(homedir(), ".codex", "agents")),
    memoryFile: (scope) => (scope === "project" ? join(process.cwd(), "AGENTS.md") : join(homedir(), ".codex", "AGENTS.md")),
    invoke: (name) => `$${name}`,
  },
};

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

export function expandSkillDependencies(selected, catalog = findSkills()) {
  const selectedNames = new Set(selected.map((skill) => skill.name));
  const queued = [...selected];

  const readMarkdown = (dir) => {
    let body = "";
    for (const entry of readdirSync(dir)) {
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
