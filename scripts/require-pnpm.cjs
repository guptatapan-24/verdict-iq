const fs = require("node:fs");
const path = require("node:path");

const userAgent = process.env.npm_config_user_agent || "";
const npmExecPath = process.env.npm_execpath || "";

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  const fullPath = path.resolve(__dirname, "..", lockfile);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { force: true });
  }
}

if (!userAgent.startsWith("pnpm/") && !npmExecPath.includes("pnpm")) {
  console.error("Use pnpm instead of npm or yarn.");
  process.exit(1);
}
