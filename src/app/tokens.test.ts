import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*(#[0-9a-f]{6}|var\(--[\w-]+\))\s*;/gim)) out[m[1]] = m[2];
  return out;
}

// Light is the default; dark overrides it. A var() alias resolves in the same theme.
const lightTokens = block(":root");
const darkTokens = { ...lightTokens, ...block(':root[data-theme="dark"]') };
const resolve = (set: Record<string, string>, k: string): string => {
  const v = set[k];
  const m = v?.match(/^var\((--[\w-]+)\)$/);
  return m ? resolve(set, m[1]) : v;
};

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio]: 4.5 for text, 3 for focus ring, borders and status marks.
const pairs: [string, string, number][] = [
  ["--text", "--surface", 4.5],
  ["--text", "--surface-subtle", 4.5],
  ["--text", "--surface-muted", 4.5],
  ["--text-secondary", "--surface", 4.5],
  ["--text-secondary", "--surface-muted", 4.5],
  ["--text-muted", "--surface", 4.5],
  ["--text-muted", "--surface-subtle", 4.5],
  ["--on-primary", "--primary", 4.5],
  ["--on-mine", "--mine", 4.5],
  ["--primary", "--surface", 4.5],
  ["--accent-text", "--accent-soft", 4.5],
  ["--danger", "--danger-surface", 4.5],
  ["--success", "--success-surface", 4.5],
  ["--warning", "--warning-surface", 4.5],
  ["--info", "--info-surface", 4.5],
  ["--focus-ring", "--surface", 3],
  ["--border-strong", "--surface", 3],
  ["--status-todo", "--surface", 3],
  ["--status-progress", "--surface", 3],
  ["--status-blocked", "--surface", 3],
  ["--status-done", "--surface", 3],
];

describe.each([["light", lightTokens], ["dark", darkTokens]] as const)("%s token contrast", (_name, set) => {
  it.each(pairs)("%s on %s is at least %s:1", (fg, bg, min) => {
    expect(resolve(set, fg), fg).toBeDefined();
    expect(resolve(set, bg), bg).toBeDefined();
    expect(ratio(resolve(set, fg), resolve(set, bg))).toBeGreaterThanOrEqual(min);
  });
});

describe("light-first look", () => {
  it("keeps high-contrast, reduced-transparency and reduced-motion fallbacks", () => {
    expect(css).toContain("prefers-contrast: more");
    expect(css).toContain("prefers-reduced-transparency: reduce");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
  it("uses the white and Apple colours palette with the system font stack", () => {
    expect(lightTokens["--primary"]).toBe("#0071e3");
    expect(lightTokens["--ground"]).toBe("#fbfbfd");
    expect(lightTokens["--surface-subtle"]).toBe("#eef4fd");
    expect(darkTokens["--surface-subtle"]).toBe("#121412");
    expect(css).toMatch(/--font: -apple-system, BlinkMacSystemFont, "SF Pro Text"/);
    expect(css).not.toMatch(/outfit/i);
  });
  it("gives each rail section its own colour", () => {
    const names = ["overview", "stream", "plan", "board", "items", "risks", "library", "reports", "team"];
    const light = css.slice(0, css.indexOf(":root[data-theme"));
    const colours = names.map((n) => light.match(new RegExp(`--section-${n}:\\s*(#[0-9a-f]{6})`, "i"))?.[1]);
    colours.forEach((c, i) => expect(c, names[i]).toBeDefined());
    expect(new Set(colours).size).toBe(names.length);
  });
});
