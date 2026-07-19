#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLazyTaxServer } from "./server.js";

export async function main(): Promise<void> {
  const server = createLazyTaxServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown startup error";
    process.stderr.write(`LazyTax MCP server failed to start: ${message}\n`);
    process.exitCode = 1;
  });
}

