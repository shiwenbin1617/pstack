#!/usr/bin/env node
import { lstat, readdir } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findWorkspaceTranscripts } from "../../recall/scripts/find-transcripts.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

/** @typedef {{ kind: "clean" } | { kind: "scratch", files: string[] } | { kind: "wip", files: string[] }} DirtyState */
/** @typedef {{ kind: "detached" } | { kind: "pushed" } | { kind: "no-remote" } | { kind: "ahead", aheadBy: number }} RemoteState */
/** @typedef {{ kind: "none" } | { kind: "known", number: number, state: "OPEN" | "CLOSED" | "MERGED" }} PullRequestState */

export function executeCommand({ file, args, cwd, env = process.env }) {
  const result = spawnSync(file, args, { cwd, env, encoding: "utf8", windowsHide: true });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function command(run, file, args, cwd) {
  return run({ file, args, cwd });
}

function parseWorktrees(raw) {
  const rows = [];
  let current = null;
  for (const field of raw.split("\0")) {
    if (field === "") {
      if (current !== null) rows.push(current);
      current = null;
      continue;
    }
    const separator = field.indexOf(" ");
    const key = separator === -1 ? field : field.slice(0, separator);
    const value = separator === -1 ? "" : field.slice(separator + 1);
    if (key === "worktree") current = { path: value, head: "", branch: null };
    else if (current !== null && key === "HEAD") current.head = value;
    else if (current !== null && key === "branch") current.branch = value.replace(/^refs\/heads\//, "");
  }
  return rows;
}

function parsePullRequests(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return new Map();
  }
  if (!Array.isArray(value)) return new Map();
  const pullRequests = new Map();
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    if (typeof item.headRefName !== "string" || !Number.isSafeInteger(item.number)) continue;
    if (item.state !== "OPEN" && item.state !== "CLOSED" && item.state !== "MERGED") continue;
    if (!pullRequests.has(item.headRefName)) {
      pullRequests.set(item.headRefName, { kind: "known", number: item.number, state: item.state });
    }
  }
  return pullRequests;
}

/** @returns {DirtyState} */
function dirtyState(raw) {
  const entries = raw.split("\0").filter(Boolean);
  const files = [];
  let hasTrackedChanges = false;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.length < 3) continue;
    const status = entry.slice(0, 2);
    files.push(entry.slice(3));
    if (status !== "??") hasTrackedChanges = true;
    if (/[RC]/.test(status)) index += 1;
  }
  if (files.length === 0) return { kind: "clean" };
  return hasTrackedChanges ? { kind: "wip", files } : { kind: "scratch", files };
}

/** @returns {RemoteState} */
function remoteState({ run, worktree, branch, head }) {
  if (branch === null) return { kind: "detached" };
  const remote = `refs/remotes/origin/${branch}`;
  if (command(run, "git", ["show-ref", "--verify", "--quiet", remote], worktree).exitCode !== 0) {
    return { kind: "no-remote" };
  }
  const remoteHead = command(run, "git", ["rev-parse", remote], worktree);
  if (remoteHead.exitCode === 0 && remoteHead.stdout.trim() === head) return { kind: "pushed" };
  const ahead = command(run, "git", ["rev-list", "--count", `${remote}..HEAD`], worktree);
  const aheadBy = Number.parseInt(ahead.stdout.trim(), 10);
  return { kind: "ahead", aheadBy: Number.isSafeInteger(aheadBy) ? aheadBy : 0 };
}

function bucketFor({ dirty, pullRequest, merged, lastChatAtMs, nowMs }) {
  if (dirty.kind === "wip") return "hold-wip";
  if (pullRequest.kind === "known" && pullRequest.state === "OPEN") return "hold-open-pr";
  if (lastChatAtMs !== null && nowMs - lastChatAtMs <= 4 * DAY_MS) return "verify-recent-chat";
  if (merged || pullRequest.kind === "known") return "safe";
  return "review";
}

async function directorySize(path) {
  let info;
  try {
    info = await lstat(path);
  } catch {
    return 0;
  }
  if (!info.isDirectory()) return info.size;
  let entries;
  try {
    entries = await readdir(path);
  } catch {
    return info.size;
  }
  const sizes = await Promise.all(entries.map((entry) => directorySize(resolve(path, entry))));
  return info.size + sizes.reduce((sum, size) => sum + size, 0);
}

