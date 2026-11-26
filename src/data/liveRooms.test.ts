import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listThreadChips, listTimelineMessages } from "@/data/live";

// A query that records its filters and answers with the next result when awaited.
const fake = (results: Record<string, unknown>[]) => {
  const calls: string[] = [];
  const client = {
    from: (table: string) => {
      const res = results.shift() ?? { data: [], error: null };
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "or", "gte", "lt", "order", "limit", "not"]) q[m] = (...a: unknown[]) => (calls.push(`${table}.${m}(${a.join(",")})`), q);
      q.then = (ok: (v: unknown) => unknown) => Promise.resolve(res).then(ok);
      return q;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
};

describe("listThreadChips", () => {
  it("counts the replies of each thread and lists who wrote them once", async () => {
    const { client } = fake([
      { data: [{ id: "t1", root_message_id: "m1" }], error: null },
      { data: [{ thread_id: "t1", from_name: "Kaiya", from_address: "k@x" }, { thread_id: "t1", from_name: "Kim", from_address: "k2@x" }, { thread_id: "t1", from_name: "", from_address: "a@x" }], error: null },
    ]);
    expect(await listThreadChips(client, "p", ["m1", "m2"])).toEqual(new Map([["m1", { id: "t1", count: 3, initials: ["K", "A"] }]]));
  });
  it("is empty when no message starts a thread or there is nothing to look up", async () => {
    expect((await listThreadChips(fake([{ data: [], error: null }]).client, "p", ["m1"])).size).toBe(0);
    expect((await listThreadChips(fake([]).client, "p", [])).size).toBe(0);
  });
});

describe("listTimelineMessages in a chatroom", () => {
  it("asks only for that chatroom's messages that are not thread replies", async () => {
    const { client, calls } = fake([{ data: [], error: null }]);
    await listTimelineMessages(client, "p", undefined, {}, 1, "room-1");
    expect(calls).toContain("messages.eq(chatroom_id,room-1)");
    expect(calls).toContain("messages.eq(thread_reply,false)");
  });
  it("shows every message when the chatroom columns do not exist yet", async () => {
    const { client, calls } = fake([{ data: null, error: { code: "42703" } }, { data: null, error: { code: "42703" } }, { data: [], error: null }]);
    expect((await listTimelineMessages(client, "p", undefined, {}, 1, "room-1")).rows).toEqual([]);
    expect(calls.filter((c) => c === "messages.eq(chatroom_id,room-1)")).toHaveLength(2);
  });
  it("does not filter without a chatroom", async () => {
    const { client, calls } = fake([{ data: [], error: null }]);
    await listTimelineMessages(client, "p");
    expect(calls.some((c) => c.includes("chatroom_id"))).toBe(false);
  });
});
