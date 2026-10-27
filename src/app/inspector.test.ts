import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./inspector.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("inspector.css", () => {
  it("uses tokens only, no raw colors", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
  it("only reads tokens that exist", () => {
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) expect(tokens, m[1]).toContain(`${m[1]}:`);
  });
  it("is a 420px panel with 52px fields", () => {
    expect(css).toContain("min(26.25rem, 100%)");
    expect(css).toContain("height: 3.25rem");
  });
});
