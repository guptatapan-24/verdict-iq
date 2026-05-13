import { spawn } from "node:child_process";
import { pnpmSpec, repoRoot } from "./common.mjs";

const spec = pnpmSpec(process.argv.slice(2));
const child = spawn(spec.command, spec.args, {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
