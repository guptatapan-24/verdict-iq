import { localEnv, runPnpm } from "./common.mjs";

await runPnpm(["--filter", "@workspace/db", "run", "push"], {
  env: localEnv(),
});
