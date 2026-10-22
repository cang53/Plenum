// Prints which account-ready switches are on and what each still needs. Exit 1 if any is misconfigured.
import { checkSwitches } from "../src/server/switches.ts";

let bad = false;
for (const s of checkSwitches()) {
  console.log(`${s.problems.length ? "FAIL" : "ok  "} ${s.name}: ${s.flag}=${s.value} (${s.live ? "live" : "off"})`);
  for (const p of s.problems) console.log(`       - ${p}`);
  bad ||= s.problems.length > 0;
}
process.exit(bad ? 1 : 0);
