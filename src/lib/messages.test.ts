import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { messages, t } from "@/lib/messages";

describe("t", () => {
  it("returns the English string for a key", () => {
    expect(t("app.name")).toBe("Plenum");
  });

  it("returns the Dutch string when asked", () => {
    expect(t("app.signOut", "nl")).toBe("Uitloggen");
  });

  it("has no empty strings in any language", () => {
    for (const lang of Object.values(messages)) {
      for (const value of Object.values(lang)) expect(value.trim()).not.toBe("");
    }
  });

  it("has the same keys in every language", () => {
    const keys = Object.keys(messages.en).sort();
    for (const lang of Object.values(messages)) expect(Object.keys(lang).sort()).toEqual(keys);
  });
});

describe("components", () => {
  // Visible text in a .tsx file must come from t(); this catches text typed between tags or in label attributes.
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : [],
    );
  it("hard-code no interface strings", () => {
    const found: string[] = [];
    for (const f of files("src/app")) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/(?<![\w=)\]])>\s*([A-Za-z][^<>{}\n]*[a-z]{3}[^<>{}\n]*)\s*</g)) found.push(`${f}: ${m[1]}`);
      for (const m of src.matchAll(/\b(?:aria-label|placeholder|title|alt)="([^"]+)"/g)) found.push(`${f}: ${m[1]}`);
    }
    expect(found).toEqual([]);
  });
});
