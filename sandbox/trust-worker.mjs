import { runTrustBenchmark } from "../viewer/trust-benchmark.mjs";

const MAX_STDIN_BYTES = 4_096;
let input = "";

for await (const chunk of process.stdin) {
  input += chunk;
  if (Buffer.byteLength(input, "utf8") > MAX_STDIN_BYTES) {
    throw new Error("Sandbox input exceeds 4 KB.");
  }
}

const request = input === "" ? {} : JSON.parse(input);
const keys = request !== null && typeof request === "object" && !Array.isArray(request)
  ? Object.keys(request)
  : [];
if (keys.length !== 1 || keys[0] !== "suite" || request.suite !== "trust_lab_v1") {
  throw new Error("Sandbox accepts only {\"suite\":\"trust_lab_v1\"}.");
}

const report = await runTrustBenchmark();
process.stdout.write(`${JSON.stringify(report)}\n`);
