import { ensureDatabaseReady, localEnv, runPnpm, warnForPlaceholderSecrets } from "./common.mjs";

const env = localEnv();

warnForPlaceholderSecrets(env);

console.log("Checking database connectivity...");
await ensureDatabaseReady();

console.log("Installing workspace dependencies...");
await runPnpm(["install"]);

console.log("Creating/updating local database schema...");
await runPnpm(["--filter", "@workspace/db", "run", "push"], { env });

console.log("Local setup complete. Run `pnpm local:dev` to start VerdictIQ.");
