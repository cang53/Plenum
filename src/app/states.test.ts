import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./states.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("states.css", () => {
  it("uses tokens only, no raw colors", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
  it("only reads tokens that exist", () => {
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) expect(tokens, m[1]).toContain(`${m[1]}:`);
  });
  it("is flat: no gradient, blur, shadow or glass", () => {
    expect(css).not.toMatch(/gradient|blur|shadow|glass/);
  });
  it("stops the shimmer under reduced motion", () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.skeleton-line \{ animation: none/);
  });
});
