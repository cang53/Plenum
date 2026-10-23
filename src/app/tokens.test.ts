import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/^\s*(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gim)].map((m) => [m[1], m[2]]));
}

const light = block(":root");
const dark = { ...light, ...block('[data-theme="dark"]') };

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

describe.each([["light", light], ["dark", dark]])("%s token contrast", (_name, tokens) => {
  it.each(pairs)("%s on %s is at least %s:1", (fg, bg, min) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("flat look", () => {
  it("keeps high-contrast and reduced-motion blocks and no glass, blur or gradients", () => {
    expect(css).toContain("prefers-contrast: more");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/gradient\(|rgba?\(/i);
    expect(css).not.toMatch(/--glass|blur/);
  });
  it("uses the target palette", () => {
    expect(light["--primary"]).toBe("#2b4fd0");
    expect(dark["--primary"]).toBe("#8fa8ff");
    expect(dark["--surface-subtle"]).toBe("#0e1116");
  });
});
