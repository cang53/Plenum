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

describe("fallbacks", () => {
  it("defines reduced-transparency, high-contrast and no-backdrop-filter blocks", () => {
    expect(css).toContain("prefers-reduced-transparency: reduce");
    expect(css).toContain("prefers-contrast: more");
    expect(css).toContain("@supports not (backdrop-filter");
  });
});

// Glass is translucent, so text is checked on the fill blended over the worst-case ambient
// colour (the end of the ambient gradient that is furthest from the text colour).
const rgba = (v: string): [number, number, number, number] => {
  const h = v.replace("#", "");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
};
const over = (top: string, bottom: string) => {
  const [r, g, b, a] = rgba(top);
  const base = rgba(bottom);
  return "#" + [r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
};
const rawVars = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/^\s*(--[\w-]+):\s*(#[0-9a-f]{6,8})\s*;/gim)].map((m) => [m[1], m[2]]));
};
const lightRaw = rawVars(":root");
const darkRaw = { ...lightRaw, ...rawVars('[data-theme="dark"]') };
const ambient = { light: ["#e2eae4", "#edf1e9", "#e1ebe7", "#ffffff"], dark: ["#15291e", "#23382a", "#172d22", "#000000"] };

describe.each([["light", lightRaw], ["dark", darkRaw]] as const)("%s text on glass over the worst-case background", (name, t) => {
  const grounds = ambient[name];
  it.each(["--glass", "--glass-dense", "--glass-soft", "--glass-selected"])("%s keeps text at 4.5:1", (fill) => {
    for (const ground of grounds) {
      const bg = over(t[fill], ground);
      for (const fg of ["--text", "--text-secondary", "--text-muted"]) {
        expect(ratio(t[fg], bg), `${fg} on ${fill} over ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
