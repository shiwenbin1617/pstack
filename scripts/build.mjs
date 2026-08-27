#!/usr/bin/env node
/**
 * Build the per-host trees from the single source in `skills/`, and validate them.
 *
 *   node scripts/build.mjs          → dist/claude-code/ and dist/codex/
 *   node scripts/build.mjs --check  → validate only, write nothing
 *
 * The two trees share method content but compile host-specific metadata, paths,
 * invocations, agent definitions, and runtime vocabulary.
 */
import { mkdirSync, rmSync, cpSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, SKILLS_DIR, AGENTS_DIR, CODEX_ADAPTER_DIR, CLAUDE_ADAPTER_DIR, findSkills } from "./lib.mjs";
import { adaptCopiedSkillTree, adaptMarkdownForHost } from "./host-adapters.mjs";

const check = process.argv.includes("--check");
const DIST = join(REPO_ROOT, "dist");
const skills = findSkills();
const CODEX_AGENTS_CONTENT = `# pstack

These skills are installed under \`.agents/skills/\`. Invoke one with \`$<name>\`, for example \`$poteto-mode\`.

Invoke \`$poteto-mode\` for a non-trivial task that needs the pstack workflow. Invoke it again for a later
task because mode activation is explicit and scoped to one task. Run \`$setup-pstack\` only to override models.

Custom subagents are standalone TOML files under \`.codex/agents/\` or \`~/.codex/agents/\`.
`;

/* ---------- validate ---------- */

const problems = [];
for (const s of skills) {
  if (!s.description) problems.push(`${s.relPath}: SKILL.md has no \`description\` frontmatter; it will never trigger`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name)) problems.push(`${s.relPath}: name "${s.name}" is not a kebab-case slug`);
  if (s.name !== s.dirName) problems.push(`${s.relPath}: frontmatter name "${s.name}" does not match its directory "${s.dirName}"`);
  if (s.description.length > 1024) problems.push(`${s.relPath}: description is ${s.description.length} chars; Codex trims long ones first`);
}
const dupes = skills.map((s) => s.dirName).filter((n, i, a) => a.indexOf(n) !== i);
if (dupes.length) problems.push(`duplicate skill directory names, which collide when flattened: ${[...new Set(dupes)].join(", ")}`);

// Every relative markdown link inside a skill must resolve.
const brokenLinks = [];
for (const s of skills) {
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!p.endsWith(".md")) continue;
      const body = readFileSync(p, "utf8");
      for (const m of body.matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)) {
        const target = m[1].split("#")[0];
        // Skip template placeholders like [PR #123](url) and [x]({path}).
        if (!target || target.startsWith("{") || !/[./]/.test(target)) continue;
        try { statSync(join(dir, target)); }
        catch { brokenLinks.push(`${s.name}: ${p.replace(REPO_ROOT + "/", "")} → ${target}`); }
      }
    }
  };
  walk(s.path);
}

const codexLeaks = [];
const claudeLeaks = [];
const runtimeLeaks = [];
const skillNames = skills.map((skill) => skill.name);
const CODEX_LEAK_PATTERNS = [
  [/\.claude\//, "Claude path"],
  [/Claude Code/, "Claude host name"],
  [/Task tool/, "Claude/Cursor Task tool"],
  [/subagent_type:/, "Claude subagent type"],
  [/run_in_background/, "Claude background argument"],
  [/AskQuestion|AskUserQuestion/, "host-specific question tool"],
];
const CLAUDE_LEAK_PATTERNS = [
  [/\.codex\//, "Codex path"],
  [/\.agents\/skills/, "Codex skill path"],
  [/\$[a-z][a-z0-9-]+/, "Codex skill invocation"],
];
const RUNTIME_LEAK_PATTERNS = [
  [/\.cursor\/projects/, "Cursor transcript path"],
  [/\bgrok-[a-z0-9.-]+/i, "hard-coded model slug"],
  [/Bun\.spawnSync\([\s\S]{0,200}["']install["']/, "implicit package installation"],
];
for (const [pattern, why] of CODEX_LEAK_PATTERNS) {
  const match = pattern.exec(CODEX_AGENTS_CONTENT);
  if (match) codexLeaks.push(`generated Codex AGENTS.md: ${why} (${match[0]})`);
}

for (const s of skills) {
  const override = join(CODEX_ADAPTER_DIR, "overrides", s.dirName);
  const nativeCodex = Boolean(statOrNull(override));
  const source = nativeCodex ? override : s.path;
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!p.endsWith(".md")) continue;
      const raw = readFileSync(p, "utf8");
      const body = nativeCodex ? raw : adaptMarkdownForHost(raw, { host: "codex", skillNames });
      for (const [pat, why] of CODEX_LEAK_PATTERNS) {
        const m = pat.exec(body);
        if (m) codexLeaks.push(`${p.replace(REPO_ROOT + "/", "")}: ${why} (${m[0]})`);
      }
    }
  };
  walk(source);
}

const runtimeDir = join(SKILLS_DIR, "poteto-mode", "scripts");
const scanRuntime = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      scanRuntime(path);
      continue;
    }
    const body = readFileSync(path, "utf8");
    for (const [pattern, why] of RUNTIME_LEAK_PATTERNS) {
      const match = pattern.exec(body);
      if (match) runtimeLeaks.push(`${path.replace(REPO_ROOT + "/", "")}: ${why} (${match[0]})`);
    }
  }
};
scanRuntime(runtimeDir);

