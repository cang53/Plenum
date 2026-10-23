import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { acceptSuggestion, dismissSuggestion, setTaskStatus, taskFromRow } from "@/data/live";

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
      id: "t", title: "Lift", status: "todo", due_date: "2026-11-01", priority: "normal", position: 2,
      phases: { name: "Site" }, profiles: { display_name: "Ann" },
    });
    expect(task).toEqual({ id: "t", title: "Lift", status: "todo", phase: "Site", ownerName: "Ann", dueDate: "2026-11-01", priority: "normal", position: 2 });
  });
  it("allows no phase or owner", () => {
    const task = taskFromRow({ id: "t", title: "x", status: "done", due_date: null, priority: "high", position: 0, phases: null, profiles: null });
    expect(task.phase).toBeNull();
    expect(task.priority).toBe("high");
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

describe("acceptSuggestion", () => {
  it("sends the edited wording to the accept function", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as unknown as SupabaseClient;
    await acceptSuggestion(client, "s1", { kind: "risk", title: " Crane lost ", details: " Ends 30 Nov " });
    expect(rpc).toHaveBeenCalledWith("accept_suggestion", { p_id: "s1", p_kind: "risk", p_title: "Crane lost", p_details: "Ends 30 Nov" });
  });
  it("refuses an empty title", async () => {
    const rpc = vi.fn();
    await expect(acceptSuggestion({ rpc } as unknown as SupabaseClient, "s1", { kind: "task", title: " ", details: "" })).rejects.toThrow("title");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("throws database errors", async () => {
    const client = { rpc: () => Promise.resolve({ error: new Error("denied") }) } as unknown as SupabaseClient;
    await expect(acceptSuggestion(client, "s1", { kind: "task", title: "x", details: "" })).rejects.toThrow("denied");
  });
});

describe("dismissSuggestion", () => {
  it("marks a pending suggestion dismissed", async () => {
    const { client, update } = fake({ data: [{ id: "s1" }], error: null });
    await dismissSuggestion(client, "s1");
    expect(update).toHaveBeenCalledWith({ status: "dismissed" });
  });
  it("fails when nothing was pending or allowed", async () => {
    const { client } = fake({ data: [], error: null });
    await expect(dismissSuggestion(client, "s1")).rejects.toThrow("not allowed");
  });
});
