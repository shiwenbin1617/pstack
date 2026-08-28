#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORE_SKILLS,
  REPO_ROOT,
  detectHosts,
  expandSkillDependencies,
  findSkills,
  hasMemory,
  installAgents,
  installSkill,
  removeMemory,
  writeMemory,
} from "./lib.mjs";
import { findWorkspaceTranscripts, normalizeWorkspacePath } from "../skills/recall/scripts/find-transcripts.mjs";
import { appendDecision } from "../skills/show-me-your-work/scripts/log.mjs";
import {
  auditWorktrees,
  executeCommand as executeAuditCommand,
  renderAudit,
} from "../skills/poteto-mode/scripts/worktree-audit.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packSmoke = process.argv.includes("--pack-smoke");
if (!packSmoke) {
  const check = spawnSync(process.execPath, [join(scriptsDir, "build.mjs")], {
    encoding: "utf8",
  });
  assert.equal(check.status, 0, check.stderr || check.stdout);

  const planCheck = spawnSync(process.execPath, ["--check", join(REPO_ROOT, "skills", "poteto-mode", "scripts", "check-plan.mjs")], {
    encoding: "utf8",
  });
  assert.equal(planCheck.status, 0, planCheck.stderr || planCheck.stdout);
}

function markdownUnder(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules") continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".md")) files.push(path);
    }
  };
  walk(root);
  return files;
}

function runChecked(file, args, options = {}) {
  const result = spawnSync(file, args, { encoding: "utf8", ...options });
  assert.equal(result.status, 0, result.stderr || result.stdout || `${file} failed`);
  return result.stdout;
}

function runGit(repo, args) {
  return runChecked("git", ["-C", repo, ...args]);
}

