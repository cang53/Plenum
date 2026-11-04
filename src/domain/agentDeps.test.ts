import { describe, expect, it } from "vitest";
import { findDependencies, matchTask } from "./agentDeps";

const t = (id: string, title: string) => ({ id, title, startDate: null, dueDate: null, status: "todo" });
// The tasks of the demo project, including the wrongly created one from the first attempt.
const tasks = [t("cab", "Install control cabinet"), t("conv", "Install conveyer modules"), t("old", "Wait for complete installation of conveyor modules before starting control cabinet installation"), t("pour", "Pour slab")];
const link = (text: string) => findDependencies(text, tasks).found.map((d) => [d.predecessorId, d.successorId]);

describe("findDependencies", () => {
  it("reads the three attempts from the conversation", () => {
    expect(link("we cannot start installing the control cabinet until the convoyer modules are completely installed")).toEqual([["conv", "cab"]]);
    expect(link('@agent we cannot start installing the control cabinet until the convoyer modules are completely installed')).toEqual([["conv", "cab"]]);
    expect(link('@agent the task "install control cabinet" cannot start before the task "Install conveyer modules" is finished')).toEqual([["conv", "cab"]]);
  });
  it("reads other phrasings", () => {
    expect(link("Install control cabinet depends on conveyor modules")).toEqual([["conv", "cab"]]);
    expect(link("Conveyor modules installation must be finished before control cabinet can start")).toEqual([["conv", "cab"]]);
    expect(link("After the conveyor modules are installed, the control cabinet can start")).toEqual([["conv", "cab"]]);
    expect(link("Control cabinet can only start after conveyor modules")).toEqual([["conv", "cab"]]);
  });
  it("does not link a task to itself or to unknown work", () => {
    const r = findDependencies("the control cabinet cannot start until the roof is finished", tasks);
    expect(r.found).toEqual([]);
    expect(r.unresolved).toHaveLength(1);
    expect(link("the control cabinet cannot start until the control cabinet is finished")).toEqual([]);
  });
  it("ignores ordinary sentences", () => {
    expect(findDependencies("Pour slab on Monday, lunch is at noon.", tasks)).toEqual({ found: [], unresolved: [] });
  });
  it("matches fuzzy names", () => {
    expect(matchTask("convoyer modules", tasks)?.id).toBe("conv");
  });
});
