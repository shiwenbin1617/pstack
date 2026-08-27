#!/usr/bin/env node
import { createInterface, emitKeypressEvents } from "node:readline";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  REPO_ROOT, HOSTS, findSkills, installSkill, installAgents,
  listInstalled, removeSkill, CORE_SKILLS, expandSkillDependencies,
} from "../scripts/lib.mjs";

const c = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", grey: "\x1b[90m",
};
const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (supportsColor ? code + s + c.reset : s);

const BANNER = `
██████╗ ███████╗████████╗ █████╗  ██████╗██╗  ██╗
██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
██████╔╝███████╗   ██║   ███████║██║     █████╔╝
██╔═══╝ ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
██║     ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`;

const version = () => {
  try { return JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")).version; }
  catch { return "0.0.0"; }
};

function help() {
  console.log(paint(c.cyan, BANNER));
  console.log(`  ${paint(c.dim, "if you want to go fast, go deep first.")}  ${paint(c.grey, "v" + version())}\n`);
  console.log(`  $ npx pstack add [skills...]     ${paint(c.grey, "Install skills (interactive by default)")}`);
  console.log(`  $ npx pstack list                ${paint(c.grey, "List installed pstack skills")}`);
  console.log(`  $ npx pstack remove [skills...]  ${paint(c.grey, "Remove installed skills")}`);
  console.log(`  $ npx pstack update              ${paint(c.grey, "Reinstall everything already installed")}`);
  console.log(`  $ npx pstack find [query]        ${paint(c.grey, "Search the catalog")}`);
  console.log(`  $ npx pstack doctor              ${paint(c.grey, "Show where skills are installed")}\n`);
  console.log(`  ${paint(c.bold, "Options")}`);
  console.log(`    --host <claude|codex|both>     ${paint(c.grey, "Target agent (default: both, detected)")}`);
  console.log(`    --scope <user|project>         ${paint(c.grey, "Install globally or into this repo (default: user)")}`);
  console.log(`    --copy                         ${paint(c.grey, "Install independent host-specific copies (default)")}`);
  console.log(`    --core                         ${paint(c.grey, "Core entry set plus required dependencies, no prompts")}`);
  console.log(`    --all                          ${paint(c.grey, "Every skill, no prompts")}`);
  console.log(`    -y, --yes                      ${paint(c.grey, "Skip confirmation")}`);
  console.log(`    --dry-run                      ${paint(c.grey, "Print what would happen")}\n`);
  console.log(`  ${paint(c.grey, "try: npx pstack add --core")}\n`);
}

function parseArgs(argv) {
  const opts = { _: [], host: null, scope: "user", core: false, all: false, yes: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--host") opts.host = argv[++i];
    else if (a === "--scope") opts.scope = argv[++i];
    else if (a === "--link") { console.error(paint(c.red, "--link was removed: Claude Code and Codex installs must stay independent.")); process.exit(1); }
    else if (a === "--copy") {}
    else if (a === "--core") opts.core = true;
    else if (a === "--all") opts.all = true;
    else if (a === "-y" || a === "--yes") opts.yes = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "-v" || a === "--version") opts.version = true;
    else if (a.startsWith("-")) { console.error(paint(c.red, `unknown option: ${a}`)); process.exit(1); }
    else opts._.push(a);
  }
  return opts;
}

/** Which hosts look present on this machine. */
function detectHosts() {
  const found = [];
  if (existsSync(join(process.env.HOME || "", ".claude"))) found.push("claude");
  if (existsSync(join(process.env.HOME || "", ".codex")) || existsSync(join(process.env.HOME || "", ".agents"))) found.push("codex");
  return found;
}

function resolveHosts(opts) {
  if (opts.host === "both") return ["claude", "codex"];
  if (opts.host) {
    if (!HOSTS[opts.host]) { console.error(paint(c.red, `unknown host: ${opts.host}`)); process.exit(1); }
    return [opts.host];
  }
  const detected = detectHosts();
  return detected.length ? detected : ["claude"];
}

