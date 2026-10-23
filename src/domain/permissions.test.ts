import { describe, expect, it } from "vitest";
import { ACTIONS, can, effectiveRole } from "./permissions";

describe("can", () => {
  it("lets project managers approve timesheets and send reports", () => {
    expect(can("project_manager", "timesheet.approve")).toBe(true);
    expect(can("project_manager", "report.send")).toBe(true);
  });

  it("lets members approve suggestions only on their own tasks", () => {
    expect(can("member", "suggestion.approveOwnTask")).toBe(true);
    expect(can("member", "suggestion.approveAny")).toBe(false);
    expect(can("member", "plan.edit")).toBe(false);
  });

  it("lets contributors update their tasks, reply and log hours, nothing more", () => {
    expect(can("contributor", "task.updateAssigned")).toBe(true);
    expect(can("contributor", "message.reply")).toBe(true);
    expect(can("contributor", "hours.log")).toBe(true);
    expect(can("contributor", "suggestion.approveOwnTask")).toBe(false);
    expect(can("contributor", "members.manage")).toBe(false);
  });

  it("refuses everything without a role", () => {
    expect(can(null, "message.reply")).toBe(false);
  });
});

describe("effectiveRole", () => {
  it("treats workspace admins as project managers", () => {
    expect(effectiveRole(null, true)).toBe("project_manager");
    expect(effectiveRole("member", true)).toBe("project_manager");
  });

  it("keeps the project role otherwise", () => {
    expect(effectiveRole("member", false)).toBe("member");
    expect(effectiveRole(undefined, false)).toBeNull();
  });
});

describe("ACTIONS", () => {
  it("lists every action the matrix can show, once", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
    expect(ACTIONS.filter((a) => can("project_manager", a))).toHaveLength(ACTIONS.length);
  });
});
