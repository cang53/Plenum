import { describe, expect, it } from "vitest";
import { navItems } from "./nav";

const paths = (role: string | undefined, admin: boolean) => navItems(role, admin).map((i) => i.path);

describe("navItems", () => {
  it("hides audit and roles from members and contributors", () => {
    for (const role of ["member", "contributor", undefined]) {
      expect(paths(role, false)).not.toContain("/app/audit");
      expect(paths(role, false)).not.toContain("/app/roles");
    }
  });
  it("shows audit to project managers, roles only to admins", () => {
    expect(paths("project_manager", false)).toContain("/app/audit");
    expect(paths("project_manager", false)).not.toContain("/app/roles");
    expect(paths("member", true)).toEqual(expect.arrayContaining(["/app/audit", "/app/roles"]));
  });
});
