import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const repositoryRoot = process.cwd();
const pluginRoot = resolve(repositoryRoot, "plugins", "lazytax");
const serverDirectory = resolve(pluginRoot, "mcp-server");
const fixtureDirectory = resolve(pluginRoot, "fixtures");

await mkdir(serverDirectory, { recursive: true });
await mkdir(fixtureDirectory, { recursive: true });

await build({
  entryPoints: [resolve(repositoryRoot, "packages", "mcp", "src", "index.ts")],
  outfile: resolve(serverDirectory, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: false,
  minify: false,
  legalComments: "none"
});

for (const filename of [
  "form16.synthetic.json",
  "ais.synthetic.json",
  "broker-pnl.synthetic.json"
]) {
  await copyFile(
    resolve(repositoryRoot, "fixtures", filename),
    resolve(fixtureDirectory, filename)
  );
}

process.stderr.write("Built self-contained LazyTax plugin MCP bundle and synthetic fixtures.\n");
