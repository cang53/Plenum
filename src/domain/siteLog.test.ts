import { describe, expect, it } from "vitest";
import { checkSiteLog, prefillSiteLog } from "./siteLog";

const form = (o: Record<string, string>) => new Map(Object.entries(o));

describe("checkSiteLog", () => {
  it("accepts a log and trims text", () => {
    expect(checkSiteLog(form({ site: " Hall 2 ", date: "2026-11-03", headcount: "12", work: "Slab" }))).toEqual({
      ok: true,
      value: { site: "Hall 2", date: "2026-11-03", weather: "", headcount: 12, work: "Slab", delays: "" },
    });
  });
  it("refuses a missing site, a bad date and a bad headcount", () => {
    expect(checkSiteLog(form({ date: "2026-11-03" })).ok).toBe(false);
    expect(checkSiteLog(form({ site: "A", date: "03/11/2026" })).ok).toBe(false);
    expect(checkSiteLog(form({ site: "A", date: "2026-11-03", headcount: "-1" })).ok).toBe(false);
    expect(checkSiteLog(form({ site: "A", date: "2026-11-03", headcount: "1.5" })).ok).toBe(false);
  });
});

describe("site log from a message", () => {
  it("keeps the source message id", () => {
    const r = checkSiteLog(form({ site: "A", date: "2026-11-03", sourceMessageId: "m1" }));
    expect(r.ok && r.value.sourceMessageId).toBe("m1");
  });
  it("prefills site, date and work, cut to the limits", () => {
    const p = prefillSiteLog({ subject: " Hall 2 ", body_text: "x".repeat(5000), received_at: "2026-11-03T08:30:00Z" });
    expect(p.site).toBe("Hall 2");
    expect(p.date).toBe("2026-11-03");
    expect(p.work).toHaveLength(4000);
  });
});
