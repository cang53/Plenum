import { describe, expect, it } from "vitest";
import type { BoardTask } from "./board";
import { summarize } from "./overview";

const task = (id: string, status: BoardTask["status"], dueDate: string | null): BoardTask => ({ id, title: id, status, phase: null, ownerName: "A", dueDate, position: 0 });

describe("summarize", () => {
  it("counts statuses and the done percentage", () => {
    const p = summarize([task("a", "done", null), task("b", "todo", null), task("c", "in_progress", null), task("d", "done", null)], "2026-01-10");
    expect(p.counts).toEqual({ todo: 1, in_progress: 1, blocked: 0, done: 2 });
    expect(p.percentDone).toBe(50);
  });

  it("is zero for an empty project", () => {
    expect(summarize([], "2026-01-10")).toMatchObject({ total: 0, percentDone: 0, attention: [] });
  });

  it("flags blocked and overdue open tasks, oldest due first, but not done ones", () => {
    const p = summarize([task("late", "todo", "2026-01-05"), task("old", "done", "2026-01-01"), task("stuck", "blocked", null), task("ok", "todo", "2026-01-10"), task("later", "in_progress", "2026-01-02")], "2026-01-10");
    expect(p.attention.map((t) => t.id)).toEqual(["later", "late", "stuck"]);
  });
});
