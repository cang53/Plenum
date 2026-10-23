import { describe, expect, it } from "vitest";
import { bulkFromForm } from "./bulk";

const form = (entries: [string, string][]) => {
  const f = new FormData();
  entries.forEach(([k, v]) => f.append(k, v));
  return f;
};

describe("bulkFromForm", () => {
  it("sets a status on the chosen tasks, once each", () => {
    expect(bulkFromForm(form([["op", "status"], ["status", "done"], ["ids", "a"], ["ids", "b"], ["ids", "a"]]))).toEqual({ ids: ["a", "b"], patch: { status: "done" } });
  });
  it("sets and clears the owner and the deadline", () => {
    expect(bulkFromForm(form([["op", "owner"], ["ownerId", "u1"], ["ids", "a"]])).patch).toEqual({ owner_id: "u1" });
    expect(bulkFromForm(form([["op", "owner"], ["ownerId", ""], ["ids", "a"]])).patch).toEqual({ owner_id: null });
    expect(bulkFromForm(form([["op", "due"], ["dueDate", "2026-11-02"], ["ids", "a"]])).patch).toEqual({ due_date: "2026-11-02" });
    expect(bulkFromForm(form([["op", "due"], ["dueDate", ""], ["ids", "a"]])).patch).toEqual({ due_date: null });
  });
  it("refuses bad input", () => {
    expect(() => bulkFromForm(form([["op", "status"], ["status", "done"]]))).toThrow("select at least one");
    expect(() => bulkFromForm(form([["op", "status"], ["status", "nope"], ["ids", "a"]]))).toThrow("unknown status");
    expect(() => bulkFromForm(form([["op", "due"], ["dueDate", "tomorrow"], ["ids", "a"]]))).toThrow("invalid date");
    expect(() => bulkFromForm(form([["op", "title"], ["ids", "a"]]))).toThrow("unknown bulk action");
  });
});
