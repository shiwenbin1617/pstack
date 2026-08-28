#!/usr/bin/env node
import { open, readdir, realpath, stat } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

const METADATA_BYTES = 128 * 1024;

function isWindowsPath(path) {
  return process.platform === "win32" || /^[A-Za-z]:[\\/]/.test(path) || /^\\\\/.test(path);
}

export function normalizeWorkspacePath(path) {
  if (isWindowsPath(path)) return win32.resolve(path).replaceAll("/", "\\").toLowerCase();
  return resolve(path);
}

function metadataCwd(value) {
  if (typeof value !== "object" || value === null) return null;
  if (typeof value.cwd === "string") return value.cwd;
  if (typeof value.payload === "object" && value.payload !== null && typeof value.payload.cwd === "string") {
    return value.payload.cwd;
  }
  return null;
}

async function readTranscriptCwd(path) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(METADATA_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const lines = buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const cwd = metadataCwd(JSON.parse(line));
        if (cwd !== null) return cwd;
      } catch {}
    }
    return null;
  } finally {
    await handle.close();
  }
}

async function collectJsonlFiles(root) {
  const files = [];
  const walk = async (directory) => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(path);
    }));
  };
  await walk(root);
  return files;
}

async function canonicalWorkspacePath(path) {
  try {
    return normalizeWorkspacePath(await realpath(path));
  } catch {
    return normalizeWorkspacePath(path);
  }
}

export async function findWorkspaceTranscripts({
  host,
  workspace,
  homeDir = homedir(),
  limit,
}) {
  if (host !== "claude" && host !== "codex") throw new Error(`unknown host: ${host}`);
  if (!workspace) throw new Error("workspace is required");
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
    throw new Error("limit must be a positive integer");
  }

  const root = host === "claude"
    ? join(homeDir, ".claude", "projects")
    : join(homeDir, ".codex", "sessions");
  const expected = await canonicalWorkspacePath(workspace);
  const candidates = await collectJsonlFiles(root);
  const matches = [];

  for (const path of candidates) {
    let cwd;
    let info;
    try {
      [cwd, info] = await Promise.all([readTranscriptCwd(path), stat(path)]);
    } catch {
      continue;
    }
    if (cwd === null || await canonicalWorkspacePath(cwd) !== expected) continue;
    matches.push({ path, cwd, modifiedAtMs: info.mtimeMs });
  }

  matches.sort((left, right) => right.modifiedAtMs - left.modifiedAtMs || left.path.localeCompare(right.path));
  return limit === undefined ? matches : matches.slice(0, limit);
}

function parseArgs(argv) {
  const options = { host: null, workspace: null, homeDir: undefined, limit: undefined, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--host") options.host = argv[++index] ?? null;
    else if (argument === "--workspace") options.workspace = argv[++index] ?? null;
    else if (argument === "--home") options.homeDir = argv[++index];
    else if (argument === "--limit") options.limit = Number(argv[++index]);
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  return "usage: node find-transcripts.mjs --host <claude|codex> --workspace <path> [--limit <count>]";
}

export async function main(argv) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      console.log(usage());
      return 0;
    }
    if (options.host === null || options.workspace === null) throw new Error(usage());
    const matches = await findWorkspaceTranscripts(options);
    if (matches.length > 0) process.stdout.write(`${matches.map((match) => match.path).join("\n")}\n`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2));
}
