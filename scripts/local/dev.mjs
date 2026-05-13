import { spawn } from "node:child_process";
import { ensureDatabaseReady, localEnv, pnpmSpec, runPnpm, warnForPlaceholderSecrets } from "./common.mjs";

const baseEnv = localEnv();
const apiPort = baseEnv.LOCAL_API_PORT || "8080";
const webPort = baseEnv.LOCAL_WEB_PORT || "5173";
const apiTarget = `http://localhost:${apiPort}`;

warnForPlaceholderSecrets(baseEnv);

console.log("Checking database connectivity...");
await ensureDatabaseReady();

console.log("Syncing database schema...");
await runPnpm(["--filter", "@workspace/db", "run", "push"], {
  env: baseEnv,
});

console.log("Building API server...");
await runPnpm(["--filter", "@workspace/api-server", "run", "build"], {
  env: {
    ...baseEnv,
    NODE_ENV: "development",
  },
});

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

function start(name, args, env) {
  const spec = pnpmSpec(args);
  const child = spawn(spec.command, spec.args, {
    env,
    stdio: "inherit",
    shell: false,
  });

  children.push(child);

  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`${name} exited with code ${code ?? "unknown"}.`);
      shutdown(code ?? 1);
    }
  });

  return child;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`Starting API on ${apiTarget}...`);
start(
  "API server",
  ["--filter", "@workspace/api-server", "run", "start"],
  {
    ...baseEnv,
    NODE_ENV: "development",
    PORT: apiPort,
  },
);

console.log(`Starting web app on http://localhost:${webPort}...`);
start(
  "Web app",
  ["--filter", "@workspace/verdictiq", "run", "dev"],
  {
    ...baseEnv,
    NODE_ENV: "development",
    PORT: webPort,
    BASE_PATH: baseEnv.BASE_PATH || "/",
    VITE_API_TARGET: apiTarget,
  },
);
