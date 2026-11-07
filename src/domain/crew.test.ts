import { describe, expect, it } from "vitest";
import { crewByRole } from "./crew";

const label = (r: string) => `L:${r}`;
describe("crewByRole", () => {
  it("groups people by role in a fixed order and leaves out empty roles", () => {
    const c = crewByRole(label, [
      { name: "Mia K", email: "m@x", role: "contributor" },
      { name: "", email: "pat@x", role: "project_manager" },
      { name: "Jo D", email: "j@x", role: "project_manager" },
    ], []);
    expect(c.map((x) => x.role)).toEqual(["L:project_manager", "L:contributor"]);
    expect(c[0].people.map((p) => p.name)).toEqual(["pat@x", "Jo D"]);
  });
  it("lists pending invites with the role they were invited for", () => {
    const c = crewByRole(label, [], [{ email: "r.smit@x", role: "member" }]);
    expect(c).toEqual([{ role: "L:member", people: [], pending: [{ initials: expect.any(String), email: "r.smit@x" }] }]);
  });
  it("is empty without members or invites", () => expect(crewByRole(label, [], [])).toEqual([]));
});
