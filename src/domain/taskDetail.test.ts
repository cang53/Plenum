import { describe, expect, it } from "vitest";
import { activityKey, checklistProgress, checklistText } from "./taskDetail";

describe("task detail", () => {
  it("counts ticked checklist items", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0 });
    expect(checklistProgress([{ id: "a", text: "x", done: true }, { id: "b", text: "y", done: false }])).toEqual({ done: 1, total: 2 });
  });
  it("names known actions and falls back for the rest", () => {
    expect(activityKey("created")).toBe("taskDetail.act.created");
    expect(activityKey("something_new")).toBe("taskDetail.act.other");
  });
  it("trims item text and rejects empty or long text", () => {
    expect(checklistText("  Book crane ")).toBe("Book crane");
    expect(() => checklistText("  ")).toThrow();
    expect(() => checklistText("x".repeat(301))).toThrow();
  });
});
