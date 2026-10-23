import { describe, expect, it } from "vitest";
import { itemFromForm, toColumns } from "./items";

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());

describe("itemFromForm", () => {
  it("reads a task and defaults the status", () => {
    const i = itemFromForm(form({ kind: "task", title: " Lift ", dueDate: "2026-11-01" }));
    expect(i).toMatchObject({ title: "Lift", status: "todo", priority: "normal", dueDate: "2026-11-01", startDate: null, costCode: "" });
  });
  it("reads start date and cost code, and refuses a start after the due date", () => {
    expect(itemFromForm(form({ kind: "task", title: "x", startDate: "2026-10-01", dueDate: "2026-11-01", costCode: " C-10 " }))).toMatchObject({ startDate: "2026-10-01", costCode: "C-10" });
    expect(() => itemFromForm(form({ kind: "task", title: "x", startDate: "2026-12-01", dueDate: "2026-11-01" }))).toThrow();
  });
  it("refuses an empty title, unknown kind, bad date and bad priority", () => {
    expect(() => itemFromForm(form({ kind: "task", title: " " }))).toThrow();
    expect(() => itemFromForm(form({ kind: "change_request", title: "x" }))).toThrow();
    expect(() => itemFromForm(form({ kind: "task", title: "x", dueDate: "1/2/26" }))).toThrow();
    expect(() => itemFromForm(form({ kind: "task", title: "x", priority: "urgent" }))).toThrow();
  });
});

describe("plan fields", () => {
  it("reads site, owner, phase, parent and predecessors, and drops blanks and repeats", () => {
    const f = form({ kind: "task", title: "x", site: " Yard ", ownerId: "u1", phaseId: "p1", parentId: "" });
    f.append("predecessorIds", "a");
    f.append("predecessorIds", "a");
    f.append("predecessorIds", "");
    expect(itemFromForm(f)).toMatchObject({ site: "Yard", ownerId: "u1", phaseId: "p1", parentId: null, predecessorIds: ["a"] });
  });
  it("refuses a site over 80 characters", () => {
    expect(() => itemFromForm(form({ kind: "task", title: "x", site: "y".repeat(81) }))).toThrow();
  });
});

describe("toColumns", () => {
  it("gives decisions no status", () => {
    const base = { title: "t", details: "d", status: "todo", priority: "high", startDate: null, dueDate: null, costCode: "", site: "Yard", ownerId: null, phaseId: "p1", parentId: null, predecessorIds: [] };
    expect(toColumns({ ...base, kind: "task" })).toEqual({ title: "t", details: "d", status: "todo", priority: "high", start_date: null, due_date: null, cost_code: null, site: "Yard", owner_id: null, phase_id: "p1", parent_id: null });
    expect(toColumns({ ...base, kind: "decision" })).toEqual({ title: "t", details: "d" });
    expect(toColumns({ ...base, kind: "risk", status: "closed" })).toEqual({ title: "t", details: "d", status: "closed" });
  });
});
