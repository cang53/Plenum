// Fails if a component hard-codes visible text instead of using t() from src/lib/messages.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".tsx") && !e.name.includes(".test.") ? [join(dir, e.name)] : [],
  );

export function findHardCodedStrings(dir = "src") {
  const found = [];
  for (const f of files(dir)) {
    const src = readFileSync(f, "utf8");
    // text typed between tags, a quoted string as a child, and text-bearing attributes
    for (const m of src.matchAll(/(?:<[A-Za-z][\w.]*|["'}\/])>\s*([A-Za-z][^<>{}\n]*[a-z]{3}[^<>{}\n]*)\s*</g)) found.push(`${f}: ${m[1]}`);
    for (const m of src.matchAll(/\{\s*(["'`])([^"'`$\n]*[A-Za-z]{3}[^"'`$\n]*)\1\s*\}/g)) found.push(`${f}: ${m[2]}`);
    for (const m of src.matchAll(/\b(?:aria-label|placeholder|title|alt|label)="([^"]*[A-Za-z]{2}[^"]*)"/g)) found.push(`${f}: ${m[1]}`);
  }
  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = findHardCodedStrings();
  for (const s of found) console.log(`FAIL ${s}`);
  console.log(found.length ? `${found.length} hard-coded string(s); move them to src/lib/messages.en.ts and messages.nl.ts` : "ok   no hard-coded strings");
  process.exit(found.length ? 1 : 0);
}
