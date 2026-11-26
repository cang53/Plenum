import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAgentIo } from "./agent-io";

// Answers the lookup of where the message sits, then the history query; records the filters of each.
const fake = (where: { thread_id?: string; chatroom_id?: string } | null, rows: unknown[] = []) => {
  const calls: string[] = [];
  const client = {
    from: () => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit"]) q[m] = (...a: unknown[]) => (calls.push(`${m}(${a.join(",")})`), q);
      q.maybeSingle = () => Promise.resolve({ data: where, error: null });
      q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok);
      return q;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
};

describe("agent history", () => {
  it("reads the thread a message is in", async () => {
    const { client, calls } = fake({ thread_id: "t1", chatroom_id: "c1" }, [{ from_name: "Ann", from_address: "a@x", body_text: "hi" }]);
    expect(await supabaseAgentIo(client, "p", "m").history()).toEqual(["Ann: hi"]);
    expect(calls).toContain("eq(thread_id,t1)");
    expect(calls).not.toContain("eq(chatroom_id,c1)");
  });
  it("reads the chatroom, without thread replies, when the message is in no thread", async () => {
    const { client, calls } = fake({ chatroom_id: "c1" });
    await supabaseAgentIo(client, "p", "m").history();
    expect(calls).toContain("eq(chatroom_id,c1)");
    expect(calls).toContain("eq(thread_reply,false)");
  });
  it("reads the project when the chatroom migrations are not applied", async () => {
    const { client, calls } = fake(null);
    await supabaseAgentIo(client, "p", "m").history();
    expect(calls.filter((c) => c.startsWith("eq(")).sort()).toEqual(["eq(id,m)", "eq(project_id,p)"]);
  });
});
