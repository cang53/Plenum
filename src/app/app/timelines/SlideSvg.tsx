import type { PointerEvent } from "react";
import { textWidth, type Layout, type Prim } from "@/domain/tlLayout";

const FAMILY = { sans: "Helvetica, Arial, sans-serif", serif: "'Times New Roman', Times, serif", mono: "'Courier New', Courier, monospace" } as const;

function box(layout: Layout, id: string) {
  const pts: [number, number][] = [];
  for (const p of layout.prims) {
    if (!("id" in p) || p.id !== id) continue;
    if (p.t === "rect") pts.push([p.x, p.y], [p.x + p.w, p.y + p.h]);
    else if (p.t === "poly") pts.push(...p.pts);
    else if (p.t === "text") { const w = textWidth(p.s, p.size, layout.font, p.bold); const x = p.anchor === "middle" ? p.x - w / 2 : p.anchor === "end" ? p.x - w : p.x; pts.push([x, p.y - p.size], [x + w, p.y + 3]); }
  }
  if (!pts.length) return null;
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return { x: Math.min(...xs) - 3, y: Math.min(...ys) - 3, w: Math.max(...xs) - Math.min(...xs) + 6, h: Math.max(...ys) - Math.min(...ys) + 6 };
}

function shape(p: Prim, i: number, family: string, handlers: object) {
  const common = { key: i, ...handlers, ...("id" in p && p.id ? { "data-id": p.id, style: { cursor: "pointer" } } : {}) };
  if (p.t === "rect") return <rect {...common} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.r ?? 0} fill={p.fill ?? "none"} stroke={p.stroke} strokeWidth={p.sw} strokeDasharray={p.dash ? "3 3" : undefined} />;
  if (p.t === "line") return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.color} strokeWidth={p.w} strokeDasharray={p.dash ? "3 3" : undefined} />;
  if (p.t === "poly") return <polygon {...common} points={p.pts.map((q) => q.join(",")).join(" ")} fill={p.fill} />;
  return <text {...common} x={p.x} y={p.y} fontSize={p.size} fill={p.color} fontWeight={p.bold ? 700 : 400} textAnchor={p.anchor ?? "start"} fontFamily={family} style={{ ...(common as { style?: object }).style, userSelect: "none" }}>{p.s}</text>;
}

// The slide as SVG. Without handlers it is a plain picture (list thumbnails); with them, items can be picked and dragged.
export function SlideSvg({ layout, label, selected, onPick, onDown }: { layout: Layout; label: string; selected?: string | null; onPick?: (id: string | null) => void; onDown?: (id: string, e: PointerEvent<SVGElement>) => void }) {
  const family = FAMILY[layout.font];
  const handlers = onPick || onDown ? { onPointerDown: (e: PointerEvent<SVGElement>) => { const id = (e.currentTarget as SVGElement).dataset.id; if (id) { e.stopPropagation(); onPick?.(id); onDown?.(id, e); } } } : {};
  const sel = selected ? box(layout, selected) : null;
  return (
    <svg className="tl-slide" viewBox={`0 0 ${layout.w} ${layout.h}`} role="img" aria-label={label} onPointerDown={onPick ? () => onPick(null) : undefined}>
      <rect width={layout.w} height={layout.h} fill={layout.background} />
      {layout.prims.map((p, i) => shape(p, i, family, handlers))}
      {sel && <rect x={sel.x} y={sel.y} width={sel.w} height={sel.h} rx={6} fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 3" pointerEvents="none" />}
    </svg>
  );
}
