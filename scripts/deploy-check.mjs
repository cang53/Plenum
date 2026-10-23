// Run before a deploy: `npm run deploy:check`. With a site URL (argument or APP_URL) it also checks /api/health.
import { checkDeployEnv } from "../src/server/deploy-check.ts";

const problems = checkDeployEnv();
const site = process.argv[2];
if (site) {
  try {
    const res = await fetch(new URL("/api/health", site));
    if (!res.ok) problems.push(`${site}/api/health returned ${res.status}`);
  } catch (e) {
    problems.push(`${site}/api/health unreachable: ${e.message}`);
  }
}
for (const p of problems) console.log(`FAIL ${p}`);
if (!problems.length) console.log("ok   deploy check passed");
process.exit(problems.length ? 1 : 0);