function runPackSmoke() {
  const npmCli = process.env.npm_execpath;
  assert(npmCli, "run the pack smoke through npm so npm_execpath is available");
  const smokeRoot = mkdtempSync(join(tmpdir(), "pstack pack smoke "));
  try {
    const npmEnv = { ...process.env, npm_config_cache: join(smokeRoot, "npm cache") };
    const packDir = join(smokeRoot, "packed artifact");
    const project = join(smokeRoot, "project with spaces");
    mkdirSync(packDir, { recursive: true });
    mkdirSync(project, { recursive: true });
    writeFileSync(join(project, "package.json"), '{"name":"pstack-smoke","private":true}\n');

    const packed = JSON.parse(runChecked(
      process.execPath,
      [npmCli, "pack", "--json", "--pack-destination", packDir],
      { cwd: REPO_ROOT, env: npmEnv },
    ));
    const tarball = join(packDir, packed[0].filename);
    runChecked(
      process.execPath,
      [npmCli, "install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
      { cwd: project, env: npmEnv },
    );

    const shim = join(project, "node_modules", ".bin", process.platform === "win32" ? "pstack.cmd" : "pstack");
    const pstack = (args) => runChecked(shim, args, {
      cwd: project,
      shell: process.platform === "win32",
      env: { ...process.env, NO_COLOR: "1" },
    });
    pstack(["add", "--core", "--host", "codex", "--scope", "project", "--memory", "-y"]);
    const installedSkills = join(project, ".agents", "skills");
    const installedAudit = join(installedSkills, "poteto-mode", "scripts", "worktree-audit.mjs");
    const installedLog = join(installedSkills, "show-me-your-work", "scripts", "log.mjs");
    const installedTranscripts = join(installedSkills, "recall", "scripts", "find-transcripts.mjs");
    assert(existsSync(installedAudit));
    assert(existsSync(installedLog));
    assert(existsSync(installedTranscripts));
    runChecked(process.execPath, [installedAudit, "--help"], { cwd: project });
    runChecked(process.execPath, [installedTranscripts, "--help"], { cwd: project });
    const installedLogFile = join(project, "helper smoke", "decisions.tsv");
    runChecked(
      process.execPath,
      [installedLog, installedLogFile, "pack", "installed helper", "real artifact", "npm pack", "passed"],
      { cwd: project },
    );
    assert.match(readFileSync(installedLogFile, "utf8"), /installed helper/);
    pstack(["list", "--host", "codex", "--scope", "project"]);
    pstack(["doctor", "--host", "codex", "--scope", "project"]);
    pstack(["update", "--host", "codex", "--scope", "project", "-y"]);
    const installed = readdirSync(installedSkills);
    pstack(["remove", ...installed, "--host", "codex", "--scope", "project", "-y"]);
    assert.equal(readdirSync(join(project, ".agents", "skills")).length, 0);
    assert.doesNotMatch(readFileSync(join(project, "AGENTS.md"), "utf8"), /pstack:start/);
  } finally {
    rmSync(smokeRoot, { recursive: true, force: true });
  }
}

if (packSmoke) {
  runPackSmoke();
  console.log("packed installation smoke passed");
  process.exit(0);
}

const testRoot = mkdtempSync(join(tmpdir(), "pstack-host-isolation-"));
const originalCwd = process.cwd();

try {
  process.chdir(testRoot);

  const virtualHome = join(testRoot, "virtual home");
  const detectedPaths = new Set([join(virtualHome, ".codex")]);
  assert.deepEqual(
    detectHosts({ homeDir: virtualHome, pathExists: (path) => detectedPaths.has(path) }),
    ["codex"],
  );

  const transcriptHome = join(testRoot, "transcript home");
  const workspace = join(testRoot, "workspace with spaces");
  const otherWorkspace = join(testRoot, "other workspace");
  mkdirSync(workspace, { recursive: true });
  const claudeTranscripts = join(transcriptHome, ".claude", "projects", "sessions");
  const codexTranscripts = join(transcriptHome, ".codex", "sessions", "2026", "08", "27");
  mkdirSync(claudeTranscripts, { recursive: true });
  mkdirSync(codexTranscripts, { recursive: true });
  const olderTranscript = join(claudeTranscripts, "older.jsonl");
  const newerTranscript = join(claudeTranscripts, "newer.jsonl");
  writeFileSync(olderTranscript, `${JSON.stringify({ type: "user", cwd: workspace })}\n`);
  writeFileSync(newerTranscript, `${JSON.stringify({ cwd: workspace, type: "assistant" })}\n`);
  writeFileSync(join(claudeTranscripts, "other.jsonl"), `${JSON.stringify({ cwd: otherWorkspace })}\n`);
  writeFileSync(
    join(codexTranscripts, "rollout-test.jsonl"),
    `${JSON.stringify({ type: "session_meta", payload: { cwd: workspace } })}\n`,
  );
  utimesSync(olderTranscript, new Date(1_000), new Date(1_000));
  utimesSync(newerTranscript, new Date(2_000), new Date(2_000));

  const claudeMatches = await findWorkspaceTranscripts({
    host: "claude",
    workspace,
    homeDir: transcriptHome,
  });
  assert.deepEqual(claudeMatches.map((match) => match.path), [newerTranscript, olderTranscript]);
  assert.equal((await findWorkspaceTranscripts({ host: "codex", workspace, homeDir: transcriptHome })).length, 1);
  assert.equal((await findWorkspaceTranscripts({ host: "claude", workspace, homeDir: transcriptHome, limit: 1 })).length, 1);
  assert.equal(
    normalizeWorkspacePath("C:\\Work\\Repo"),
    normalizeWorkspacePath("c:/work/repo"),
  );

  const logFile = join(testRoot, "decision logs", "decisions.tsv");
  await appendDecision(logFile, {
    phase: "port",
    decision: "keep\tone row",
    why: "cross\nplatform",
    evidence: "=unsafe",
    result: "open",
  }, new Date("2026-08-27T01:02:03Z"));
  await appendDecision(logFile, {
    phase: "verify",
    decision: "run twice",
    why: "header stays single",
    evidence: "test",
    result: "passed",
  }, new Date("2026-08-27T02:03:04Z"));
  const decisionLines = readFileSync(logFile, "utf8").trimEnd().split("\n");
  assert.equal(decisionLines.length, 3);
  assert.equal(decisionLines[0], "ts\tphase\tdecision\twhy\tevidence\tresult");
  assert.match(decisionLines[1], /keep one row\tcross platform\t'=unsafe/);

  const auditRepo = join(testRoot, "audit repo");
  const auditWorktree = join(testRoot, "audit worktree with spaces");
  mkdirSync(auditRepo);
  runGit(auditRepo, ["init", "--initial-branch=main"]);
  runGit(auditRepo, ["config", "user.name", "Pstack Test"]);
  runGit(auditRepo, ["config", "user.email", "pstack@example.com"]);
  writeFileSync(join(auditRepo, "tracked.txt"), "base\n");
  runGit(auditRepo, ["add", "."]);
  runGit(auditRepo, ["commit", "-m", "base"]);
  runGit(auditRepo, ["branch", "audit-feature"]);
  runGit(auditRepo, ["worktree", "add", auditWorktree, "audit-feature"]);
  const auditTranscript = join(claudeTranscripts, "audit.jsonl");
  writeFileSync(auditTranscript, `${JSON.stringify({ cwd: auditWorktree })}\n`);
  const auditNow = Date.parse("2026-08-27T12:00:00Z");
  utimesSync(auditTranscript, new Date(auditNow - 60_000), new Date(auditNow - 60_000));
  const auditRun = (spec) => spec.file === "gh"
    ? {
        exitCode: 0,
        stdout: JSON.stringify([{ number: 42, state: "OPEN", headRefName: "audit-feature" }]),
        stderr: "",
      }
    : executeAuditCommand(spec);
  let auditRows = await auditWorktrees({
    repo: auditRepo,
    host: "claude",
    homeDir: transcriptHome,
    nowMs: auditNow,
    run: auditRun,
  });
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].dirty.kind, "clean");
  assert.deepEqual(auditRows[0].pullRequest, { kind: "known", number: 42, state: "OPEN" });
  assert.equal(auditRows[0].bucket, "hold-open-pr");
  assert.match(renderAudit(auditRows), /hold-open-pr.*audit worktree with spaces/);
  writeFileSync(join(auditWorktree, "tracked.txt"), "changed\n");
  auditRows = await auditWorktrees({
    repo: auditRepo,
    host: "claude",
    homeDir: transcriptHome,
    nowMs: auditNow,
    run: auditRun,
  });
  assert.equal(auditRows[0].dirty.kind, "wip");
  assert.equal(auditRows[0].bucket, "hold-wip");

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

  const claudeAudit = readFileSync(join(claudeRoot, "poteto-mode", "scripts", "worktree-audit.mjs"), "utf8");
  const codexAudit = readFileSync(join(codexRoot, "poteto-mode", "scripts", "worktree-audit.mjs"), "utf8");
  assert.equal(claudeAudit, codexAudit);
  assert(existsSync(join(claudeRoot, "recall", "scripts", "find-transcripts.mjs")));
  assert(existsSync(join(codexRoot, "recall", "scripts", "find-transcripts.mjs")));
  const claudeCleanup = readFileSync(join(claudeRoot, "poteto-mode", "playbooks", "worktree-cleanup.md"), "utf8");
  const codexCleanup = readFileSync(join(codexRoot, "poteto-mode", "playbooks", "worktree-cleanup.md"), "utf8");
  assert.match(claudeCleanup, /--host claude/);
  assert.match(codexCleanup, /--host codex/);

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
