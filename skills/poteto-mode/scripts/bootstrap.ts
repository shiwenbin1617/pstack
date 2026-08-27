import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptsDirectory = import.meta.dir;
const nodeModulesDirectory = join(scriptsDirectory, "node_modules");
const commanderPackagePath = join(
  nodeModulesDirectory,
  "commander",
  "package.json"
);
function packageVersion(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")).version;
}

export function ensureDependenciesInstalled(): void {
  const manifest = JSON.parse(
    readFileSync(join(scriptsDirectory, "package.json"), "utf8")
  );
  const expectedCommander = manifest.dependencies.commander;
  if (packageVersion(commanderPackagePath) === expectedCommander) return;

  throw new Error(
    [
      "poteto-mode helper dependencies are not installed or are stale.",
      "Package installation is never performed implicitly.",
      `After receiving approval to install packages, run: cd ${JSON.stringify(scriptsDirectory)} && bun install --frozen-lockfile`,
    ].join("\n")
  );
}
