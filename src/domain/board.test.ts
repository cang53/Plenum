import { describe, expect, it } from "vitest";
import { buildColumns, distinct, moveTask, type BoardTask } from "./board";

const tasks: BoardTask[] = [
  { id: "1", title: "Lifting works", status: "in_progress", phase: "Site works", ownerName: "Jonas", dueDate: "2026-11-14", priority: "normal", position: 0 },
  { id: "2", title: "Gearbox delivery", status: "blocked", phase: "Procurement", ownerName: "Marta", dueDate: "2026-11-28", priority: "normal", position: 0 },
  { id: "3", title: "Cabinet drawings", status: "in_progress", phase: "Engineering", ownerName: "Aylin", dueDate: "2026-11-07", priority: "normal", position: 1 },
  { id: "4", title: "Install gearbox", status: "todo", phase: "Site works", ownerName: "Jonas", dueDate: "2026-12-05", priority: "normal", position: 0 },
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
