import { addDays, dayNumber, toIso, type Font, type Page, type TlBar, type TlDoc } from "./tlDoc";

// One drawing language for the screen (SVG) and the PDF: the layout turns a document into these shapes, in points, y down.
export type Prim =
  | { t: "rect"; x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string; sw?: number; dash?: boolean; id?: string }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; color: string; w: number; dash?: boolean }
  | { t: "poly"; pts: [number, number][]; fill: string; id?: string }
  | { t: "text"; x: number; y: number; s: string; size: number; color: string; bold?: boolean; anchor?: "start" | "middle" | "end"; id?: string };

export type Labels = { today: string; activity: string; owner: string; locale: string };
export type Layout = { w: number; h: number; font: Font; background: string; prims: Prim[]; x: (iso: string) => number; chart: { x0: number; x1: number; top: number; bottom: number } };

export const PAGE_SIZE: Record<Page, [number, number]> = { "16:9": [960, 540], a4: [842, 595], letter: [792, 612] };
const FACTOR: Record<Font, number> = { sans: 0.54, serif: 0.47, mono: 0.6 };
// The same estimate on screen and in the PDF, so a label that fits in one fits in the other.
export const textWidth = (s: string, size: number, font: Font, bold = false) => s.length * size * FACTOR[font] * (bold && font !== "mono" ? 1.07 : 1);

export function blend(hex: string, over: string, a: number): string {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(c(hex, i) * a + c(over, i) * (1 - a)).toString(16).padStart(2, "0")).join("");
}
export const inkOn = (hex: string) => {
  const c = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return 0.299 * c(0) + 0.587 * c(1) + 0.114 * c(2) > 150 ? "#0f1420" : "#ffffff";
};
const fit = (s: string, max: number, size: number, font: Font) => {
  if (textWidth(s, size, font) <= max) return s;
  let n = s.length;
  while (n > 1 && textWidth(s.slice(0, n) + "…", size, font) > max) n--;
  return s.slice(0, n) + "…";
};

type Unit = { start: number; end: number; label: string; group: string };
const parts = (n: number) => { const [y, m, d] = toIso(n).split("-").map(Number); return { y, m, d }; };
const monthStart = (y: number, m: number) => Math.round(Date.UTC(y, m - 1, 1) / 86400000);

// Calendar units that cover [from, to] for the scale, each with the group shown on the band above.
function units(scale: TlDoc["scale"], from: number, to: number, locale: string): Unit[] {
  const out: Unit[] = [];
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  if (scale === "week") {
    let s = from - ((from + 3) % 7); // 1 Jan 1970 was a Thursday; this lands on Monday
    for (; s <= to; s += 7) { const { y, m } = parts(s); out.push({ start: s, end: s + 7, label: day.format(new Date(s * 86400000)), group: `${month.format(new Date(s * 86400000)).toUpperCase()} ${y}` }); void m; }
  } else if (scale === "month") {
    let { y, m } = parts(from);
    for (let s = monthStart(y, m); s <= to; ) { const e = monthStart(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1); out.push({ start: s, end: e, label: month.format(new Date(s * 86400000)).toUpperCase(), group: `Q${Math.ceil(m / 3)} ${y}` }); s = e; m = m === 12 ? 1 : m + 1; if (m === 1) y++; }
  } else if (scale === "quarter") {
    let { y, m } = parts(from);
    m = Math.floor((m - 1) / 3) * 3 + 1;
    for (let s = monthStart(y, m); s <= to; ) { const q = Math.ceil(m / 3); const nm = m + 3 > 12 ? 1 : m + 3; const ny = m + 3 > 12 ? y + 1 : y; const e = monthStart(ny, nm); out.push({ start: s, end: e, label: `Q${q}`, group: String(y) }); s = e; m = nm; y = ny; }
  } else {
    let { y } = parts(from);
    for (let s = monthStart(y, 1); s <= to; y++) { const e = monthStart(y + 1, 1); out.push({ start: s, end: e, label: String(y), group: "" }); s = e; }
  }
  return out;
}