const isTTY = () => process.stdin.isTTY && process.stdout.isTTY;

/** Arrow keys to move, space to toggle, a to toggle all, enter to confirm. */
function multiSelect(items, { preselected = new Set(), title }) {
  return new Promise((resolve) => {
    let cursor = 0;
    const chosen = new Set(preselected);
    const pageSize = Math.min(items.length, Math.max(8, (process.stdout.rows || 24) - 8));
    let top = 0;
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    let lastLines = 0;
    const render = () => {
      if (lastLines) process.stdout.write(`\x1b[${lastLines}A\x1b[0J`);
      const lines = [];
      lines.push(`${paint(c.bold, title)} ${paint(c.grey, "↑↓ move · space toggle · a all · enter confirm · esc cancel")}`);
      if (cursor < top) top = cursor;
      if (cursor >= top + pageSize) top = cursor - pageSize + 1;
      for (let i = top; i < Math.min(items.length, top + pageSize); i++) {
        const it = items[i];
        const mark = chosen.has(it.value) ? paint(c.green, "◉") : paint(c.grey, "◯");
        const pointer = i === cursor ? paint(c.cyan, "❯") : " ";
        const name = i === cursor ? paint(c.bold, it.label) : it.label;
        const hint = it.hint ? " " + paint(c.grey, it.hint) : "";
        lines.push(`${pointer} ${mark} ${name}${hint}`);
      }
      lines.push(paint(c.grey, `  ${chosen.size} selected · showing ${Math.min(items.length, top + pageSize)}/${items.length}`));
      process.stdout.write(lines.join("\n") + "\n");
      lastLines = lines.length;
    };

    const done = (result) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("keypress", onKey);
      process.stdout.write("\n");
      resolve(result);
    };

    const onKey = (_str, key) => {
      if (key.name === "up" || key.name === "k") cursor = (cursor - 1 + items.length) % items.length;
      else if (key.name === "down" || key.name === "j") cursor = (cursor + 1) % items.length;
      else if (key.name === "space") {
        const v = items[cursor].value;
        chosen.has(v) ? chosen.delete(v) : chosen.add(v);
      } else if (key.name === "a") {
        if (chosen.size === items.length) chosen.clear();
        else items.forEach((i) => chosen.add(i.value));
      } else if (key.name === "return") return done([...chosen]);
      else if (key.name === "escape" || (key.ctrl && key.name === "c")) return done(null);
      render();
    };

    process.stdin.on("keypress", onKey);
    render();
  });
}