export async function auditWorktrees({
  repo,
  host,
  homeDir = homedir(),
  nowMs = Date.now(),
  run = executeCommand,
}) {
  if (host !== "claude" && host !== "codex") throw new Error(`unknown host: ${host}`);
  const root = resolve(repo);
  const listed = command(run, "git", ["worktree", "list", "--porcelain", "-z"], root);
  if (listed.exitCode !== 0) throw new Error(listed.stderr.trim() || `not a git repository: ${root}`);
  const worktrees = parseWorktrees(listed.stdout);
  const [mainWorktree, ...linkedWorktrees] = worktrees;
  if (mainWorktree === undefined) throw new Error(`no worktrees found for ${root}`);

  const prResult = command(
    run,
    "gh",
    ["pr", "list", "--author", "@me", "--state", "all", "--limit", "1000", "--json", "number,state,headRefName"],
    root,
  );
  const pullRequests = prResult.exitCode === 0 ? parsePullRequests(prResult.stdout) : new Map();
  const rows = [];

  for (const worktree of linkedWorktrees) {
    const status = command(run, "git", ["status", "--porcelain=v1", "-z"], worktree.path);
    const dirty = status.exitCode === 0 ? dirtyState(status.stdout) : { kind: "wip", files: ["status-unavailable"] };
    const headResult = command(run, "git", ["rev-parse", "HEAD"], worktree.path);
    const head = headResult.exitCode === 0 ? headResult.stdout.trim() : worktree.head;
    const ageResult = command(run, "git", ["log", "-1", "--format=%ct", "HEAD"], worktree.path);
    const committedAtSeconds = Number.parseInt(ageResult.stdout.trim(), 10);
    const ageDays = Number.isSafeInteger(committedAtSeconds)
      ? Math.max(0, Math.floor((nowMs - committedAtSeconds * 1000) / DAY_MS))
      : null;
    const merged = command(run, "git", ["merge-base", "--is-ancestor", head, "origin/main"], worktree.path).exitCode === 0;
    const pullRequest = worktree.branch === null
      ? { kind: "none" }
      : pullRequests.get(worktree.branch) ?? { kind: "none" };
    const transcripts = await findWorkspaceTranscripts({
      host,
      workspace: worktree.path,
      homeDir,
      limit: 1,
    });
    const lastChatAtMs = transcripts[0]?.modifiedAtMs ?? null;
    const row = {
      path: worktree.path,
      sizeBytes: await directorySize(worktree.path),
      ageDays,
      merged,
      dirty,
      remote: remoteState({ run, worktree: worktree.path, branch: worktree.branch, head }),
      pullRequest,
      lastChatAtMs,
    };
    rows.push({ ...row, bucket: bucketFor({ ...row, nowMs }) });
  }

  return rows.sort((left, right) => right.sizeBytes - left.sizeBytes || left.path.localeCompare(right.path));
}

function formatSize(bytes) {
  const units = ["B", "K", "M", "G", "T"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  if (unit === 0) return `${value}B`;
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}${units[unit]}`;
}

function renderDirty(state) {
  return state.kind === "clean" ? "clean" : `${state.kind}:${state.files.length}`;
}

function renderRemote(state) {
  return state.kind === "ahead" ? `ahead${state.aheadBy}` : state.kind;
}

function renderPullRequest(state) {
  return state.kind === "none" ? "-" : `#${state.number}/${state.state}`;
}

function cell(value) {
  return String(value).replace(/[\t\n\r]/g, " ");
}

export function renderAudit(rows) {
  const lines = ["SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE"];
  for (const row of rows) {
    lines.push([
      formatSize(row.sizeBytes),
      row.ageDays === null ? "?" : `${row.ageDays}d`,
      row.merged ? "YES" : "no",
      renderDirty(row.dirty),
      renderRemote(row.remote),
      renderPullRequest(row.pullRequest),
      row.lastChatAtMs === null ? "-" : new Date(row.lastChatAtMs).toISOString().slice(0, 10),
      row.bucket,
      row.path,
    ].map(cell).join("\t"));
  }
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const options = { repo: null, host: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo") options.repo = argv[++index] ?? null;
    else if (argument === "--host") options.host = argv[++index] ?? null;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (!argument.startsWith("-") && options.repo === null) options.repo = argument;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  return "usage: node worktree-audit.mjs --host <claude|codex> [--repo <path>]";
}

export async function main(argv) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      console.log(usage());
      return 0;
    }
    if (options.host === null) throw new Error(usage());
    const rows = await auditWorktrees({ repo: options.repo ?? process.cwd(), host: options.host });
    process.stdout.write(renderAudit(rows));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2));
}
