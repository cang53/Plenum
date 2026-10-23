import { describe, expect, it } from "vitest";
import { buildStream, newSince, suggestionsByMessage } from "./stream";
import type { TimelineMessage } from "./timeline";

const msg = (id: string, from: string, at: string): TimelineMessage => ({ id, source: "email", fromName: null, fromAddress: from, subject: id, bodyText: "", receivedAt: at, attachments: [] });
const now = "2026-10-23T12:00:00Z";

describe("buildStream", () => {
  const days = buildStream(
    [msg("c", "b@x.test", "2026-10-22T09:00:00Z"), msg("a", "A@x.test", "2026-10-23T08:00:00Z"), msg("b", "a@x.test", "2026-10-23T08:05:00Z"), msg("d", "b@x.test", "2026-10-23T09:00:00Z"), msg("e", "a@x.test", "2026-10-10T09:00:00Z")],
    now,
    "Europe/Amsterdam",
  );
  it("puts the newest day first and labels today and yesterday", () => {
    expect(days.map((d) => [d.day, d.relative])).toEqual([["2026-10-23", "today"], ["2026-10-22", "yesterday"], ["2026-10-10", null]]);
  });
  it("lists a day oldest first and groups consecutive messages from one sender", () => {
    expect(days[0].groups.map((g) => g.messages.map((m) => m.id))).toEqual([["a", "b"], ["d"]]);
  });
  it("keeps a day in the project's time zone", () => {
    const late = buildStream([msg("x", "a@x.test", "2026-10-22T23:30:00Z")], now, "Europe/Amsterdam");
    expect(late[0].day).toBe("2026-10-23");
  });
});

describe("newSince", () => {
  const at = (id: string, receivedAt: string) => ({ id, receivedAt }) as TimelineMessage;
  const list = [at("a", "2026-10-22T09:00:00Z"), at("c", "2026-10-23T09:00:00Z"), at("b", "2026-10-22T18:00:00Z")];
  it("points at the oldest unread message and counts them", () => {
    expect(newSince(list, "2026-10-22T12:00:00Z")).toEqual({ id: "b", count: 2 });
  });
  it("is null on a first visit, a bad date, or when nothing is new", () => {
    expect(newSince(list, undefined)).toBeNull();
    expect(newSince(list, "nope")).toBeNull();
    expect(newSince(list, "2026-10-24T00:00:00Z")).toBeNull();
  });
});

describe("suggestionsByMessage", () => {
  const s = (id: string, messageId: string, status: "pending" | "accepted" | "dismissed") => ({ id, messageId, kind: "task" as const, title: id, details: "", status });
  it("groups pending suggestions under their message and skips resolved ones", () => {
    const by = suggestionsByMessage([s("1", "m1", "pending"), s("2", "m1", "pending"), s("3", "m2", "accepted")]);
    expect(by.get("m1")?.map((x) => x.id)).toEqual(["1", "2"]);
    expect(by.has("m2")).toBe(false);
  });
});
