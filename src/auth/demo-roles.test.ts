import { describe, expect, it } from "vitest";
import { demoRoleEmail, demoRolePickerEnabled } from "./demo-roles";

describe("demo role picker", () => {
  it("is off unless switched on", () => {
    expect(demoRolePickerEnabled({})).toBe(false);
    expect(demoRolePickerEnabled({ DEMO_ROLE_PICKER: "1" })).toBe(true);
  });
  it("only knows the seeded roles", () => {
    expect(demoRoleEmail("project_manager")).toBe("demo.pm@plenum.test");
    expect(demoRoleEmail("admin")).toBeUndefined();
  });
});
