import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { acceptSuggestion, suggestionAccuracy, bulkUpdateTasks, dismissSuggestion, setTaskStatus, taskFromRow } from "@/data/live";

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
      id: "t", title: "Lift", status: "todo", due_date: "2026-11-01", priority: "normal", position: 2, created_at: "2026-10-01", site: "Yard",
      phases: { name: "Site" }, profiles: { display_name: "Ann" },
    }, 7);
    expect(task).toEqual({ id: "t", title: "Lift", status: "todo", phase: "Site", ownerName: "Ann", dueDate: "2026-11-01", priority: "normal", position: 2, number: 7, site: "Yard", waitingOn: null });
  });
  it("names the message a blocked task waits on", () => {
    const row = { id: "t", title: "x", status: "blocked" as const, due_date: null, priority: "normal" as const, position: 0, created_at: "2026-10-01", site: "", phases: null, profiles: null, source: { subject: "Re: delivery" } };
    expect(taskFromRow(row, 1).waitingOn).toBe("Re: delivery");
    expect(taskFromRow({ ...row, status: "todo" }, 1).waitingOn).toBeNull();
  });
  it("allows no phase or owner", () => {
    const task = taskFromRow({ id: "t", title: "x", status: "done", due_date: null, priority: "high", position: 0, created_at: "2026-10-01", site: "", phases: null, profiles: null }, 1);
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

describe("bulkUpdateTasks", () => {
  const fakeIn = (data: unknown[]) => {
    const update = vi.fn();
    const q: Record<string, unknown> = {};
    q.update = (v: unknown) => (update(v), q);
    q.in = () => q;
    q.select = () => Promise.resolve({ data, error: null });
    return { client: { from: () => q } as unknown as SupabaseClient, update };
  };
  it("updates all chosen tasks", async () => {
    const { client, update } = fakeIn([{ id: "a" }, { id: "b" }]);
    await bulkUpdateTasks(client, ["a", "b"], { status: "done" });
    expect(update).toHaveBeenCalledWith({ status: "done" });
  });
  it("fails when some tasks were not changed", async () => {
    await expect(bulkUpdateTasks(fakeIn([{ id: "a" }]).client, ["a", "b"], { status: "done" })).rejects.toThrow("not found or not allowed");
  });
});

describe("suggestionAccuracy", () => {
  it("counts accepted and dismissed for the project", async () => {
    const statuses: string[] = [];
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = (c: string, v: string) => {
      if (c === "status") statuses.push(v);
      return c === "status" ? Promise.resolve({ count: v === "accepted" ? 5 : 2, error: null }) : q;
    };
    const client = { from: () => q } as unknown as SupabaseClient;
    expect(await suggestionAccuracy(client, "p")).toEqual({ accepted: 5, dismissed: 2 });
    expect(statuses.sort()).toEqual(["accepted", "dismissed"]);
  });
});
