import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs shared with the CI script
import { checkBundle, checkGlass } from "../../scripts/budget-check.mjs";

const budget = { jsBytesDefault: 100, jsBytesByRoute: { "/big": 200 }, cssBytes: 50, maxBlurPx: 24, maxBackdropRules: 2 };

describe("bundle budget", () => {
  it("passes within budget and honours a per-route limit", () => {
    expect(checkBundle([{ route: "/a", firstLoadUncompressedJsBytes: 100 }, { route: "/big", firstLoadUncompressedJsBytes: 200 }], budget)).toEqual([]);
  });
  it("names a route over budget", () => {
    expect(checkBundle([{ route: "/a", firstLoadUncompressedJsBytes: 101 }, { route: "/big", firstLoadUncompressedJsBytes: 201 }], budget)).toHaveLength(2);
  });
});

describe("glass budget", () => {
  const ok = ["a{-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)} :root{--glass-blur: 24px}"];
  it("ignores the prefixed twin and passes", () => {
    expect(checkGlass(ok, 50, budget)).toEqual([]);
  });
  it("fails on too many blurred surfaces, a big blur and big CSS", () => {
    const css = ["a{backdrop-filter:x}b{backdrop-filter:x}c{backdrop-filter:x} :root{--glass-blur:40px}"];
    expect(checkGlass(css, 51, budget)).toHaveLength(3);
  });
});
