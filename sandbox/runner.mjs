import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const WORKER_PATH = fileURLToPath(new URL("./trust-worker.mjs", import.meta.url));
const MAX_OUTPUT_BYTES = 1_048_576;

function validateRequest(input) {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).length !== 1 ||
    input.suite !== "trust_lab_v1"
  ) {
    throw new Error("Trust sandbox accepts only the allowlisted trust_lab_v1 suite.");
  }
}

export function runTrustSandbox(input, options = {}) {
  validateRequest(input);
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    throw new Error("Sandbox timeout must be a whole number from 100 to 60000 ms.");
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--disable-proto=throw", WORKER_PATH], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: {
        NODE_ENV: "test",
        LAZYTAX_SANDBOX: "synthetic-only"
      },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error(`Trust sandbox exceeded its ${timeoutMs} ms time limit.`)));
    }, timeoutMs);

    const collect = (current, chunk) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(() => reject(new Error("Trust sandbox exceeded its 1 MB output limit.")));
      }
      return next;
    };

    child.stdout.on("data", (chunk) => {
      stdout = collect(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = collect(stderr, chunk);
    });
    child.stdin.on("error", (error) => finish(() => reject(error)));
    child.once("error", (error) => finish(() => reject(error)));
    child.once("close", (code, signal) => {
      finish(() => {
        if (code !== 0) {
          reject(new Error(`Trust sandbox failed (${signal ?? code}): ${stderr.trim() || "no diagnostic"}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error("Trust sandbox returned invalid JSON."));
        }
      });
    });

    child.stdin.end(JSON.stringify(input));
  });
}
