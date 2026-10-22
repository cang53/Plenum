import { describe, expect, it } from "vitest";
import { itemFromForm, toColumns } from "./items";

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());

describe("itemFromForm", () => {
  it("reads a task and defaults the status", () => {
    const i = itemFromForm(form({ kind: "task", title: " Lift ", dueDate: "2026-11-01" }));
    expect(i).toMatchObject({ title: "Lift", status: "todo", priority: "normal", dueDate: "2026-11-01" });
  });
  it("refuses an empty title, unknown kind, bad date and bad priority", () => {
    expect(() => itemFromForm(form({ kind: "task", title: " " }))).toThrow();
    expect(() => itemFromForm(form({ kind: "change_request", title: "x" }))).toThrow();
    expect(() => itemFromForm(form({ kind: "task", title: "x", dueDate: "1/2/26" }))).toThrow();
    expect(() => itemFromForm(form({ kind: "task", title: "x", priority: "urgent" }))).toThrow();
  });
});

describe("toColumns", () => {
  it("gives decisions no status", () => {
    const base = { title: "t", details: "d", status: "todo", priority: "high", dueDate: null };
    expect(toColumns({ ...base, kind: "task" })).toEqual({ title: "t", details: "d", status: "todo", priority: "high", due_date: null });
    expect(toColumns({ ...base, kind: "decision" })).toEqual({ title: "t", details: "d" });
    expect(toColumns({ ...base, kind: "risk", status: "closed" })).toEqual({ title: "t", details: "d", status: "closed" });
  });
});
