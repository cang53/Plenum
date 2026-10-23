// Run after `next build`: fails when a route's JS, the glass CSS or the CSS size is over scripts/budget.json.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { checkBundle, checkGlass } from "./budget-check.mjs";

const budget = JSON.parse(readFileSync(new URL("./budget.json", import.meta.url), "utf8"));
const stats = JSON.parse(readFileSync(".next/diagnostics/route-bundle-stats.json", "utf8"));
const cssDir = ".next/static/chunks";
const builtCss = readdirSync(cssDir).filter((f) => f.endsWith(".css")).reduce((n, f) => n + statSync(`${cssDir}/${f}`).size, 0);
const sources = readdirSync("src/app").filter((f) => f.endsWith(".css")).map((f) => readFileSync(`src/app/${f}`, "utf8"));

const fails = [...checkBundle(stats, budget), ...checkGlass(sources, builtCss, budget)];
if (fails.length) {
  console.error("Performance budget exceeded:\n" + fails.join("\n"));
  process.exit(1);
}
console.log(`Performance budget ok (${stats.length} routes, ${builtCss} B CSS).`);
