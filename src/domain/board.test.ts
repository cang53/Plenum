import { describe, expect, it } from "vitest";
import { buildColumns, distinct, groupTasks, weekStart, initials, moveTask, projectPrefix, taskKey, type BoardTask } from "./board";

const tasks: BoardTask[] = [
  { id: "1", number: 1, title: "Lifting works", status: "in_progress", phase: "Site works", ownerName: "Jonas", dueDate: "2026-11-14", priority: "normal", position: 0, site: "Yard" },
  { id: "2", number: 2, title: "Gearbox delivery", status: "blocked", phase: "Procurement", ownerName: "Marta", dueDate: "2026-11-28", priority: "normal", position: 0, site: null },
  { id: "3", number: 3, title: "Cabinet drawings", status: "in_progress", phase: "Engineering", ownerName: "Aylin", dueDate: "2026-11-07", priority: "normal", position: 1, site: null },
  { id: "4", number: 4, title: "Install gearbox", status: "todo", phase: "Site works", ownerName: "Jonas", dueDate: "2026-12-05", priority: "normal", position: 0, site: null },
];

describe("buildColumns", () => {
  it("returns the four status columns in order", () => {
    expect(buildColumns(tasks).map((c) => c.status)).toEqual(["todo", "in_progress", "blocked", "done"]);
  });

  it("orders cards by position", () => {
    const inProgress = buildColumns(tasks)[1];
    expect(inProgress.tasks.map((t) => t.title)).toEqual(["Lifting works", "Cabinet drawings"]);
  });

  it("filters by phase and owner", () => {
    const columns = buildColumns(tasks, { phase: "Site works", owner: "Jonas" });
    expect(columns.flatMap((c) => c.tasks).map((t) => t.id)).toEqual(["4", "1"]);
  });
});

describe("site filter", () => {
  it("shows only the tasks at the chosen site", () => {
    const columns = buildColumns(tasks, { site: "Yard" });
    expect(columns.flatMap((c) => c.tasks).map((t) => t.id)).toEqual(["1"]);
  });
});

describe("moveTask", () => {
  it("moves a task to the end of the target column", () => {
    const moved = moveTask(tasks, "4", "in_progress");
    const task = moved.find((t) => t.id === "4")!;
    expect(task.status).toBe("in_progress");
    expect(task.position).toBe(2);
  });

  it("leaves the list unchanged for the same column or an unknown task", () => {
    expect(moveTask(tasks, "1", "in_progress")).toBe(tasks);
    expect(moveTask(tasks, "nope", "done")).toBe(tasks);
  });

  it("does not change the original list", () => {
    moveTask(tasks, "2", "done");
    expect(tasks.find((t) => t.id === "2")!.status).toBe("blocked");
  });
});

describe("distinct", () => {
  it("returns sorted unique values without blanks", () => {
    expect(distinct(["b", null, "a", "b"])).toEqual(["a", "b"]);
  });
});

describe("card marks", () => {
  it("builds a short ID and initials", () => {
    expect(taskKey("P-204", 21)).toBe("P-204-21");
    expect(projectPrefix("Pump skid P-204")).toBe("P-204");
    expect(projectPrefix("Line 4 retrofit, Ghent plant")).toBe("L4R");
    expect(initials("Jan de Wit")).toBe("JD");
    expect(initials("  marta ")).toBe("M");
  });
});

describe("groupTasks", () => {
  it("groups by phase with the empty group last", () => {
    const groups = groupTasks([...tasks, { ...tasks[0], id: "5", phase: null }], "phase");
    expect(groups.map((g) => g.key)).toEqual(["Engineering", "Procurement", "Site works", ""]);
  });

  it("groups by owner", () => {
    expect(groupTasks(tasks, "owner").map((g) => [g.key, g.tasks.length])).toEqual([["Aylin", 1], ["Jonas", 2], ["Marta", 1]]);
  });

  it("groups by the Monday of the due week", () => {
    expect(weekStart("2026-11-14")).toBe("2026-11-09");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekStart(null)).toBe("");
    expect(groupTasks(tasks, "week").map((g) => g.key)).toEqual(["2026-11-02", "2026-11-09", "2026-11-23", "2026-11-30"]);
  });
});

describe("due filter", () => {
  const due = (dueDate: string | null) => ({ ...tasks[0]!, id: `d-${dueDate}`, status: "todo" as const, dueDate });
  const list = [due("2026-10-20"), due("2026-10-28"), due("2026-11-20"), due(null)];
  const ids = (due: "overdue" | "week" | "none") => buildColumns(list, { due, today: "2026-10-27" })[0]!.tasks.map((t) => t.dueDate);
  it("finds overdue, this week and undated tasks", () => {
    expect(ids("overdue")).toEqual(["2026-10-20"]);
    expect(ids("week")).toEqual(["2026-10-28"]);
    expect(ids("none")).toEqual([null]);
  });
});