function confirm(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} ${paint(c.grey, "(Y/n) ")}`, (a) => {
      rl.close();
      resolve(!a.trim() || /^y(es)?$/i.test(a.trim()));
    });
  });
}

const truncate = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

/** Widest skill name in the catalog, so the description column never collides. */
const NAME_COL = Math.max(...findSkills().map((s) => s.name.length)) + 2;

async function cmdAdd(opts) {
  const catalog = findSkills();
  const hosts = resolveHosts(opts);
  let names;

  if (opts.all) names = catalog.map((s) => s.dirName);
  else if (opts.core) names = CORE_SKILLS;
  else if (opts._.length) names = opts._;
  else if (isTTY()) {
    const width = Math.max(20, (process.stdout.columns || 80) - NAME_COL - 10);
    const items = catalog.map((s) => ({
      value: s.dirName,
      label: s.name.padEnd(NAME_COL),
      hint: truncate(s.description.replace(/\s+/g, " "), width),
    }));
    const preselected = new Set(CORE_SKILLS.filter((n) => catalog.some((s) => s.dirName === n)));
    console.log(paint(c.cyan, BANNER));
    console.log(`  installing to: ${paint(c.bold, hosts.map((h) => HOSTS[h].label).join(" + "))}  ${paint(c.grey, "(" + opts.scope + " scope)")}\n`);
    const picked = await multiSelect(items, { preselected, title: "Select skills to install" });
    if (picked === null) { console.log(paint(c.grey, "cancelled.")); return; }
    names = picked;
  } else {
    console.error(paint(c.red, "not a TTY. pass skill names, or --core / --all."));
    process.exit(1);
  }

  const unknown = names.filter((n) => !catalog.some((s) => s.dirName === n || s.name === n));
  if (unknown.length) {
    console.error(paint(c.red, `unknown skill(s): ${unknown.join(", ")}`));
    console.error(paint(c.grey, "run `npx pstack find` to see the catalog."));
    process.exit(1);
  }
  if (!names.length) { console.log(paint(c.grey, "nothing selected.")); return; }

  const requested = catalog.filter((s) => names.includes(s.dirName) || names.includes(s.name));
  const selected = expandSkillDependencies(requested, catalog);
  const addedDependencies = selected.filter((skill) => !requested.includes(skill));
  if (!opts.yes && !opts.dryRun && isTTY()) {
    const ok = await confirm(`install ${paint(c.bold, String(selected.length))} skills to ${hosts.map((h) => HOSTS[h].label).join(" + ")}?`);
    if (!ok) { console.log(paint(c.grey, "cancelled.")); return; }
  }

  if (addedDependencies.length) console.log(`\n${paint(c.grey, `added ${addedDependencies.length} required skill dependencies`)}`);
  for (const host of hosts) {
    const dir = HOSTS[host].skillsDir(opts.scope);
    console.log(`\n${paint(c.bold, HOSTS[host].label)} ${paint(c.grey, "→ " + dir)}`);
    for (const s of selected) {
      installSkill(s, { host, scope: opts.scope, dryRun: opts.dryRun });
      console.log(`  ${paint(c.green, "✓")} ${s.name} ${paint(c.grey, HOSTS[host].invoke(s.name))}`);
    }
    const agentsDir = installAgents({ host, scope: opts.scope, dryRun: opts.dryRun });
    if (agentsDir) console.log(`  ${paint(c.green, "✓")} agents ${paint(c.grey, "→ " + agentsDir)}`);
  }

  if (opts.dryRun) { console.log(`\n${paint(c.yellow, "dry run — nothing written.")}`); return; }
  console.log(`\n${paint(c.bold, "next:")}`);
  for (const host of hosts) {
    console.log(`  ${paint(c.bold, HOSTS[host].label + ":")} ${paint(c.cyan, HOSTS[host].invoke("setup-pstack"))} ${paint(c.grey, "then " + HOSTS[host].invoke("poteto-mode"))}`);
  }
  console.log("");
}

async function cmdRemove(opts) {
  const hosts = resolveHosts(opts);
  let names = opts._;
  if (!names.length) {
    const installedAnywhere = [...new Set(hosts.flatMap((h) => listInstalled({ host: h, scope: opts.scope }).map((s) => s.name)))];
    if (!installedAnywhere.length) { console.log(paint(c.grey, "nothing installed.")); return; }
    if (!isTTY()) { console.error(paint(c.red, "not a TTY. pass skill names.")); process.exit(1); }
    const picked = await multiSelect(
      installedAnywhere.sort().map((n) => ({ value: n, label: n })),
      { title: "Select skills to remove" },
    );
    if (picked === null || !picked.length) { console.log(paint(c.grey, "cancelled.")); return; }
    names = picked;
  }
  for (const host of hosts) {
    console.log(`\n${paint(c.bold, HOSTS[host].label)}`);
    for (const n of names) {
      const removed = removeSkill(n, { host, scope: opts.scope, dryRun: opts.dryRun });
      console.log(removed ? `  ${paint(c.green, "✓")} removed ${n}` : `  ${paint(c.grey, "· not installed: " + n)}`);
    }
  }
  console.log("");
}

function cmdList(opts) {
  for (const host of resolveHosts(opts)) {
    const installed = listInstalled({ host, scope: opts.scope });
    console.log(`\n${paint(c.bold, HOSTS[host].label)} ${paint(c.grey, HOSTS[host].skillsDir(opts.scope))}`);
    if (!installed.length) console.log(paint(c.grey, "  (none)"));
    else {
      const pad = Math.max(...installed.map((s) => s.name.length)) + 2;
      installed.forEach((s) => {
        const tag = s.linkedTo ? paint(c.grey, "⇢ " + s.linkedTo) : paint(c.grey, "(copy)");
        console.log(`  ${paint(c.green, "✓")} ${s.name.padEnd(pad)}${paint(c.grey, HOSTS[host].invoke(s.name).padEnd(pad))}${tag}`);
      });
    }
  }
  console.log("");
}

async function cmdUpdate(opts) {
  const catalog = findSkills();
  for (const host of resolveHosts(opts)) {
    const installed = listInstalled({ host, scope: opts.scope }).map((s) => s.name);
    console.log(`\n${paint(c.bold, HOSTS[host].label)}`);
    if (!installed.length) { console.log(paint(c.grey, "  (none installed)")); continue; }
    const requested = catalog.filter((skill) => installed.includes(skill.dirName));
    const selected = expandSkillDependencies(requested, catalog);
    const addedDependencies = selected.filter((skill) => !installed.includes(skill.dirName));
    if (addedDependencies.length) {
      console.log(`  ${paint(c.grey, `adding ${addedDependencies.length} required skill dependencies`)}`);
    }
    for (const s of selected) {
      installSkill(s, { host, scope: opts.scope, dryRun: opts.dryRun });
      console.log(`  ${paint(c.green, "✓")} ${s.name}`);
    }
    installAgents({ host, scope: opts.scope, dryRun: opts.dryRun });
  }
  console.log("");
}

function cmdFind(opts) {
  const q = opts._.join(" ").toLowerCase();
  const catalog = findSkills().filter((s) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  if (!catalog.length) { console.log(paint(c.grey, `no skills match "${q}"`)); return; }
  const width = Math.max(30, (process.stdout.columns || 100) - NAME_COL - 4);
  console.log("");
  for (const s of catalog) {
    console.log(`  ${paint(c.cyan, s.name.padEnd(NAME_COL))}${paint(c.grey, truncate(s.description.replace(/\s+/g, " "), width))}`);
  }
  console.log(`\n  ${paint(c.grey, catalog.length + " skills")}\n`);
}

function cmdDoctor(opts) {
  console.log(paint(c.cyan, BANNER));
  const detected = detectHosts();
  console.log(`  ${paint(c.bold, "catalog")}  ${findSkills().length} skills at ${paint(c.grey, REPO_ROOT)}\n`);
  for (const host of ["claude", "codex"]) {
    const present = detected.includes(host);
    console.log(`  ${present ? paint(c.green, "✓") : paint(c.grey, "·")} ${paint(c.bold, HOSTS[host].label)} ${present ? "" : paint(c.grey, "(not detected)")}`);
    for (const scope of ["user", "project"]) {
      const dir = HOSTS[host].skillsDir(scope);
      const n = listInstalled({ host, scope }).length;
      console.log(`      ${scope.padEnd(8)} ${n ? paint(c.green, n + " installed") : paint(c.grey, "0 installed")}  ${paint(c.grey, dir)}`);
    }
  }
  console.log("");
}

const opts = parseArgs(process.argv.slice(2));
if (opts.version) { console.log(version()); process.exit(0); }
const cmd = opts._.shift();

try {
  if (opts.help || !cmd) help();
  else if (cmd === "add" || cmd === "install") await cmdAdd(opts);
  else if (cmd === "remove" || cmd === "rm" || cmd === "uninstall") await cmdRemove(opts);
  else if (cmd === "list" || cmd === "ls") cmdList(opts);
  else if (cmd === "update") await cmdUpdate(opts);
  else if (cmd === "find" || cmd === "search") cmdFind(opts);
  else if (cmd === "doctor") cmdDoctor(opts);
  else { console.error(paint(c.red, `unknown command: ${cmd}`)); help(); process.exit(1); }
} catch (err) {
  console.error(paint(c.red, `\nerror: ${err.message}`));
  process.exit(1);
}
