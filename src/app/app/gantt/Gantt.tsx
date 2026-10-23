"use client";

import { useMemo, useRef, useState } from "react";
import { buildBars, criticalPath, dayOf, shiftDates, slipDays, type BaselineDates, type GanttTask } from "@/domain/gantt";
import { findConflicts, type Dependency } from "@/domain/schedule";

const DAY_PX = 28;
const ROW_PX = 40;

type Labels = { chart: string; today: string; critical: string; conflict: string; print: string; saveError: string; bar: string; empty: string; saveBaseline: string; baselineSaved: string; baselineNone: string; baselineLate: string; slip: string };

export function Gantt({ tasks: initial, dependencies, onSave, baseline = null, onBaseline, labels }: { tasks: GanttTask[]; dependencies: Dependency[]; onSave: (id: string, start: string, due: string) => Promise<void>; baseline?: BaselineDates | null; onBaseline?: () => Promise<void>; labels: Labels }) {
  const [tasks, setTasks] = useState(initial);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const drag = useRef<{ id: string; x: number; days: number } | null>(null);
  const { bars, firstDay, totalDays } = useMemo(() => buildBars(tasks), [tasks]);
  const critical = useMemo(() => criticalPath(tasks, dependencies), [tasks, dependencies]);
  const late = useMemo(() => new Set(findConflicts(tasks, dependencies).map((c) => c.successor.id)), [tasks, dependencies]);
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
      await onBaseline!();
      setSaved(true);
    } catch {
      setError(true);
    }
  };

  const row = new Map(bars.map((b, i) => [b.id, i]));
  const today = dayOf(new Date().toISOString().slice(0, 10)) - firstDay;
  const width = totalDays * DAY_PX;
  return (
    <section className="gantt" aria-label={labels.chart}>
      <button type="button" className="btn gantt-print" onClick={() => window.print()}>{labels.print}</button>
      {onBaseline && <button type="button" className="btn gantt-print" onClick={saveBase}>{labels.saveBaseline}</button>}
      {saved && <p role="status">{labels.baselineSaved}</p>}
      {baseline ? <p>{labels.baselineLate.replace("{n}", String([...slip.values()].filter((d) => d > 0).length))}</p> : <p className="intro">{labels.baselineNone}</p>}
      {error && <p role="alert">{labels.saveError}</p>}
      <div className="gantt-scroll surface">
        <div className="gantt-plot" style={{ width, height: bars.length * ROW_PX }}>
          {today >= 0 && today < totalDays && <div className="gantt-today" style={{ insetInlineStart: today * DAY_PX + DAY_PX / 2 }}><span>{labels.today}</span></div>}
          <svg className="gantt-arrows" width={width} height={bars.length * ROW_PX} aria-hidden="true">
            {dependencies.map((d) => {
              const from = bars[row.get(d.predecessorId) ?? -1];
              const to = bars[row.get(d.successorId) ?? -1];
              if (!from || !to) return null;
              const x1 = (from.startDay + from.length) * DAY_PX;
              const y1 = row.get(d.predecessorId)! * ROW_PX + ROW_PX / 2;
              const x2 = to.startDay * DAY_PX;
              const y2 = row.get(d.successorId)! * ROW_PX + ROW_PX / 2;
              return <path key={`${d.predecessorId}-${d.successorId}`} d={`M${x1} ${y1} H${x1 + 6} V${y2} H${x2}`} data-critical={critical.has(d.predecessorId) && critical.has(d.successorId)} />;
            })}
          </svg>
          {bars.map((b) => baseline?.[b.id] && (
            // shortcut: a baseline that starts before the first current task is clipped at the left edge, redraw the grid if that matters
            <div key={`base-${b.id}`} className="gantt-baseline" aria-hidden="true" style={{ insetInlineStart: Math.max(0, dayOf(baseline[b.id].startDate) - firstDay) * DAY_PX, width: (dayOf(baseline[b.id].dueDate) - dayOf(baseline[b.id].startDate) + 1) * DAY_PX, top: row.get(b.id)! * ROW_PX + 32 }} />
          ))}
          {bars.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className="gantt-bar"
              data-critical={critical.has(b.id)}
              data-late={late.has(b.id)}
              style={{ insetInlineStart: b.startDay * DAY_PX, width: b.length * DAY_PX, top: i * ROW_PX + 6 }}
              aria-label={labels.bar.replace("{title}", b.title).replace("{start}", b.start).replace("{due}", b.due) + (critical.has(b.id) ? `. ${labels.critical}` : "") + (late.has(b.id) ? `. ${labels.conflict}` : "") + (slip.get(b.id) ? `. ${labels.slip.replace("{days}", String(slip.get(b.id)))}` : "")}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); void move(b.id, e.key === "ArrowLeft" ? -1 : 1); }
              }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: b.id, x: e.clientX, days: 0 }; }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                drag.current.days = Math.round((e.clientX - drag.current.x) / DAY_PX);
                e.currentTarget.style.transform = `translateX(${drag.current.days * DAY_PX}px)`;
              }}
              onPointerUp={(e) => {
                const d = drag.current;
                drag.current = null;
                e.currentTarget.style.transform = "";
                if (d) void move(d.id, d.days);
              }}
            >
              <span>{b.title}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="gantt-legend">
        <li data-critical="true">{labels.critical}</li>
        <li data-late="true">{labels.conflict}</li>
      </ul>
    </section>
  );
}

