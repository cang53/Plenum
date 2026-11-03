import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
vi.mock("@/auth/supabase", () => ({
  supabaseServer: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({ insert: (row: unknown) => { insert(row); return { select: () => ({ single: async () => ({ data: { id: "p1" }, error: null }) }) }; } }),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));

import { createProject } from "./actions";

const form = (name: string, workspaceId = "w1") => { const f = new FormData(); f.set("name", name); f.set("workspaceId", workspaceId); return f; };

describe("createProject", () => {
  beforeEach(() => insert.mockClear());
  it("creates the project and opens it", async () => {
    await expect(createProject(form("Harbour"))).rejects.toThrow("redirect:/app?project=p1");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: "w1", name: "Harbour", created_by: "u1" }));
  });
  it("refuses an empty name", async () => {
    await expect(createProject(form("  "))).rejects.toThrow("redirect:/app/projects?error=1");
    expect(insert).not.toHaveBeenCalled();
  });
});
