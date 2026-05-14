import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export const repoRoot = path.resolve(import.meta.dirname, "..", "..");

export function pnpmSpec(args) {
  const localPnpmEntrypoint = path.join(
    repoRoot,
    ".local",
    "npm-tools",
    "node_modules",
    "pnpm",
    "bin",
    "pnpm.mjs",
  );

  if (fs.existsSync(localPnpmEntrypoint)) {
    return {
      command: process.execPath,
      args: [localPnpmEntrypoint, ...args],
    };
  }

  const npmExecPath = process.env.npm_execpath;
  const userAgent = process.env.npm_config_user_agent || "";

  if (npmExecPath && userAgent.startsWith("pnpm/")) {
    return {
      command: process.execPath,
      args: [npmExecPath, ...args],
    };
  }

  return {
    command: process.platform === "win32" ? "corepack.cmd" : "corepack",
    args: ["pnpm", ...args],
  };
}

export function readLocalEnv() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return {};

  const parsed = {};
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

export function localEnv(overrides = {}) {
  return {
    ...process.env,
    ...readLocalEnv(),
    ...overrides,
  };
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? localEnv(),
      stdio: options.stdio ?? "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

export function runPnpm(args, options = {}) {
  const spec = pnpmSpec(args);
  return run(spec.command, spec.args, options);
}

export function runCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? localEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}\n${stderr}`));
      }
    });
  });
}

export async function waitForPostgres() {
  const env = localEnv();
  const deadline = Date.now() + 90000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      await waitForDatabasePort(env, 2000);
      return;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError ?? new Error("PostgreSQL did not become ready in time.");
}

export async function ensureDatabaseReady() {
  const env = localEnv();
  await waitForDatabasePort(env, 90000);
}

function databaseAddress(env) {
  const url = new URL(env.DATABASE_URL);
  return {
    host: url.hostname || "localhost",
    port: Number(url.port || "5432"),
  };
}

export function waitForDatabasePort(env, timeoutMs = 90000) {
  const { host, port } = databaseAddress(env);
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    function attempt() {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", (err) => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(err);
        } else {
          setTimeout(attempt, 1000);
        }
      });
    }

    attempt();
  });
}

export function warnForPlaceholderSecrets(env) {
  const placeholders = [
    "replace-with-your-clerk-secret-key",
    "replace-with-your-ollama-api-key",
  ];

  const missing = [];
  for (const key of ["CLERK_SECRET_KEY", "AI_INTEGRATIONS_OLLAMA_API_KEY"]) {
    if (!env[key] || placeholders.includes(env[key])) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `Local setup warning: ${missing.join(", ")} still contains placeholder values in .env.local.`,
    );
  }
}
