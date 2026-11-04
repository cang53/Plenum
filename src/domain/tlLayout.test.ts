import { describe, expect, it } from "vitest";
import { buildPdf, pdfFileName } from "./tlPdf";
import { cleanDoc, type TlDoc } from "./tlDoc";
import { layoutTimeline, textWidth } from "./tlLayout";

const labels = { today: "Today", activity: "Activity", owner: "Owner", locale: "en-GB" };
const doc = (extra: Partial<TlDoc> = {}): TlDoc => cleanDoc({
  title: "Dock 3 (refit) \\ test", subtitle: "Key dates", legend: [{ color: "#047857", label: "Done" }],
  rows: [{ id: "r1", label: "Build", owner: "Jo" }, { id: "r2", label: "Trials", owner: "" }],
  items: [
    { id: "b1", kind: "bar", row: "r1", label: "Hull works", start: "2026-12-01", end: "2027-01-20", color: "#4f46e5", progress: 50 },
    { id: "b2", kind: "bar", row: "r2", label: "Sea trials", start: "2027-02-02", end: "2027-02-28", color: "#b45309" },
    { id: "m1", kind: "milestone", row: "r1", label: "Approved", date: "2027-01-10", color: "#be123c" },
    { id: "s1", kind: "shade", label: "Window", start: "2026-12-15", end: "2027-01-15", color: "#4f46e5" },
    { id: "k1", kind: "bracket", row: "r1", label: "Phase 2", start: "2026-12-01", end: "2027-01-20", color: "#344054" },
    { id: "a1", kind: "arrow", from: "b1", to: "b2" },
  ], ...extra,
});

describe("layoutTimeline", () => {
  it("places bars by date, left to right, inside the chart", () => {
    const l = layoutTimeline(doc(), "2026-12-20", labels);
    const bar = (id: string) => l.prims.find((p) => p.t === "rect" && p.id === id) as { x: number; w: number };
    expect(bar("b2").x).toBeGreaterThan(bar("b1").x + bar("b1").w - 1);
    expect(bar("b1").x).toBeGreaterThanOrEqual(l.chart.x0);
    expect(bar("b2").x + bar("b2").w).toBeLessThanOrEqual(l.chart.x1 + 0.5);
  });
  it("draws the today line only when asked and inside the range", () => {
    const red = (d: TlDoc, today: string) => layoutTimeline(d, today, labels).prims.filter((p) => p.t === "line" && p.color === "#e5484d");
    expect(red(doc(), "2026-12-20")).toHaveLength(1);
    expect(red(doc({ showToday: false }), "2026-12-20")).toHaveLength(0);
    expect(red(doc(), "2030-01-01")).toHaveLength(0);
  });
  it("sizes the page and rows for each paper size", () => {
    expect(layoutTimeline(doc({ page: "a4" }), "2026-12-20", labels)).toMatchObject({ w: 842, h: 595 });
    expect(layoutTimeline(doc(), "2026-12-20", labels)).toMatchObject({ w: 960, h: 540 });
  });
  it("shows a range for an empty timeline and a legend and arrows when set", () => {
    const l = layoutTimeline(cleanDoc({}, "T"), "2026-11-04", labels);
    expect(l.prims.some((p) => p.t === "line" && p.color === "#e5484d")).toBe(true);
    const full = layoutTimeline(doc(), "2026-12-20", labels);
    expect(full.prims.some((p) => p.t === "text" && p.s === "Done")).toBe(true);
    expect(full.prims.filter((p) => p.t === "poly").length).toBeGreaterThanOrEqual(2);
  });
  it("uses every scale", () => {
    for (const scale of ["week", "month", "quarter", "year"] as const) expect(layoutTimeline(doc({ scale }), "2026-12-20", labels).prims.length).toBeGreaterThan(10);
  });
  it("moves a label outside a bar that is too short for it", () => {
    const d = doc({ items: [{ id: "b9", kind: "bar", row: "r1", label: "A long label for a short bar", start: "2026-12-01", end: "2026-12-02", color: "#4f46e5", shape: "pill", progress: 0 }] });
    const t = layoutTimeline(d, "2026-12-20", labels).prims.find((p) => p.t === "text" && p.id === "b9") as { color: string };
    expect(t.color).toBe("#0f1420");
  });
  it("estimates a wider text as wider", () => expect(textWidth("abcdef", 10, "sans")).toBeGreaterThan(textWidth("abc", 10, "sans")));
});

describe("buildPdf", () => {
  const text = (b: Uint8Array) => String.fromCharCode(...b);
  it("writes a one-page PDF whose cross-reference table points at every object", () => {
    const pdf = text(buildPdf(layoutTimeline(doc(), "2026-12-20", labels), "Dock 3"));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const offsets = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(11);
    offsets.forEach((o, i) => expect(pdf.slice(o).startsWith(`${i + 1} 0 obj`)).toBe(true));
    expect(pdf).toContain("/MediaBox [0 0 960 540]");
  });
  it("keeps text, escapes brackets and backslashes, and survives other alphabets", () => {
    const pdf = text(buildPdf(layoutTimeline(doc({ title: "Dock 3 (refit) \\ — Ωmega" }), "2026-12-20", labels), "T"));
    expect(pdf).toContain("(Dock 3 \\(refit\\) \\\\ - ?mega)");
    expect(pdf).toContain("(Hull works)");
    expect(pdf).toContain("/BaseFont /Helvetica-Bold");
  });
  it("names the file after the title", () => {
    expect(pdfFileName("Dock 3: refit!")).toBe("dock-3-refit.pdf");
    expect(pdfFileName("???")).toBe("timeline.pdf");
  });
});
