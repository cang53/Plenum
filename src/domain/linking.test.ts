import { describe, expect, it } from "vitest";
import { draftFromMessage, isValidDraft, ITEM_TABLE, linkedTo, toRow, type LinkedItem } from "./linking";
import type { TimelineMessage } from "./timeline";

const message: TimelineMessage = {
  id: "m1",
  source: "email",
  fromName: "Marta",
  fromAddress: "marta@supplier.example",
  subject: "  Gearbox delivery date ",
  bodyText: "The delivery slips to 28 Nov.",
  receivedAt: "2026-10-22T08:00:00Z",
  attachments: [],
};

describe("draftFromMessage", () => {
  it("starts from the subject and body", () => {
    expect(draftFromMessage("risk", message)).toEqual({
      kind: "risk",
      title: "Gearbox delivery date",
      details: "The delivery slips to 28 Nov.",
    });
  });

  it("cuts a long body", () => {
    const draft = draftFromMessage("decision", { ...message, bodyText: "x".repeat(900) });
    expect(draft.details).toHaveLength(501);
    expect(draft.details.endsWith("…")).toBe(true);
  });
});

describe("isValidDraft", () => {
  it("needs a title", () => {
    expect(isValidDraft({ kind: "task", title: "  ", details: "" })).toBe(false);
    expect(isValidDraft({ kind: "task", title: "Resequence", details: "" })).toBe(true);
  });
});

describe("toRow", () => {
  it("links the item to its message and project", () => {
    expect(toRow({ kind: "change_request", title: " Move install ", details: " Dec " }, "p1", "m1")).toEqual({
      project_id: "p1",
      source_message_id: "m1",
      title: "Move install",
      details: "Dec",
    });
  });

  it("leaves details out for tasks", () => {
    expect(toRow({ kind: "task", title: "Resequence", details: "x" }, "p1", "m1")).not.toHaveProperty("details");
  });

  it("has a table for every kind", () => {
    expect(ITEM_TABLE.change_request).toBe("change_requests");
  });
});

describe("linkedTo", () => {
  it("lists the items of one message", () => {
    const items: LinkedItem[] = [
      { id: "1", kind: "task", title: "A", messageId: "m1" },
      { id: "2", kind: "risk", title: "B", messageId: "m2" },
    ];
    expect(linkedTo(items, "m1").map((i) => i.id)).toEqual(["1"]);
  });
});
