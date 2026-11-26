import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./thread.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("thread.css", () => {
  it("uses tokens only, no raw colours", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
  it("only reads tokens that exist", () => {
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) expect(tokens, m[1]).toContain(`${m[1]}:`);
  });
});
