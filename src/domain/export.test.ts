import { describe, expect, it } from "vitest";
import { tableCsv } from "./export";

describe("tableCsv", () => {
  it("quotes fields, defuses formulas and writes objects as JSON", () => {
    const csv = tableCsv([{ a: 'say "hi"', b: "=1+1" }, { a: null, c: { x: 1 } }]);
    expect(csv).toBe('"a","b","c"\r\n"say ""hi""","\'=1+1",""\r\n"","","{""x"":1}"\r\n');
  });
});
