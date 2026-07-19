import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const configuredEntry = process.env.LAZYTAX_MCP_ENTRY;
const bundledEntry = fileURLToPath(
  new URL("../mcp-server/index.mjs", import.meta.url),
);
const repositoryEntry = fileURLToPath(
  new URL("../../../packages/mcp/dist/index.js", import.meta.url),
);
const candidates = [configuredEntry, bundledEntry, repositoryEntry].filter(Boolean);
const entry = candidates.find((candidate) => existsSync(candidate));

if (!entry) {
  process.stderr.write(
    [
      "LazyTax MCP server is not built.",
      `Expected installed plugin bundle at: ${bundledEntry}`,
      `Expected repository build output at: ${repositoryEntry}`,
      "Run npm run build from the repository, or set LAZYTAX_MCP_ENTRY to an absolute compatible entry path.",
      "No tax calculation or verification was attempted.",
    ].join("\n") + "\n",
  );
  process.exit(1);
}

const child = spawn(process.execPath, [entry], {
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  process.stderr.write(`Failed to start LazyTax MCP server: ${error.message}\n`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
