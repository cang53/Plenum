import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./shell.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("shell.css", () => {
  it("uses tokens only, no raw colors", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
  it("only reads tokens that exist", () => {
    // --icon is set per link inside shell.css itself.
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) if (m[1] !== "--icon") expect(tokens, m[1]).toContain(`${m[1]}:`);
  });
  it("has a 176px sidebar, a phone bar and glass from tokens", () => {
    expect(css).toContain("grid-template-columns: 11rem");
    expect(css).toContain("max-width: 48rem");
    expect(css).toContain("var(--ambient-background)");
    expect(css).toContain("backdrop-filter: var(--glass-blur)");
  });
  it("gives every nav page an icon", () => {
    const pages = ["stream", "board", "gantt", "items", "sitelog", "timesheet", "timesheets", "members", "audit", "reports", "roles", "privacy", "settings", "notifications"];
    for (const page of pages) expect(css, page).toContain(`[href^="/app/${page}"]`);
  });
});
