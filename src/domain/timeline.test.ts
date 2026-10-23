import { describe, expect, it } from "vitest";
import { buildTimeline, dayKey, formatSize, fromRow, matches, normalize, relativeDay, type TimelineMessage } from "./timeline";

const zone = "Europe/Brussels";

const message = (id: string, receivedAt: string, extra: Partial<TimelineMessage> = {}): TimelineMessage => ({
  id,
  source: "email",
  fromName: "Marta Silva",
  fromAddress: "marta@supplier.example",
  subject: "Gearbox delivery",
  bodyText: "The delivery slips to 28 Nov.",
  receivedAt,
  attachments: [],
  ...extra,
});

const messages = [
  message("a", "2026-10-20T08:00:00Z"),
  message("b", "2026-10-22T09:12:00Z", { fromName: "Jonas Peeters", fromAddress: "jonas@plant.example", subject: "Hijswerk", bodyText: "Vergunning goedgekeurd." }),
  message("c", "2026-10-22T07:30:00Z", {
    subject: "Drawings",
    bodyText: "See attached.",
    attachments: [{ id: "x", filename: "cabinet-rev-B.pdf", contentType: "application/pdf", sizeBytes: 1200 }],
  }),
];

describe("buildTimeline", () => {
  it("lists messages newest first, grouped by day", () => {
    const days = buildTimeline(messages, {}, zone);
    expect(days.map((d) => d.day)).toEqual(["2026-10-22", "2026-10-20"]);
    expect(days[0].messages.map((m) => m.id)).toEqual(["b", "c"]);
  });

  it("uses the project's time zone for the day", () => {
    // 23:30 UTC on the 21st is already the 22nd in Brussels.
    const days = buildTimeline([message("late", "2026-10-21T23:30:00Z")], {}, zone);
    expect(days[0].day).toBe("2026-10-22");
  });

  it("returns no days when nothing matches", () => {
    expect(buildTimeline(messages, { query: "nothing like this" }, zone)).toEqual([]);
  });
});

describe("matches", () => {
  it("finds a message by word in the subject or body", () => {
    expect(matches(messages[0], { query: "gearbox" }, zone)).toBe(true);
    expect(matches(messages[0], { query: "slips nov" }, zone)).toBe(true);
    expect(matches(messages[0], { query: "gearbox crane" }, zone)).toBe(false);
  });

  it("finds a message by sender name or address", () => {
    expect(matches(messages[1], { query: "peeters" }, zone)).toBe(true);
    expect(matches(messages[1], { query: "jonas@plant" }, zone)).toBe(true);
  });

  it("finds a message by attachment name", () => {
    expect(matches(messages[2], { query: "rev-b" }, zone)).toBe(true);
  });

  it("finds a message by date", () => {
    expect(matches(messages[0], { on: "2026-10-20" }, zone)).toBe(true);
    expect(matches(messages[0], { on: "2026-10-22" }, zone)).toBe(false);
    expect(buildTimeline(messages, { query: "marta", on: "2026-10-22" }, zone).flatMap((d) => d.messages.map((m) => m.id))).toEqual([
      "c",
    ]);
  });

  it("ignores case and accents", () => {
    expect(normalize("Réunion ÉCHAFAUDAGE")).toBe("reunion echafaudage");
    expect(matches(message("d", "2026-10-22T10:00:00Z", { subject: "Réunion de chantier" }), { query: "REUNION" }, zone)).toBe(true);
  });
});

describe("dayKey and relativeDay", () => {
  it("formats the day as YYYY-MM-DD", () => {
    expect(dayKey("2026-01-05T12:00:00Z", zone)).toBe("2026-01-05");
  });

  it("names today and yesterday", () => {
    const now = "2026-11-01T10:00:00Z";
    expect(relativeDay("2026-11-01", now, zone)).toBe("today");
    expect(relativeDay("2026-10-31", now, zone)).toBe("yesterday");
    expect(relativeDay("2026-10-30", now, zone)).toBeNull();
  });
});

describe("fromRow", () => {
  it("maps a database row and orders attachments as in the email", () => {
    const row = {
      id: "m1",
      source: "email" as const,
      from_name: null,
      from_address: "jan@supplier.example",
      subject: "",
      body_text: "",
      received_at: "2026-10-22T09:00:00Z",
      message_attachments: [
        { id: "b", part_index: 1, filename: "two.pdf", content_type: "application/pdf", size_bytes: 2 },
        { id: "a", part_index: 0, filename: "one.png", content_type: "image/png", size_bytes: 1 },
      ],
    };
    const mapped = fromRow(row);
    expect(mapped.fromName).toBeNull();
    expect(mapped.attachments.map((a) => a.filename)).toEqual(["one.png", "two.pdf"]);
    expect(mapped.attachments[0]).toMatchObject({ docType: null, docRef: null, superseded: false });
  });

  it("carries the document tag and finds it by number", () => {
    const row = {
      id: "m2", source: "email" as const, from_name: null, from_address: "a@b.example", subject: "", body_text: "", received_at: "2026-10-22T09:00:00Z",
      message_attachments: [{ id: "a", part_index: 0, filename: "x.pdf", content_type: "application/pdf", size_bytes: 1, doc_type: "drawing" as const, doc_ref: "A-101", revision: "B", superseded: true }],
    };
    const m = fromRow(row);
    expect(m.attachments[0]).toMatchObject({ docType: "drawing", docRef: "A-101", revision: "B", superseded: true });
    expect(matches(m, { query: "a-101 drawing" }, "UTC")).toBe(true);
  });
});

describe("formatSize", () => {
  it("shows kilobytes, at least 1, and megabytes with one decimal", () => {
    expect(formatSize(240_400, "en-GB")).toBe("240 kB");
    expect(formatSize(12, "en-GB")).toBe("1 kB");
    expect(formatSize(1_420_000, "en-GB")).toBe("1.4 MB");
  });
});
