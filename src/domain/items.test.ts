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

describe("milestones", () => {
  it("reads the milestone box and writes it for tasks", () => {
    expect(itemFromForm(form({ kind: "task", title: "x", isMilestone: "on" })).isMilestone).toBe(true);
    const plain = itemFromForm(form({ kind: "task", title: "x" }));
    expect(plain.isMilestone).toBe(false);
    expect(toColumns(plain)).toMatchObject({ is_milestone: false });
  });
});

describe("risks and issues", () => {
  it("defaults to a risk and refuses an unknown type", () => {
    expect(itemFromForm(form({ kind: "risk", title: "x" })).riskKind).toBe("risk");
    expect(itemFromForm(form({ kind: "risk", title: "x", riskKind: "issue", dueDate: "2026-12-01" }))).toMatchObject({ riskKind: "issue", dueDate: "2026-12-01" });
    expect(() => itemFromForm(form({ kind: "risk", title: "x", riskKind: "worry" }))).toThrow();
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
    const base = { title: "t", details: "d", status: "todo", riskKind: "issue", priority: "high", startDate: null, dueDate: null, costCode: "", site: "Yard", isMilestone: false, ownerId: null, phaseId: "p1", parentId: null, predecessorIds: [] };
    expect(toColumns({ ...base, kind: "task" })).toEqual({ title: "t", details: "d", status: "todo", priority: "high", start_date: null, due_date: null, cost_code: null, site: "Yard", is_milestone: false, owner_id: null, phase_id: "p1", parent_id: null });
    expect(toColumns({ ...base, kind: "decision" })).toEqual({ title: "t", details: "d" });
    expect(toColumns({ ...base, kind: "risk", status: "closed", dueDate: "2026-12-01", ownerId: "u1" })).toEqual({ title: "t", details: "d", status: "closed", kind: "issue", due_date: "2026-12-01", owner_id: "u1" });
  });
});

describe("itemFromForm source message", () => {
  const form = (src?: string) => {
    const f = new FormData();
    f.set("kind", "decision");
    f.set("title", "Move install");
    if (src !== undefined) f.set("sourceMessageId", src);
    return f;
  };
  it("keeps a message id and rejects anything that is not one", () => {
    expect(itemFromForm(form("0f8fad5b-d9cb-469f-a165-70867728950e")).sourceMessageId).toBe("0f8fad5b-d9cb-469f-a165-70867728950e");
    expect(itemFromForm(form()).sourceMessageId).toBeNull();
    expect(() => itemFromForm(form("x; drop table"))).toThrow("unknown source message");
  });
});
