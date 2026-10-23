import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./shell.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("shell.css", () => {
  it("uses tokens only, no raw colors", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
  it("only reads tokens that exist", () => {
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) expect(tokens, m[1]).toContain(`${m[1]}:`);
  });
  it("has a 172px sidebar, a phone bar and no glass", () => {
    expect(css).toContain("width: 10.75rem");
    expect(css).toContain("max-width: 48rem");
    expect(css).not.toMatch(/glass|backdrop|ambient/);
  });
});