for (const s of skills) {
  const override = join(CLAUDE_ADAPTER_DIR, "overrides", s.dirName);
  const nativeClaude = Boolean(statOrNull(override));
  const source = nativeClaude ? override : s.path;
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!p.endsWith(".md")) continue;
      const raw = readFileSync(p, "utf8");
      const body = nativeClaude ? raw : adaptMarkdownForHost(raw, { host: "claude", skillNames });
      for (const [pat, why] of CLAUDE_LEAK_PATTERNS) {
        const m = pat.exec(body);
        if (m) claudeLeaks.push(`${p.replace(REPO_ROOT + "/", "")}: ${why} (${m[0]})`);
      }
    }
  };
  walk(source);
}

function statOrNull(path) {
  try { return statSync(path); } catch { return null; }
}

const report = (label, list) => {
  if (!list.length) return false;
  console.error(`\n${label}`);
  list.forEach((p) => console.error(`  - ${p}`));
  return true;
};

let failed = false;
failed = report("problems:", problems) || failed;
failed = report("broken relative links:", brokenLinks) || failed;
failed = report("Claude-specific leaks in generated Codex skills:", codexLeaks) || failed;
failed = report("Codex-specific leaks in generated Claude Code skills:", claudeLeaks) || failed;
failed = report("Host/model leaks in shared runtime scripts:", runtimeLeaks) || failed;

console.log(`checked ${skills.length} skills`);
if (failed) process.exit(1);
if (check) { console.log("ok"); process.exit(0); }

/* ---------- emit ---------- */

rmSync(DIST, { recursive: true, force: true });

// Claude Code: a host-native skills and agents tree.
const cc = join(DIST, "claude-code");
mkdirSync(cc, { recursive: true });
cpSync(SKILLS_DIR, join(cc, "skills"), { recursive: true });
cpSync(AGENTS_DIR, join(cc, "agents"), { recursive: true });
for (const s of skills) {
  const dest = join(cc, "skills", s.dirName);
  const override = join(CLAUDE_ADAPTER_DIR, "overrides", s.dirName);
  const nativeClaude = Boolean(statOrNull(override));
  if (nativeClaude) {
    rmSync(dest, { recursive: true, force: true });
    cpSync(override, dest, { recursive: true });
  }
  adaptCopiedSkillTree(dest, {
    host: "claude",
    skillNames,
    allowImplicitInvocation: true,
    nativeCodex: nativeClaude,
  });
}

// Codex: the same content, flattened into .agents/skills.
const cx = join(DIST, "codex", ".agents", "skills");
mkdirSync(cx, { recursive: true });
for (const s of skills) cpSync(s.path, join(cx, s.dirName), { recursive: true });
for (const s of skills) {
  const dest = join(cx, s.dirName);
  const override = join(CODEX_ADAPTER_DIR, "overrides", s.dirName);
  if (statOrNull(override)) {
    rmSync(dest, { recursive: true, force: true });
    cpSync(override, dest, { recursive: true });
  }
  adaptCopiedSkillTree(dest, {
    host: "codex",
    skillNames,
    allowImplicitInvocation: !readFileSync(join(s.path, "SKILL.md"), "utf8").includes("disable-model-invocation: true"),
    nativeCodex: Boolean(statOrNull(override)),
  });
}

const codexAgents = join(DIST, "codex", ".codex", "agents");
mkdirSync(codexAgents, { recursive: true });
cpSync(join(CODEX_ADAPTER_DIR, "agents"), codexAgents, { recursive: true });

writeFileSync(join(DIST, "codex", "AGENTS.md"), CODEX_AGENTS_CONTENT);

console.log(`built independent dist/claude-code and dist/codex host trees`);
