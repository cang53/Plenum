"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { buildBars, criticalPath, dayOf, DAY_PX, groupByPhase, isoOf, scaleTicks, shiftDates, slipDays, type BaselineDates, type GanttTask, type Zoom } from "@/domain/gantt";
import { findConflicts, type Dependency } from "@/domain/schedule";
import { intlLocale, type Locale } from "@/lib/messages";

const ROW_PX = 28; // keep in step with --gantt-row in gantt.css
const ZOOMS: Zoom[] = ["week", "month", "quarter"];

type Labels = { chart: string; today: string; critical: string; conflict: string; print: string; saveError: string; bar: string; empty: string; saveBaseline: string; baselineName: string; baselineSaved: string; baselineNone: string; baselineLate: string; slip: string; milestone: string; task: string; start: string; end: string; zoom: string; week: string; month: string; quarter: string; collapse: string; expand: string; noPhase: string; slipShort: string; baselineActive: string; baselineLegend: string; criticalToggle: string };

export function Gantt({ tasks: initial, dependencies, onSave, baseline = null, baselineName = "", picker, onBaseline, labels, locale = "en" }: { tasks: GanttTask[]; dependencies: Dependency[]; onSave: (id: string, start: string, due: string) => Promise<void>; baseline?: BaselineDates | null; baselineName?: string; picker?: ReactNode; onBaseline?: (name: string) => Promise<void>; labels: Labels; locale?: Locale }) {
  const [tasks, setTasks] = useState(initial);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [zoom, setZoom] = useState<Zoom>("month");
  const [folded, setFolded] = useState<Set<string | null>>(new Set());
  const [name, setName] = useState("");
  const [showCritical, setShowCritical] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const moved = useRef(false);
  const drag = useRef<{ id: string; x: number; days: number } | null>(null);
  const { bars, firstDay, totalDays } = useMemo(() => buildBars(tasks), [tasks]);
  const critical = useMemo(() => criticalPath(tasks, dependencies), [tasks, dependencies]);
  const lateIds = useMemo(() => new Set(findConflicts(tasks, dependencies).map((c) => c.successor.id)), [tasks, dependencies]);
  const groups = useMemo(() => groupByPhase(bars), [bars]);
  const slip = useMemo(() => (baseline ? slipDays(tasks, baseline) : new Map<string, number>()), [tasks, baseline]);
  if (!bars.length) return <p className="intro">{labels.empty}</p>;

  const move = async (id: string, days: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || !days) return;
    const next = shiftDates(task, days);
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...next } : t)));
    setError(false);
    try {
      await onSave(id, next.startDate, next.dueDate);
    } catch {
      setTasks((all) => all.map((t) => (t.id === id ? task : t)));
      setError(true);
    }
  };

  const saveBase = async () => {
    setError(false);
    try {
      await onBaseline!(name);
      setName("");
      setSaved(true);
    } catch {
      setError(true);
    }
  };

  const dayPx = DAY_PX[zoom];
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], { timeZone: "UTC", day: "numeric", month: "short" });
  const show = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));
  // One shared list of rows: the table and the plot draw the same index, so they line up.
  type Row = { key: string; phase: string | null; summary: boolean; bar?: (typeof bars)[number]; startDay: number; endDay: number };
  const rows: Row[] = groups.flatMap((g) => [
    ...(g.phase === null ? [] : [{ key: `phase-${g.phase}`, phase: g.phase, summary: true, startDay: g.startDay, endDay: g.endDay }]),
    ...(folded.has(g.phase) ? [] : g.bars.map((b) => ({ key: b.id, phase: g.phase, summary: false, bar: b, startDay: b.startDay, endDay: b.startDay + b.length - 1 }))),
  ]);
  const row = new Map(rows.flatMap((r, i) => (r.bar ? [[r.bar.id, i] as const] : [])));
  const today = dayOf(new Date().toISOString().slice(0, 10)) - firstDay;
  const width = totalDays * dayPx;
  const height = rows.length * ROW_PX;
  const tickLabel = (iso: string) =>
    zoom === "quarter" ? `Q${Math.floor(new Date(`${iso}T00:00:00Z`).getUTCMonth() / 3) + 1} ${iso.slice(0, 4)}`
    : zoom === "week" ? show(iso) : new Intl.DateTimeFormat(intlLocale[locale], { timeZone: "UTC", month: "short", year: "2-digit" }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <section className="gantt" data-critical-path={showCritical} aria-label={labels.chart}>
      <div className="gantt-toolbar">
        <div className="gantt-zoom" role="group" aria-label={labels.zoom}>
          {ZOOMS.map((z) => <button key={z} type="button" aria-pressed={z === zoom} onClick={() => setZoom(z)}>{labels[z]}</button>)}
        </div>
        <button type="button" className="chip-select" aria-pressed={showCritical} onClick={() => setShowCritical((v) => !v)}>{labels.criticalToggle}</button>
        <button type="button" className="btn gantt-print" onClick={() => window.print()}>{labels.print}</button>
      </div>
      <div className="gantt-baselinebar">
        {baseline ? <p><strong>{labels.baselineActive.replace("{name}", baselineName)}</strong> {labels.baselineLate.replace("{n}", String([...slip.values()].filter((d) => d > 0).length))}</p> : <p>{labels.baselineNone}</p>}
        {picker}
        {onBaseline && (
          <form onSubmit={(e) => { e.preventDefault(); void saveBase(); }}>
            <label>{labels.baselineName} <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>
            <button type="submit" className="btn">{labels.saveBaseline}</button>
          </form>
        )}
      </div>
      {saved && <p role="status">{labels.baselineSaved}</p>}
      {error && <p role="alert">{labels.saveError}</p>}
      <div className="gantt-split surface">
        <table className="gantt-table">
          <thead><tr><th>{labels.task}</th><th>{labels.start}</th><th>{labels.end}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} data-summary={r.summary}>
                <td>
                  {r.summary ? (
                    <button type="button" aria-expanded={!folded.has(r.phase)} aria-label={`${folded.has(r.phase) ? labels.expand : labels.collapse}: ${r.phase}`}
                      onClick={() => setFolded((f) => { const next = new Set(f); if (!next.delete(r.phase)) next.add(r.phase); return next; })}>
                      <span aria-hidden="true">{folded.has(r.phase) ? "▸" : "▾"}</span> {r.phase}
                    </button>
                  ) : <span className={r.phase === null ? undefined : "gantt-indent"}>{r.bar!.title}</span>}
                </td>
                <td>{show(r.bar ? r.bar.start : isoOf(firstDay + r.startDay))}</td>
                <td>{show(r.bar ? r.bar.due : isoOf(firstDay + r.endDay))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="gantt-scroll">
          <div className="gantt-scale" style={{ width }} aria-hidden="true">
            {scaleTicks(firstDay, totalDays, zoom).map((tick) => <span key={tick.iso} style={{ insetInlineStart: tick.offset * dayPx }}>{tickLabel(tick.iso)}</span>)}
          </div>
          <div className="gantt-plot" style={{ width, height }}>
            {today >= 0 && today < totalDays && <div className="gantt-today" style={{ insetInlineStart: today * dayPx + dayPx / 2 }}><span>{labels.today}</span></div>}
            <svg className="gantt-arrows" width={width} height={height} aria-hidden="true">
              {dependencies.map((d) => {
                const from = rows[row.get(d.predecessorId) ?? -1]?.bar;
                const to = rows[row.get(d.successorId) ?? -1]?.bar;
                const onPath = showCritical && critical.has(d.predecessorId) && critical.has(d.successorId);
                const touches = selected === d.predecessorId || selected === d.successorId;
                if (!from || !to || !(onPath || touches)) return null;
                const x1 = (from.startDay + from.length) * dayPx;
                const y1 = row.get(d.predecessorId)! * ROW_PX + ROW_PX / 2;
                const x2 = to.startDay * dayPx;
                const y2 = row.get(d.successorId)! * ROW_PX + ROW_PX / 2;
                return <path key={`${d.predecessorId}-${d.successorId}`} d={`M${x1} ${y1} H${x1 + 6} V${y2} H${x2}`} data-critical={onPath} data-selected={touches} />;
              })}
            </svg>
            {rows.map((r, i) => r.summary && <div key={r.key} className="gantt-summary" aria-hidden="true" style={{ insetInlineStart: r.startDay * dayPx, width: (r.endDay - r.startDay + 1) * dayPx, top: i * ROW_PX }} />)}
            {rows.map((r, i) => r.bar && baseline?.[r.bar.id] && (
              // shortcut: a baseline that starts before the first current task is clipped at the left edge, redraw the grid if that matters
              <div key={`base-${r.key}`} className="gantt-baseline" aria-hidden="true" style={{ insetInlineStart: Math.max(0, dayOf(baseline[r.bar.id].startDate) - firstDay) * dayPx, width: (dayOf(baseline[r.bar.id].dueDate) - dayOf(baseline[r.bar.id].startDate) + 1) * dayPx, top: i * ROW_PX + ROW_PX - 8 }} />
            ))}
            {rows.map((r, i) => {
              const b = r.bar;
              if (!b) return null;
              const late = lateIds.has(b.id);
              const days = slip.get(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  className="gantt-bar"
                  data-milestone={b.isMilestone}
                  data-critical={critical.has(b.id)}
                  data-late={late}
                  aria-pressed={selected === b.id}
                  onClick={() => { if (!moved.current) setSelected((s) => (s === b.id ? null : b.id)); moved.current = false; }}
                  style={{ insetInlineStart: b.startDay * dayPx, width: b.length * dayPx, top: i * ROW_PX + 6 }}
                  aria-label={labels.bar.replace("{title}", b.title).replace("{start}", b.start).replace("{due}", b.due) + (b.isMilestone ? `. ${labels.milestone}` : "") + (critical.has(b.id) ? `. ${labels.critical}` : "") + (late ? `. ${labels.conflict}` : "") + (days ? `. ${labels.slip.replace("{days}", String(days))}` : "")}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); void move(b.id, e.key === "ArrowLeft" ? -1 : 1); }
                  }}
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: b.id, x: e.clientX, days: 0 }; }}
                  onPointerMove={(e) => {
                    if (!drag.current) return;
                    drag.current.days = Math.round((e.clientX - drag.current.x) / dayPx);
                    e.currentTarget.style.transform = `translateX(${drag.current.days * dayPx}px)`;
                  }}
                  onPointerUp={(e) => {
                    const d = drag.current;
                    drag.current = null;
                    moved.current = !!d?.days;
                    e.currentTarget.style.transform = "";
                    if (d) void move(d.id, d.days);
                  }}
                />
              );
            })}
            {rows.map((r, i) => r.bar && (slip.get(r.bar.id) ?? 0) > 0 && (
              <em key={`slip-${r.key}`} className="gantt-slip" aria-hidden="true" style={{ insetInlineStart: (r.bar.startDay + r.bar.length) * dayPx + 6, top: i * ROW_PX }}>{labels.slipShort.replace("{days}", String(slip.get(r.bar.id)))}</em>
            ))}
          </div>
        </div>
      </div>
      <ul className="gantt-legend">
        {showCritical && <li data-critical="true">{labels.critical}</li>}
        <li data-late="true">{labels.conflict}</li>
        <li data-milestone="true">{labels.milestone}</li>
        {baseline && <li data-baseline="true">{labels.baselineLegend}</li>}
      </ul>
    </section>
  );
}
