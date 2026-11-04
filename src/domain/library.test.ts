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
