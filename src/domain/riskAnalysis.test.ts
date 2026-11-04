import { describe, expect, it } from "vitest";
import { parseAnalysis, ruleAnalysis, type AnalysisDoc, type AnalysisRisk } from "./riskAnalysis";

const risk = (id: string, code: string, o: Partial<AnalysisRisk> = {}): AnalysisRisk => ({ id, code, kind: "risk", title: "Supplier lead time slips past install date", details: "", likelihood: 4, severity: 5, ownerId: null, dueDate: null, status: "open", ...o });
const docs: AnalysisDoc[] = [{ id: "d1", title: "Late supplier delivery", bodyText: "Panel supplier delivery ran five weeks late. Order long-lead items before the design freeze to protect the install date." }, { id: "d2", title: "Safety", bodyText: "Wear helmets on site at all times in the yard." }];

describe("ruleAnalysis", () => {
  it("flags high scores, missing owners and past review dates", () => {
    const out = ruleAnalysis([risk("a", "R1"), risk("b", "R2", { likelihood: 1, severity: 2, ownerId: "u", dueDate: "2026-01-01" }), risk("c", "R3", { status: "closed" })], docs, "2026-11-04");
    expect(out.flags.map((f) => f.text)).toEqual(expect.arrayContaining(["R1 scores 20 (high).", "R1 has no owner.", "R2 was due for review on 2026-01-01."]));
    expect(out.flags.some((f) => f.riskId === "c")).toBe(false);
    expect(out.summary).toContain("2 open");
  });
  it("proposes a lesson only from a document that really matches", () => {
    const out = ruleAnalysis([risk("a", "R1")], docs, "2026-11-04");
    expect(out.lessons).toHaveLength(1);
    expect(out.lessons[0]).toMatchObject({ riskId: "a", docId: "d1" });
    expect(out.lessons[0].text).toMatch(/design freeze/);
  });
  it("gives no lessons when the library is empty", () => {
    expect(ruleAnalysis([risk("a", "R1")], [], "2026-11-04").lessons).toEqual([]);
  });
});

describe("parseAnalysis", () => {
  const rs = [risk("a", "R1")];
  it("keeps flags and lessons that point at real risks and documents, and drops the rest", () => {
    const out = parseAnalysis(JSON.stringify({ summary: "ok", flags: [{ risk: "r1", level: "high", text: "Bad" }, { risk: "R9", level: "high", text: "ghost" }], hints: ["Do x"], lessons: [{ risk: "R1", doc: "d1", text: "Order early." }, { risk: "R1", doc: "zzz", text: "invented" }] }), rs, docs);
    expect(out?.flags).toEqual([{ riskId: "a", level: "high", text: "Bad" }]);
    expect(out?.lessons).toEqual([{ riskId: "a", docId: "d1", docTitle: "Late supplier delivery", text: "Order early." }]);
    expect(out?.hints).toEqual(["Do x"]);
  });
  it("rejects junk or an answer with no summary", () => {
    expect(parseAnalysis("no", rs, docs)).toBeNull();
    expect(parseAnalysis('{"flags":[]}', rs, docs)).toBeNull();
  });
});
