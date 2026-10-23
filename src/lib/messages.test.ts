import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { messages, t } from "@/lib/messages";
import { findHardCodedStrings } from "../../scripts/check-strings.mjs";

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

  // A Dutch value equal to the English one is probably an untranslated copy; shared words are listed here.
  const sameInDutch = ["app.name", "board.statusLabel", "app.items", "settings.project", "risk.open", "audit.item", "link.details", "ui.lang.en", "ui.lang.nl", "ui.segmented.items", "ui.segmented.gantt", "gantt.title", "search.document", "doc.revision"];
  it("translates every Dutch string", () => {
    const untranslated = Object.keys(messages.en).filter(
      (k) => !sameInDutch.includes(k) && (messages.nl as Record<string, string>)[k] === (messages.en as Record<string, string>)[k],
    );
    expect(untranslated).toEqual([]);
  });
});

describe("components", () => {
  it("hard-code no interface strings", () => {
    expect(findHardCodedStrings()).toEqual([]);
  });

  it("catches text, quoted children and label attributes", () => {
    const dir = mkdtempSync(join(tmpdir(), "strings-"));
    writeFileSync(join(dir, "A.tsx"), `<p>Hello there</p>; <b>{"Quoted text"}</b>; <input placeholder="Type here" label="Name" />; <i>{t("ok")}</i>`);
    expect(findHardCodedStrings(dir)).toHaveLength(4);
  });
});
