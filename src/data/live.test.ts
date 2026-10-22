import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { setTaskStatus, taskFromRow } from "@/data/live";

const fake = (result: unknown) => {
  const update = vi.fn();
  const q: Record<string, unknown> = {};
  q.update = (v: unknown) => (update(v), q);
  q.eq = () => q;
  q.select = () => Promise.resolve(result);
  return { client: { from: () => q } as unknown as SupabaseClient, update };
};

describe("taskFromRow", () => {
  it("flattens phase and owner", () => {
    const task = taskFromRow({
      id: "t", title: "Lift", status: "todo", due_date: "2026-11-01", position: 2,
      phases: { name: "Site" }, profiles: { display_name: "Ann" },
    });
    expect(task).toEqual({ id: "t", title: "Lift", status: "todo", phase: "Site", ownerName: "Ann", dueDate: "2026-11-01", position: 2 });
  });
  it("allows no phase or owner", () => {
    const task = taskFromRow({ id: "t", title: "x", status: "done", due_date: null, position: 0, phases: null, profiles: null });
    expect(task.phase).toBeNull();
    expect(task.ownerName).toBeNull();
  });
});

describe("setTaskStatus", () => {
  it("saves a valid status", async () => {
    const { client, update } = fake({ data: [{ id: "t" }], error: null });
    await setTaskStatus(client, "t", "blocked");
    expect(update).toHaveBeenCalledWith({ status: "blocked" });
  });
  it("refuses an unknown status", async () => {
    const { client } = fake({ data: [], error: null });
    await expect(setTaskStatus(client, "t", "nope")).rejects.toThrow("unknown status");
  });
  it("fails when no row changed", async () => {
    const { client } = fake({ data: [], error: null });
    await expect(setTaskStatus(client, "t", "done")).rejects.toThrow("not allowed");
  });
  it("throws database errors", async () => {
    const { client } = fake({ data: null, error: new Error("denied") });
    await expect(setTaskStatus(client, "t", "done")).rejects.toThrow("denied");
  });
});
