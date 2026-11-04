import type { Font } from "./tlDoc";
import { textWidth, type Layout, type Prim } from "./tlLayout";

// A small PDF writer for the timeline: vector shapes and the standard PDF fonts, so nothing is embedded and no library is needed.
const RESOURCE: Record<Font, [string, string]> = { sans: ["F1", "F2"], serif: ["F3", "F4"], mono: ["F5", "F6"] };

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const rgb = (hex: string) => [0, 1, 2].map((i) => n(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255)).join(" ");
const LATIN: Record<string, string> = { "…": "...", "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "•": "-" };
// The standard fonts carry Latin-1; anything else becomes a question mark rather than a broken file.
const latin = (s: string) => [...s].map((ch) => LATIN[ch] ?? (ch.charCodeAt(0) < 256 && !(ch.charCodeAt(0) >= 127 && ch.charCodeAt(0) < 160) ? ch : "?")).join("");
const esc = (s: string) => latin(s).replace(/[\\()]/g, (c) => "\\" + c).replace(/[\r\n]/g, " ");

function roundedRect(x: number, y: number, w: number, h: number, r: number, H: number): string {
  const k = 0.5523 * r;
  const P = (px: number, py: number) => `${n(px)} ${n(H - py)}`;
  return [
    `${P(x + r, y)} m`, `${P(x + w - r, y)} l`, `${P(x + w - r + k, y)} ${P(x + w, y + r - k)} ${P(x + w, y + r)} c`,
    `${P(x + w, y + h - r)} l`, `${P(x + w, y + h - r + k)} ${P(x + w - r + k, y + h)} ${P(x + w - r, y + h)} c`,
    `${P(x + r, y + h)} l`, `${P(x + r - k, y + h)} ${P(x, y + h - r + k)} ${P(x, y + h - r)} c`,
    `${P(x, y + r)} l`, `${P(x, y + r - k)} ${P(x + r - k, y)} ${P(x + r, y)} c h`,
  ].join("\n");
}

function paint(p: Prim, font: Font, H: number): string {
  if (p.t === "rect") {
    const path = p.r && p.r > 0 ? roundedRect(p.x, p.y, p.w, p.h, Math.min(p.r, p.w / 2, p.h / 2), H) : `${n(p.x)} ${n(H - p.y - p.h)} ${n(p.w)} ${n(p.h)} re`;
    const ops = [p.fill ? `${rgb(p.fill)} rg` : "", p.stroke ? `${rgb(p.stroke)} RG ${n(p.sw ?? 1)} w` : "", p.dash ? "[3 3] 0 d" : ""].filter(Boolean);
    return `q ${ops.join(" ")}\n${path}\n${p.fill && p.stroke ? "B" : p.fill ? "f" : "S"} Q`;
  }
  if (p.t === "line") return `q ${rgb(p.color)} RG ${n(p.w)} w ${p.dash ? "[3 3] 0 d" : ""} ${n(p.x1)} ${n(H - p.y1)} m ${n(p.x2)} ${n(H - p.y2)} l S Q`;
  if (p.t === "poly") return `q ${rgb(p.fill)} rg ${p.pts.map(([x, y], i) => `${n(x)} ${n(H - y)} ${i ? "l" : "m"}`).join(" ")} h f Q`;
  const w = textWidth(p.s, p.size, font, p.bold);
  const x = p.anchor === "middle" ? p.x - w / 2 : p.anchor === "end" ? p.x - w : p.x;
  return `BT /${RESOURCE[font][p.bold ? 1 : 0]} ${n(p.size)} Tf ${rgb(p.color)} rg ${n(x)} ${n(H - p.y)} Td (${esc(p.s)}) Tj ET`;
}

export function buildPdf(layout: Layout, title: string): Uint8Array {
  const { w, h, font, background, prims } = layout;
  const content = [`${rgb(background)} rg 0 0 ${n(w)} ${n(h)} re f`, ...prims.map((p) => paint(p, font, h))].join("\n");
  const fontObjs = ["Helvetica", "Helvetica-Bold", "Times-Roman", "Times-Bold", "Courier", "Courier-Bold"];
  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(w)} ${n(h)}] /Resources << /Font << ${fontObjs.map((_, i) => `/F${i + 1} ${6 + i} 0 R`).join(" ")} >> >> /Contents 4 0 R >>`;
  objs[4] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  objs[5] = `<< /Title (${esc(title).slice(0, 200)}) /Producer (Plenum) >>`;
  fontObjs.forEach((f, i) => { objs[6 + i] = `<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`; });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) { offsets[i] = out.length; out += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length); // every character is below 256, so one byte each
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}

export const pdfFileName = (title: string) => (title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "timeline") + ".pdf";
