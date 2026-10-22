import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentProject, listProjects, type Project } from "@/data/projects";

const a: Project = { id: "a", name: "Alpha", email_slug: "alpha" };
const b: Project = { id: "b", name: "Beta", email_slug: "beta" };

describe("currentProject", () => {
  it("picks the chosen project", () => expect(currentProject([a, b], "b")).toBe(b));
  it("falls back to the first when the choice is unknown", () => expect(currentProject([a, b], "zzz")).toBe(a));
  it("is undefined with no projects", () => expect(currentProject([], "a")).toBeUndefined());
});

describe("listProjects", () => {
  const fake = (result: unknown) => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.is = () => q;
    q.order = () => Promise.resolve(result);
    return { from: () => q } as unknown as SupabaseClient;
  };
  it("returns rows", async () => expect(await listProjects(fake({ data: [a], error: null }))).toEqual([a]));
  it("throws on error", async () => {
    await expect(listProjects(fake({ data: null, error: new Error("denied") }))).rejects.toThrow("denied");
  });
});
