import { describe, expect, it } from "vitest";
import { projectStats, worstHealth } from "@/domain/projectStats";

const t = (o: Partial<Parameters<typeof projectStats>[0][number]>) => ({ project_id: "p", title: "x", status: "todo", due_date: null, is_milestone: false, ...o });

describe("projectStats", () => {
  it("counts done and total", () => {
    const s = projectStats([t({ status: "done" }), t({}), t({})], "2026-11-05").p;
    expect([s.done, s.total, s.health]).toEqual([1, 3, "ok"]);
  });
  it("is at risk with a blocked task and off track with an overdue open one", () => {
    expect(projectStats([t({ status: "blocked" })], "2026-11-05").p.health).toBe("warn");
    expect(projectStats([t({ status: "blocked" }), t({ due_date: "2026-11-01" })], "2026-11-05").p.health).toBe("bad");
    expect(projectStats([t({ status: "done", due_date: "2026-11-01" })], "2026-11-05").p.health).toBe("ok");
  });
  it("picks the earliest open milestone", () => {
    const s = projectStats([t({ is_milestone: true, title: "B", due_date: "2026-12-20" }), t({ is_milestone: true, title: "A", due_date: "2026-12-01" }), t({ is_milestone: true, title: "Old", status: "done", due_date: "2026-10-01" })], "2026-11-05").p;
    expect(s.next?.title).toBe("A");
  });
  it("takes the worst health", () => expect(worstHealth(["ok", "bad", "warn"])).toBe("bad"));
});
