#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORE_SKILLS,
  REPO_ROOT,
  expandSkillDependencies,
  findSkills,
  hasMemory,
  installAgents,
  installSkill,
  removeMemory,
  writeMemory,
} from "./lib.mjs";
import { writeFileSync } from "node:fs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const check = spawnSync(process.execPath, [join(scriptsDir, "build.mjs")], {
  encoding: "utf8",
});
assert.equal(check.status, 0, check.stderr || check.stdout);

const shellCheck = spawnSync("bash", ["-n", join(REPO_ROOT, "skills", "poteto-mode", "scripts", "worktree-audit.sh")], {
  encoding: "utf8",
});
assert.equal(shellCheck.status, 0, shellCheck.stderr || shellCheck.stdout);

const planCheck = spawnSync(process.execPath, ["--check", join(REPO_ROOT, "skills", "poteto-mode", "scripts", "check-plan.mjs")], {
  encoding: "utf8",
});
assert.equal(planCheck.status, 0, planCheck.stderr || planCheck.stdout);

const testRoot = mkdtempSync(join(tmpdir(), "pstack-host-isolation-"));
const originalCwd = process.cwd();

function markdownUnder(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".md")) files.push(path);
    }
  };
  walk(root);
  return files;
}

try {
  process.chdir(testRoot);
  const catalog = findSkills();
  const requested = catalog.filter((skill) => CORE_SKILLS.includes(skill.name));
  const selected = expandSkillDependencies(requested, catalog);
  assert(selected.length > requested.length, "core entries must expand their skill dependencies");

  for (const host of ["claude", "codex"]) {
    for (const skill of selected) installSkill(skill, { host, scope: "project" });
    installAgents({ host, scope: "project" });
  }

  const claudeRoot = join(testRoot, ".claude", "skills");
  const codexRoot = join(testRoot, ".agents", "skills");
  const claudeMode = join(claudeRoot, "poteto-mode", "SKILL.md");
  const codexMode = join(codexRoot, "poteto-mode", "SKILL.md");

  assert(!lstatSync(join(claudeRoot, "poteto-mode")).isSymbolicLink());
  assert(!lstatSync(join(codexRoot, "poteto-mode")).isSymbolicLink());
  assert.notEqual(statSync(claudeMode).ino, statSync(codexMode).ino);
  assert(existsSync(join(testRoot, ".claude", "agents", "comment-sicko.md")));
  assert(existsSync(join(testRoot, ".codex", "agents", "comment-sicko.toml")));
  assert(existsSync(join(codexRoot, "poteto-mode", "agents", "openai.yaml")));

  const claudeAudit = readFileSync(join(claudeRoot, "poteto-mode", "scripts", "worktree-audit.sh"), "utf8");
  const codexAudit = readFileSync(join(codexRoot, "poteto-mode", "scripts", "worktree-audit.sh"), "utf8");
  assert.doesNotMatch(claudeAudit, /\.codex\/sessions/);
  assert.doesNotMatch(codexAudit, /\.claude\/projects/);

  for (const path of markdownUnder(claudeRoot)) {
    const body = readFileSync(path, "utf8");
    assert(!/\.codex\/|\.agents\/skills|\$[a-z][a-z0-9-]+/.test(body), `Codex leak in ${path}`);
  }
  for (const path of markdownUnder(codexRoot)) {
    const body = readFileSync(path, "utf8");
    assert(!/\.claude\/|Claude Code|Task tool|subagent_type:|run_in_background|AskQuestion/.test(body), `Claude leak in ${path}`);
  }

  const claudeSetup = readFileSync(join(claudeRoot, "setup-pstack", "SKILL.md"), "utf8");
  const codexSetup = readFileSync(join(codexRoot, "setup-pstack", "SKILL.md"), "utf8");
  assert.match(claudeSetup, /~\/\.claude\/pstack-models\.md/);
  assert.match(codexSetup, /~\/\.codex\/pstack-models\.md/);
  assert.doesNotMatch(claudeSetup, /~\/\.codex/);
  assert.doesNotMatch(codexSetup, /~\/\.claude/);

  // The memory block appends to whatever the user already wrote, and rewrites in place.
  const claudeMemory = join(testRoot, "CLAUDE.md");
  const codexMemory = join(testRoot, "AGENTS.md");
  writeFileSync(claudeMemory, "# House rules\n\nRun the linter.\n");

  for (const host of ["claude", "codex"]) {
    assert.equal(hasMemory({ host, scope: "project" }), false);
    writeMemory({ host, scope: "project", skills: selected });
    assert.equal(hasMemory({ host, scope: "project" }), true);
    assert.equal(writeMemory({ host, scope: "project", skills: selected }), null, "rewriting the same block is a no-op");
  }

  const claudeBody = readFileSync(claudeMemory, "utf8");
  assert.match(claudeBody, /Run the linter\./);
  assert.match(claudeBody, /\/poteto-mode/);
  assert.match(claudeBody, /~\/\.claude\/pstack-models\.md/);
  assert.equal(claudeBody.match(/pstack:start/g).length, 1);

  const codexBody = readFileSync(codexMemory, "utf8");
  assert.match(codexBody, /\$poteto-mode/);
  assert.doesNotMatch(codexBody, /\.claude|Claude Code/);

  removeMemory({ host: "claude", scope: "project" });
  assert.equal(hasMemory({ host: "claude", scope: "project" }), false);
  assert.equal(readFileSync(claudeMemory, "utf8"), "# House rules\n\nRun the linter.\n");
} finally {
  process.chdir(originalCwd);
  rmSync(testRoot, { recursive: true, force: true });
}

console.log("host isolation and installation checks passed");
