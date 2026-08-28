#!/usr/bin/env node
import { mkdir, open } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HEADER = "ts\tphase\tdecision\twhy\tevidence\tresult\n";

/** @typedef {{ phase: string, decision: string, why: string, evidence: string, result: string }} DecisionRow */

export function sanitizeSpreadsheetCell(value) {
  const clean = String(value).replace(/[\t\n\r]/g, " ");
  return /^[=+\-@]/.test(clean) ? `'${clean}` : clean;
}

function timestamp(now) {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * @param {string} logFile
 * @param {DecisionRow} row
 * @param {Date} [now]
 */
export async function appendDecision(logFile, row, now = new Date()) {
  await mkdir(dirname(resolve(logFile)), { recursive: true });
  const line = [
    timestamp(now),
    row.phase,
    row.decision,
    row.why,
    row.evidence,
    row.result,
  ].map(sanitizeSpreadsheetCell).join("\t") + "\n";

  try {
    const handle = await open(logFile, "wx");
    try {
      await handle.writeFile(HEADER + line);
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (!(error instanceof Error) || error.code !== "EEXIST") throw error;
    const handle = await open(logFile, "a+");
    try {
      const info = await handle.stat();
      await handle.writeFile((info.size === 0 ? HEADER : "") + line);
    } finally {
      await handle.close();
    }
  }
}

function usage() {
  return "usage: node log.mjs <logfile> <phase> <decision> <why> <evidence> <result>";
}

export async function main(argv) {
  if (argv.length !== 6) {
    console.error(usage());
    return 1;
  }
  const [logFile, phase, decision, why, evidence, result] = argv;
  await appendDecision(logFile, { phase, decision, why, evidence, result });
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
