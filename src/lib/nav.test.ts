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
  it("puts the rail pages in the canvas order", () => {
    const rail = navItems("member", false).filter((i) => i.group === "rail").map((i) => i.path);
    expect(rail).toEqual(["/app", "/app/stream", "/app/gantt", "/app/board", "/app/items", "/app/risks", "/app/library", "/app/reports", "/app/members"]);
  });
  it("keeps settings in the top bar and the inbox out of the list", () => {
    const items = navItems("project_manager", true);
    expect(items.find((i) => i.path === "/app/settings")?.group).toBe("top");
    expect(items.map((i) => i.path)).not.toContain("/app/notifications");
  });
});
