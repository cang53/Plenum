import { describe, expect, it } from "vitest";
import { navItems } from "./nav";

const paths = (role: string | undefined, admin: boolean) => navItems(role, admin).map((i) => i.path);

describe("navItems", () => {
  it("hides logs and roles from members and contributors", () => {
    for (const role of ["member", "contributor", undefined]) {
      expect(paths(role, false)).not.toContain("/app/logs");
      expect(paths(role, false)).not.toContain("/app/roles");
    }
  });
  it("shows logs to project managers, roles only to admins", () => {
    expect(paths("project_manager", false)).toContain("/app/logs");
    expect(paths("project_manager", false)).not.toContain("/app/roles");
    expect(paths("member", true)).toEqual(expect.arrayContaining(["/app/logs", "/app/roles"]));
  });
  it("shows the project pages in order and hides the old ones", () => {
    expect(paths("member", false).slice(0, 7)).toEqual(["/app", "/app/stream", "/app/gantt", "/app/timelines", "/app/risks", "/app/library", "/app/charter"]);
    for (const old of ["/app/board", "/app/items", "/app/timesheet", "/app/members", "/app/audit"]) expect(paths("project_manager", true)).not.toContain(old);
  });
  it("puts every page in a group and leaves the inbox out of the list", () => {
    const items = navItems("project_manager", true);
    expect(items.every((i) => ["project", "site", "admin"].includes(i.group))).toBe(true);
    expect(items.map((i) => i.path)).not.toContain("/app/notifications");
  });
});
