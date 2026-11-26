import { describe, expect, it } from "vitest";
import { summarizeThreads } from "@/domain/myThreads";

const rooms = [{ id: "r1", name: "General", emoji: "" }, { id: "r2", name: "Meme", emoji: "😎" }];
const threads = [
  { id: "t1", title: "Order status", chatroomId: "r1", createdAt: "2026-07-01T09:00:00Z" },
  { id: "t2", title: "Brand", chatroomId: "r2", createdAt: "2026-07-02T09:00:00Z" },
  { id: "t3", title: "Quiet", chatroomId: "r1", createdAt: "2026-06-01T09:00:00Z" },
];

describe("summarizeThreads", () => {
  it("counts replies, names the chatroom and puts the most recently active thread first", () => {
    const out = summarizeThreads(threads, rooms, [
      { threadId: "t1", receivedAt: "2026-07-05T10:00:00Z" }, { threadId: "t1", receivedAt: "2026-07-03T10:00:00Z" }, { threadId: "t2", receivedAt: "2026-07-04T10:00:00Z" },
    ]);
    expect(out.map((x) => x.id)).toEqual(["t1", "t2", "t3"]);
    expect(out[0]).toMatchObject({ replies: 2, lastAt: "2026-07-05T10:00:00Z", roomName: "General", roomEmoji: "" });
    expect(out[1]).toMatchObject({ roomName: "Meme", roomEmoji: "😎" });
  });
  it("uses the start of a thread with no replies as its last activity", () => {
    expect(summarizeThreads(threads, rooms, [])[0]).toMatchObject({ id: "t2", replies: 0, lastAt: "2026-07-02T09:00:00Z" });
  });
  it("copes with a chatroom that is gone", () => {
    expect(summarizeThreads([threads[0]], [], [])[0]).toMatchObject({ roomName: "", roomEmoji: "" });
  });
});
