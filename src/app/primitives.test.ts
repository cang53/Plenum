import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./primitives.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("primitives.css", () => {
  it("defines every primitive", () => {
    for (const name of [".glass", ".surface", ".btn-primary", ".btn-secondary", ".btn-plain", ".field", ".badge", ".segmented", ".dialog"]) {
      expect(css).toContain(`${name} {`);
    }
  });

  it("uses tokens only, no raw colors", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it("only reads tokens that exist", () => {
    const used = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]));
    for (const name of used) expect(tokens, name).toContain(`${name}:`);
  });
});
