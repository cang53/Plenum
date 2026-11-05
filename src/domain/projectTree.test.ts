import { describe, expect, it } from "vitest";
import { buildTree } from "@/domain/projectTree";

const parents = [{ id: "n", name: "Northside" }, { id: "d", name: "Dock 3" }];
const projects = [
  { id: "1", name: "Loading bay", parent_id: "d" },
  { id: "2", name: "Cold storage", parent_id: "d" },
  { id: "3", name: "Website" },
  { id: "4", name: "Orphan", parent_id: "gone" },
];

describe("buildTree", () => {
  it("nests projects under their parent, sorted, with standalone last", () => {
    const t = buildTree(parents, projects);
    expect(t.map((b) => b.parent?.name ?? null)).toEqual(["Dock 3", "Northside", null]);
    expect(t[0].projects.map((p) => p.name)).toEqual(["Cold storage", "Loading bay"]);
    expect(t[2].projects.map((p) => p.name)).toEqual(["Orphan", "Website"]);
  });
  it("keeps an empty parent without a search and hides it with one", () => {
    expect(buildTree(parents, projects).some((b) => b.parent?.id === "n")).toBe(true);
    expect(buildTree(parents, projects, "bay").map((b) => b.parent?.id ?? null)).toEqual(["d"]);
  });
  it("matching a parent name shows all of its projects", () => {
    expect(buildTree(parents, projects, "dock")[0].projects).toHaveLength(2);
  });
});
