import { describe, expect, it } from "vitest";
import type { BoardTask } from "./board";
import { byPhase, dueThisWeek, summarize } from "./overview";

const task = (id: string, status: BoardTask["status"], dueDate: string | null): BoardTask => ({ id, title: id, status, phase: null, ownerName: "A", dueDate, priority: "normal", position: 0, site: null });

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

describe("byPhase and dueThisWeek", () => {
  const t = (id: string, status: BoardTask["status"], phase: string | null, dueDate: string | null) => ({ ...task(id, status, dueDate), phase });

  it("counts each phase on its own, in first-seen order", () => {
    const rows = byPhase([t("a", "done", "Build", null), t("b", "blocked", "Build", null), t("c", "in_progress", null, null), t("d", "todo", "Build", null)]);
    expect(rows).toEqual([
      { phase: "Build", done: 1, blocked: 1, active: 0, total: 3 },
      { phase: null, done: 0, blocked: 0, active: 1, total: 1 },
    ]);
  });

  it("counts open tasks due Monday to Sunday and the late or blocked ones among them", () => {
    // 2026-10-23 is a Friday: the week runs 19 to 25 October.
    const r = dueThisWeek([t("a", "todo", null, "2026-10-19"), t("b", "blocked", null, "2026-10-25"), t("c", "todo", null, "2026-10-26"), t("d", "done", null, "2026-10-20"), t("e", "todo", null, "2026-10-24"), t("f", "todo", null, null)], "2026-10-23");
    expect(r).toEqual({ due: 3, atRisk: 2 });
  });
});
