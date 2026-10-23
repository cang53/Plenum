import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { exportTables, tableCsv } from "./export";

describe("tableCsv", () => {
  it("quotes fields, defuses formulas and writes objects as JSON", () => {
    const csv = tableCsv([{ a: 'say "hi"', b: "=1+1" }, { a: null, c: { x: 1 } }]);
    expect(csv).toBe('"a","b","c"\r\n"say ""hi""","\'=1+1",""\r\n"","","{""x"":1}"\r\n');
  });
});

describe("exportTables", () => {
  it("are all built by the latest export_workspace migration", () => {
    const dir = "supabase/migrations";
    const files = readdirSync(dir).filter((f) => readFileSync(`${dir}/${f}`, "utf8").includes("function public.export_workspace")).sort();
    const sql = readFileSync(`${dir}/${files.at(-1)}`, "utf8");
    for (const t of exportTables) expect(sql).toContain(`'${t}',`);
  });
});
