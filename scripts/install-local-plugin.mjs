import { realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

function runCodex(args, options = {}) {
  const result = spawnSync("codex", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit"
  });
  if (result.error?.code === "ENOENT") {
    throw new Error("Codex CLI was not found on PATH. Install or update Codex, then rerun npm run install:plugin.");
  }
  if (result.status !== 0) {
    const detail = options.capture ? `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() : "";
    throw new Error(`codex ${args.join(" ")} failed${detail ? `: ${detail}` : "."}`);
  }
  return result.stdout ?? "";
}

const marketplaceList = runCodex(["plugin", "marketplace", "list"], { capture: true });
const personalLine = marketplaceList
  .split(/\r?\n/)
  .find((line) => /^personal\s+/.test(line));

if (personalLine) {
  const configuredRoot = personalLine.replace(/^personal\s+/, "").trim();
  let resolvedConfiguredRoot;
  try {
    resolvedConfiguredRoot = realpathSync(configuredRoot);
  } catch {
    resolvedConfiguredRoot = configuredRoot;
  }
  if (resolvedConfiguredRoot !== repositoryRoot) {
    throw new Error(
      `A different marketplace named personal is already configured at ${configuredRoot}. Remove or rename that marketplace before installing LazyTax.`
    );
  }
  process.stdout.write(`Marketplace personal already points to ${repositoryRoot}.\n`);
} else {
  runCodex(["plugin", "marketplace", "add", repositoryRoot]);
}

runCodex(["plugin", "add", "lazytax@personal"]);
process.stdout.write(
  "LazyTax is installed. Start a new Codex task, select GPT-5.6, and invoke $verify-tax-return.\n"
);
