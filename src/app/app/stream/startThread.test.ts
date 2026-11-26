import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/auth/supabase", () => ({ supabaseServer: async () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/server", () => ({ after: () => {} }));

import { startThread } from "./actions";

const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

describe("startThread", () => {
  beforeEach(() => rpc.mockReset());
  it("makes the thread from the message and opens its panel", async () => {
    rpc.mockResolvedValue({ data: "t1", error: null });
    await expect(startThread(form({ projectId: "p1", messageId: "m1", room: "r1", title: " Order status " }))).rejects.toThrow("redirect:/app/stream?project=p1&room=r1&thread=t1");
    expect(rpc).toHaveBeenCalledWith("start_thread", { p_message: "m1", p_title: "Order status" });
  });
  it("does nothing without a title", async () => {
    await startThread(form({ projectId: "p1", messageId: "m1", title: "  " }));
    expect(rpc).not.toHaveBeenCalled();
  });
  it("passes on a database refusal", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("not allowed") });
    await expect(startThread(form({ projectId: "p1", messageId: "m1", title: "x" }))).rejects.toThrow("not allowed");
  });
});