// The part of the calendar the chart shows: the set range, else everything on it (and today), padded.
export function visibleRange(doc: TlDoc, today: string): [number, number] {
  if (doc.rangeStart && doc.rangeEnd && dayNumber(doc.rangeEnd) > dayNumber(doc.rangeStart)) return [dayNumber(doc.rangeStart), dayNumber(doc.rangeEnd)];
  const days = doc.items.flatMap((i) => (i.kind === "arrow" ? [] : i.kind === "milestone" ? [dayNumber(i.date)] : [dayNumber(i.start), dayNumber(i.end)]));
  if (!days.length) { const t = dayNumber(today); return [t - 14, t + 76]; }
  const lo = Math.min(...days), hi = Math.max(...days);
  return [lo, hi + 1];
}

export function layoutTimeline(doc: TlDoc, today: string, labels: Labels): Layout {
  const [w, h] = PAGE_SIZE[doc.page];
  const font = doc.font, fs = doc.fontSize, ink = doc.textColor, bg = doc.background;
  const faint = blend(ink, bg, 0.1), mid = blend(ink, bg, 0.6);
  const prims: Prim[] = [];
  const m = Math.round(w * 0.045);
  const labelW = Math.min(190, Math.max(110, Math.round(w * 0.17)));
  const ownerW = doc.ownerColumn ? 62 : 0;
  const x0 = m + labelW + ownerW, x1 = w - m;
  const titleY = m + fs * 2;
  prims.push({ t: "text", x: m, y: titleY, s: fit(doc.title, w - 2 * m, fs * 2.3, font), size: fs * 2.3, color: ink, bold: true });
  if (doc.subtitle) prims.push({ t: "text", x: m, y: titleY + fs * 1.6, s: fit(doc.subtitle, w - 2 * m, fs * 1.1, font), size: fs * 1.1, color: mid });
  const bandTop = titleY + (doc.subtitle ? fs * 2.8 : fs * 1.4);

  const [from, to] = visibleRange(doc, today);
  const us = units(doc.scale, from, to, labels.locale);
  const lo = us[0].start, hi = us[us.length - 1].end;
  const x = (iso: string) => x0 + ((dayNumber(iso) - lo) / (hi - lo)) * (x1 - x0);
  const xd = (n: number) => x0 + ((n - lo) / (hi - lo)) * (x1 - x0);

  // bands: groups on top, units below
  const bandH = fs * 1.7;
  const gTop = bandTop, uTop = bandTop + (us[0].group ? bandH : 0);
  const chartTop = uTop + bandH + 4;
  const legend = doc.showLegend && doc.legend.length > 0;
  const bottom = h - m - (legend ? fs * 2 : 0) - (doc.showToday ? fs * 1.8 : 0);
  const rowH = Math.max(16, Math.min(54, (bottom - chartTop) / Math.max(1, doc.rows.length)));
  const chartBottom = chartTop + rowH * doc.rows.length;

  prims.push({ t: "text", x: m, y: uTop + bandH - 5, s: labels.activity.toUpperCase(), size: fs * 0.75, color: mid, bold: true });
  if (doc.ownerColumn) prims.push({ t: "text", x: m + labelW, y: uTop + bandH - 5, s: labels.owner.toUpperCase(), size: fs * 0.75, color: mid, bold: true });
  let g = 0;
  while (us[0].group && g < us.length) {
    let k = g; while (k + 1 < us.length && us[k + 1].group === us[g].group) k++;
    const a = xd(us[g].start), b = xd(us[k].end);
    prims.push({ t: "text", x: (a + b) / 2, y: gTop + bandH - 7, s: fit(us[g].group, b - a - 4, fs * 0.85, font), size: fs * 0.85, color: ink, bold: true, anchor: "middle" });
    prims.push({ t: "line", x1: a + 1, y1: gTop + bandH - 2, x2: b - 1, y2: gTop + bandH - 2, color: mid, w: 1 });
    g = k + 1;
  }
  const colW = (x1 - x0) / us.length;
  for (const u of us) {
    const a = xd(u.start);
    prims.push({ t: "line", x1: a, y1: uTop + 2, x2: a, y2: chartBottom, color: faint, w: 1 });
    prims.push({ t: "text", x: a + 4, y: uTop + bandH - 5, s: fit(u.label, (xd(u.end) - a) - 4, fs * 0.75, font), size: fs * 0.75, color: mid, bold: true });
  }
  prims.push({ t: "line", x1: x1, y1: uTop + 2, x2: x1, y2: chartBottom, color: faint, w: 1 });
  prims.push({ t: "line", x1: m, y1: chartTop - 2, x2: x1, y2: chartTop - 2, color: blend(ink, bg, 0.25), w: 1 });
  void colW;

  // shades sit behind everything
  for (const it of doc.items) if (it.kind === "shade") {
    const a = x(it.start), b = x(addDays(it.end, 1));
    prims.push({ t: "rect", x: a, y: chartTop, w: Math.max(2, b - a), h: chartBottom - chartTop, r: 6, fill: blend(it.color, bg, 0.1), stroke: blend(it.color, bg, 0.55), sw: 1, dash: true, id: it.id });
    if (it.label) prims.push({ t: "text", x: a + 6, y: chartTop + fs, s: fit(it.label, Math.max(20, b - a - 8), fs * 0.8, font), size: fs * 0.8, color: it.color, bold: true, id: it.id });
  }

  const rowIndex = new Map(doc.rows.map((r, i) => [r.id, i]));
  const rowMid = (id: string) => chartTop + (rowIndex.get(id)! + 0.5) * rowH;
  doc.rows.forEach((r, i) => {
    const y = chartTop + i * rowH;
    if (i > 0) prims.push({ t: "line", x1: m, y1: y, x2: x1, y2: y, color: faint, w: 1 });
    prims.push({ t: "text", x: m, y: y + rowH / 2 + fs * 0.35, s: fit(r.label, labelW - 10, fs, font), size: fs, color: ink, bold: true, id: `row:${r.id}` });
    if (doc.ownerColumn && r.owner) prims.push({ t: "text", x: m + labelW, y: y + rowH / 2 + fs * 0.32, s: fit(r.owner, ownerW - 6, fs * 0.8, font), size: fs * 0.8, color: mid, id: `row:${r.id}` });
  });

  const barH = Math.min(22, rowH * 0.56);
  const barBox = new Map<string, { a: number; b: number; y: number; bar: TlBar }>();
  for (const it of doc.items) {
    if (it.kind === "bar" && rowIndex.has(it.row)) {
      const a = x(it.start), b = Math.max(a + 6, x(addDays(it.end, 1))), y = rowMid(it.row) - barH / 2;
      barBox.set(it.id, { a, b, y, bar: it });
      const on = inkOn(it.color);
      const pad = 8;
      if (it.shape === "arrow") {
        const tip = Math.min(barH * 0.6, (b - a) / 2);
        prims.push({ t: "poly", pts: [[a, y], [b - tip, y], [b, y + barH / 2], [b - tip, y + barH], [a, y + barH]], fill: it.color, id: it.id });
      } else prims.push({ t: "rect", x: a, y, w: b - a, h: barH, r: it.shape === "pill" ? barH / 2 : 2, fill: it.color, id: it.id });
      if (it.progress > 0) { const pw = (b - a - 2 * pad) * (it.progress / 100); if (b - a > 2 * pad + 4) { prims.push({ t: "rect", x: a + pad, y: y + barH - 5, w: b - a - 2 * pad, h: 2.5, r: 1.2, fill: blend(on, it.color, 0.35) }); prims.push({ t: "rect", x: a + pad, y: y + barH - 5, w: Math.max(0, pw), h: 2.5, r: 1.2, fill: on }); } }
      const size = fs * 0.85, tw = textWidth(it.label, size, font, true), room = b - a - 2 * pad;
      if (it.label && tw <= room) prims.push({ t: "text", x: a + pad, y: y + barH / 2 + size * 0.28 - (it.progress > 0 ? 1.5 : 0), s: it.label, size, color: on, bold: true, id: it.id });
      else if (it.label && b + 6 + tw <= x1) prims.push({ t: "text", x: b + 6, y: y + barH / 2 + size * 0.34, s: it.label, size, color: ink, bold: true, id: it.id });
      else if (it.label) prims.push({ t: "text", x: a - 6, y: y + barH / 2 + size * 0.34, s: fit(it.label, Math.max(30, a - x0), size, font), size, color: ink, bold: true, anchor: "end", id: it.id });
    }
  }
  for (const it of doc.items) {
    if (it.kind === "milestone" && rowIndex.has(it.row)) {
      const cx = x(addDays(it.date, 0)) + (x1 - x0) / (hi - lo) / 2, cy = rowMid(it.row), r = Math.min(8, rowH * 0.3);
      prims.push({ t: "poly", pts: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], fill: it.color, id: it.id });
      const size = fs * 0.85;
      if (it.label) prims.push({ t: "text", x: cx + r + 5, y: cy + size * 0.34, s: it.label, size, color: ink, bold: true, id: it.id });
    } else if (it.kind === "bracket" && rowIndex.has(it.row)) {
      const a = x(it.start), b = x(addDays(it.end, 1)), y = rowMid(it.row) - barH / 2 - 3;
      prims.push({ t: "line", x1: a, y1: y, x2: b, y2: y, color: it.color, w: 1.5 });
      prims.push({ t: "line", x1: a, y1: y, x2: a, y2: y + 5, color: it.color, w: 1.5 });
      prims.push({ t: "line", x1: b, y1: y, x2: b, y2: y + 5, color: it.color, w: 1.5 });
      if (it.label) prims.push({ t: "text", x: (a + b) / 2, y: y - 3, s: fit(it.label, Math.max(30, b - a), fs * 0.75, font), size: fs * 0.75, color: it.color, bold: true, anchor: "middle", id: it.id });
    }
  }
  // dependency arrows: right, down or up, right, with a small head
  for (const it of doc.items) {
    if (it.kind !== "arrow") continue;
    const p = barBox.get(it.from), q = barBox.get(it.to);
    if (!p || !q) continue;
    const ya = p.y + barH / 2, yb = q.y + barH / 2, ax = p.b, bx = q.a, jog = Math.min(8, Math.max(3, (bx - ax) / 2));
    const c = blend(ink, bg, 0.75);
    const pts: [number, number][] = [[ax, ya], [ax + jog, ya], [ax + jog, yb], [bx - 1, yb]];
    for (let i = 0; i < 3; i++) prims.push({ t: "line", x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], color: c, w: 1.2 });
    prims.push({ t: "poly", pts: [[bx, yb], [bx - 5, yb - 3], [bx - 5, yb + 3]], fill: c });
  }

  if (doc.showToday) {
    const t = dayNumber(today);
    if (t >= lo && t < hi) {
      const tx = xd(t) + (x1 - x0) / (hi - lo) / 2;
      prims.push({ t: "line", x1: tx, y1: uTop + 2, x2: tx, y2: chartBottom + 4, color: "#e5484d", w: 1.8 });
      const label = labels.today, size = fs * 0.75, tw = textWidth(label, size, font, true) + 14;
      prims.push({ t: "rect", x: tx - tw / 2, y: chartBottom + 6, w: tw, h: size + 8, r: (size + 8) / 2, fill: "#e5484d" });
      prims.push({ t: "text", x: tx, y: chartBottom + 6 + size + 3, s: label, size, color: "#ffffff", bold: true, anchor: "middle" });
    }
  }
  if (legend) {
    let lx = m;
    const ly = h - m;
    for (const e of doc.legend) {
      prims.push({ t: "rect", x: lx, y: ly - fs * 0.8, w: fs * 0.8, h: fs * 0.8, r: fs * 0.4, fill: e.color });
      const size = fs * 0.85;
      prims.push({ t: "text", x: lx + fs * 1.2, y: ly - 1, s: e.label, size, color: ink });
      lx += fs * 1.2 + textWidth(e.label, size, font) + fs * 1.6;
    }
  }
  return { w, h, font, background: bg, prims, x, chart: { x0, x1, top: chartTop, bottom: chartBottom } };
}
