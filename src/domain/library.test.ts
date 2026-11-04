import { describe, expect, it } from "vitest";
import { excerpt, libraryType, titleFromFile } from "./library";

describe("library", () => {
  it("maps file names to readable types", () => {
    expect(libraryType("Lessons.PDF")).toBe("application/pdf");
    expect(libraryType("notes.md")).toBe("text/plain");
    expect(libraryType("photo.png")).toBeNull();
    expect(libraryType("noextension")).toBeNull();
  });
  it("makes a title from a file name", () => {
    expect(titleFromFile("late_supplier-delivery.docx")).toBe("late supplier delivery");
  });
  it("shortens text to one tidy line", () => {
    expect(excerpt("a\n\n b   c")).toBe("a b c");
    expect(excerpt("x".repeat(400), 10)).toBe("xxxxxxxxxx…");
  });
});

import { cleanFolderPath, extLabel, folderTree, previewKind } from "./library";
describe("explorer helpers", () => {
  it("cleans a folder path", () => {
    expect(cleanFolderPath(" Contracts / 2026 ")).toBe("Contracts/2026");
    expect(cleanFolderPath("../../etc")).toBe("etc");
    expect(cleanFolderPath("a/b/c/d/e/f")).toBe("a/b/c/d");
    expect(cleanFolderPath(" / ")).toBeNull();
  });
  it("builds a tree that includes parents", () => {
    const t = folderTree(["Contracts/2026", "Drawings"]);
    expect(t.map((n) => n.name)).toEqual(["Contracts", "Drawings"]);
    expect(t[0].children.map((n) => n.path)).toEqual(["Contracts/2026"]);
  });
  it("chooses a preview by type", () => {
    expect(previewKind("image/png", "a.png")).toBe("image");
    expect(previewKind("application/pdf", "a.pdf")).toBe("text");
    expect(previewKind("application/zip", "a.zip")).toBe("other");
    expect(extLabel("plan.docx")).toBe("DOCX");
  });
});
