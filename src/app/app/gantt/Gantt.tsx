"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildBars, criticalPath, dayOf, DAY_PX, layoutRows, isoOf, scaleTicks, shiftDates, slipDays, type BaselineDates, type GanttGroup, type GanttTask, type Zoom } from "@/domain/gantt";
import { findConflicts, type Dependency } from "@/domain/schedule";
import { intlLocale, t as translate, type Locale, type MessageKey } from "@/lib/messages";

// Row heights and the task column width are the Figma frame's; keep in step with gantt.css.
const TASK_PX = 64;
const PHASE_PX = 28;
const META_PX = 358;
const SYMBOL = { todo: "○", in_progress: "◐", blocked: "!", done: "✓" } as const;
// A bar this wide has room for its dates inside; narrower bars show them beside it.
const DATES_INSIDE_PX = 150;
const ZOOMS: Zoom[] = ["week", "month", "quarter"];

type Labels = { chart: string; today: string; critical: string; conflict: string; print: string; saveError: string; bar: string; empty: string; saveBaseline: string; baselineName: string; baselineSaved: string; baselineNone: string; baselineLate: string; slip: string; milestone: string; task: string; start: string; end: string; zoom: string; week: string; month: string; quarter: string; collapse: string; expand: string; noPhase: string; slipShort: string; baselineActive: string; baselineLegend: string; criticalToggle: string };

// A suggested risk waiting for a person; it links to the message it came from and to where it is reviewed.
export type ScheduleRisk = { title: string; quote: string; source: string; sourceHref: string; reviewHref: string };

// Lets another screen (the remediation plan) lay its own bars over the chart: each gets a color class, and may flash or fade out.
export type Proposals = Record<string, { cls: string; flash?: boolean; leaving?: boolean }>;

export function Gantt({ embedded = false, focusId, reveal, proposals, tasks: initial, dependencies, onSave, baseline = null, baselineName = "", picker, onBaseline, labels, locale = "en", prefix = "T", risk, projectId, groups: groupList = [] }: { embedded?: boolean; groups?: GanttGroup[]; focusId?: string; reveal?: { ids: string[] }; proposals?: Proposals; projectId?: string; tasks: GanttTask[]; dependencies: Dependency[]; onSave?: (id: string, start: string, due: string) => Promise<void>; baseline?: BaselineDates | null; baselineName?: string; picker?: ReactNode; onBaseline?: (name: string) => Promise<void>; labels: Labels; locale?: Locale; prefix?: string; risk?: ScheduleRisk }) {
  const tr = (key: MessageKey) => translate(key, locale);
  const [tasks, setTasks] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) { setSeen(initial); setTasks(initial); } // a new list from the parent replaces the local one before it is drawn
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [zoom, setZoom] = useState<Zoom>("week");
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [showCritical, setShowCritical] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [lateOnly, setLateOnly] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [view, setView] = useState({ left: 0, width: 880 });
  const scroller = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);
  const moved = useRef(false);
  const drag = useRef<{ id: string; x: number; days: number } | null>(null);
  const { bars, firstDay, totalDays } = useMemo(() => buildBars(tasks), [tasks]);
  const critical = useMemo(() => criticalPath(tasks, dependencies), [tasks, dependencies]);
  const lateIds = useMemo(() => new Set(findConflicts(tasks, dependencies).map((c) => c.successor.id)), [tasks, dependencies]);
  // A group filter keeps the tasks of that group and of the groups inside it.
  const inGroup = (b: { phase: string | null; phaseId?: string | null }) => {
    for (let id: string | null | undefined = b.phaseId ?? b.phase, n = 0; id && n < 20; n++) { if (id === phaseFilter) return true; id = groupList.find((g) => g.id === id)?.parentId; }
    return false;
  };
  const shown = useMemo(() => bars.filter((b) => (!lateOnly || lateIds.has(b.id)) && (!phaseFilter || inGroup(b)) && (!ownerFilter || b.ownerName === ownerFilter)), // eslint-disable-next-line react-hooks/exhaustive-deps
  [bars, lateOnly, lateIds, phaseFilter, ownerFilter, groupList]);
  const phases = useMemo(() => (groupList.length ? groupList : [...new Set(bars.flatMap((b) => (b.phase ? [b.phase] : [])))].map((n) => ({ id: n, name: n, parentId: null }))), [bars, groupList]);
  const owners = useMemo(() => [...new Set(bars.flatMap((b) => (b.ownerName ? [b.ownerName] : [])))], [bars]);
  const predecessors = useMemo(() => new Map(dependencies.map((d) => [d.successorId, tasks.find((t) => t.id === d.predecessorId)?.title] as const).filter(([, title]) => title)), [dependencies, tasks]);
  const slip = useMemo(() => (baseline ? slipDays(tasks, baseline) : new Map<string, number>()), [tasks, baseline]);
  const zoomPx = DAY_PX[zoom];
  const todayOffset = dayOf(new Date().toISOString().slice(0, 10)) - firstDay;
  // Open with today near the left of the chart once; later zoom changes keep the person's place.
  const slideTo = (id: string, behavior: ScrollBehavior) => {
    const el = scroller.current;
    const bar = el?.querySelector<HTMLElement>(`[data-bar-id="${id}"]`);
    if (!el || !bar) return false;
    const a = bar.getBoundingClientRect(), b = el.getBoundingClientRect();
    el.scrollTo({ left: Math.max(0, el.scrollLeft + a.left - b.left - META_PX - 80), top: Math.max(0, el.scrollTop + a.top - b.top - el.clientHeight / 3), behavior });
    return true;
  };
  useEffect(() => {
    const el = scroller.current;
    if (!el || scrolled.current) return;
    scrolled.current = true;
    // The embedded chart opens on the activity it is about; the full page opens near today.
    if (!(focusId && slideTo(focusId, "auto"))) el.scrollLeft = Math.max(0, todayOffset * zoomPx - (el.clientWidth - META_PX) / 4);
  }, [todayOffset, zoomPx, focusId, bars]);
  // Fit everything the agent proposed (and the activity it is about) in view: zoom out if needed, then slide to the earliest one.
  const pending = useRef<number | null>(null);
  useEffect(() => {
    const el = scroller.current;
    const hit = reveal ? bars.filter((b) => reveal.ids.includes(b.id)) : [];
    if (!el || !hit.length) return;
    const from = Math.min(...hit.map((b) => b.startDay)), to = Math.max(...hit.map((b) => b.startDay + b.length));
    const room = el.clientWidth - META_PX - 60;
    const z = ZOOMS.find((k) => (to - from) * DAY_PX[k] <= room) ?? "quarter";
    pending.current = Math.max(0, (from - 2) * DAY_PX[z]);
    if (z !== zoom) setZoom(z); else el.scrollTo({ left: pending.current, top: 0, behavior: "smooth" });
  }, [reveal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pending.current !== null) { scroller.current?.scrollTo({ left: pending.current, top: 0, behavior: "smooth" }); pending.current = null; } }, [zoom]);
  if (!bars.length) return <p className="intro">{labels.empty}</p>;

  const move = async (id: string, days: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || !days || embedded) return;
    const next = shiftDates(task, days);
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...next } : t)));
    setError(false);
    try {
      await onSave?.(id, next.startDate, next.dueDate);
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

  const dayPx = zoomPx;
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], { timeZone: "UTC", day: "numeric", month: "short" });
  const show = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));
  // One shared list of rows: the task column and the plot draw the same index, so they line up.
  const filtered = lateOnly || !!phaseFilter || !!ownerFilter;
  const rows = layoutRows(shown, groupList, folded, { first: proposals ? (b) => !!proposals[b.id] : undefined, hideEmpty: filtered });
  const tops: number[] = [];
  let height = 0;
  for (const r of rows) { tops.push(height); height += r.group ? PHASE_PX : TASK_PX; }
  const row = new Map(rows.flatMap((r, i) => (r.bar ? [[r.bar.id, i] as const] : [])));
  const today = todayOffset;
  const width = totalDays * dayPx;
  const tickLabel = (iso: string) =>
    zoom === "quarter" ? `Q${Math.floor(new Date(`${iso}T00:00:00Z`).getUTCMonth() / 3) + 1} ${iso.slice(0, 4)}`
    : zoom === "week" ? show(iso) : new Intl.DateTimeFormat(intlLocale[locale], { timeZone: "UTC", month: "short", year: "2-digit" }).format(new Date(`${iso}T00:00:00Z`));
  const clamp = (day: number) => Math.min(totalDays - 1, Math.max(0, day));
  const plotWidth = Math.max(0, view.width - META_PX);
  const rangeFrom = isoOf(firstDay + clamp(Math.floor(view.left / dayPx)));
  const rangeTo = isoOf(firstDay + clamp(Math.floor((view.left + plotWidth) / dayPx)));
  const scrollBy = (sign: 1 | -1) => scroller.current?.scrollBy({ left: sign * Math.max(dayPx * 7, plotWidth * 0.75), behavior: "smooth" });
  const goToday = () => scroller.current?.scrollTo({ left: Math.max(0, today * dayPx - plotWidth / 2), behavior: "smooth" });
  const attention = (b: (typeof bars)[number]) => b.status === "blocked" || lateIds.has(b.id);
  const weekend = (offset: number) => { const d = (firstDay + offset + 4) % 7; return d === 0 || d === 6; }; // day 0 of the epoch was a Thursday
  const days = Array.from({ length: totalDays }, (_, i) => i);
  return (
    <section className="gantt" data-embedded={embedded || undefined} data-critical-path={showCritical} aria-label={labels.chart}>
      <div className="gantt-controls">
        <div className="gantt-filters" role="group" aria-label={tr("gantt.filters")}>
          <label className="gantt-pill">
            <select aria-label={tr("gantt.filterAll")} value={lateOnly ? "late" : ""} onChange={(e) => setLateOnly(e.target.value === "late")}>
              <option value="">{tr("gantt.filterAll")}</option>
              <option value="late">{tr("gantt.filterLate")}</option>
            </select>
          </label>
          <label className="gantt-pill">
            <select aria-label={tr("gantt.phaseAll")} value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
              <option value="">{tr("gantt.phaseAll")}</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          {owners.length > 0 && (
            <label className="gantt-pill">
              <select aria-label={tr("gantt.ownerAll")} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                <option value="">{tr("gantt.ownerAll")}</option>
                {owners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="gantt-pill" aria-pressed={showCritical} onClick={() => setShowCritical((v) => !v)}>{labels.criticalToggle}</button>
          {baseline && <span className="gantt-pill" data-static="true">{labels.baselineActive.replace("{name}", baselineName).replace(/\.$/, "")}</span>}
          <span className="gantt-count">{tr("gantt.taskCount").replace("{n}", String(shown.length))}</span>
        </div>
        <div className="gantt-nav">
          <button type="button" className="gantt-pill gantt-step" aria-label={tr("gantt.earlier")} onClick={() => scrollBy(-1)}>‹</button>
          <button type="button" className="gantt-pill" onClick={goToday}>{labels.today}</button>
          <button type="button" className="gantt-pill gantt-step" aria-label={tr("gantt.later")} onClick={() => scrollBy(1)}>›</button>
          <div className="gantt-zoom" role="group" aria-label={labels.zoom}>
            {ZOOMS.map((z) => <button key={z} type="button" aria-pressed={z === zoom} onClick={() => setZoom(z)}>{labels[z]}</button>)}
          </div>
        </div>
      </div>
      {!embedded && <div className="gantt-baselinebar">
        {baseline ? <p>{labels.baselineLate.replace("{n}", String([...slip.values()].filter((d) => d > 0).length))}</p> : <p>{labels.baselineNone}</p>}
        {picker}
        {onBaseline && (
          <form onSubmit={(e) => { e.preventDefault(); void saveBase(); }}>
            <label>{labels.baselineName} <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>
            <button type="submit" className="btn">{labels.saveBaseline}</button>
          </form>
        )}
        <button type="button" className="btn gantt-print" onClick={() => window.print()}>{labels.print}</button>
      </div>}
      {saved && <p role="status">{labels.baselineSaved}</p>}
      {error && <p role="alert">{labels.saveError}</p>}
      <div className="gantt-plan">
        <div className="gantt-range">
          <strong>{tr("gantt.range").replace("{from}", show(rangeFrom)).replace("{to}", show(rangeTo))}</strong>
          <span>{tr("gantt.scrollHint")}</span>
        </div>
        <div className="gantt-scroll" ref={scroller} onScroll={(e) => setView({ left: e.currentTarget.scrollLeft, width: e.currentTarget.clientWidth })} tabIndex={0} role="region" aria-label={labels.chart}>
          <div className="gantt-canvas" style={{ width: `calc(var(--gantt-meta) + ${width}px)` }}>
            <div className="gantt-axis">
              <div className="gantt-corner">
                <strong>{labels.task}</strong>
                <span>{tr("gantt.ownerStatus")}</span>
              </div>
              <div className="gantt-calendar" style={{ width }} aria-hidden="true">
                <div className="gantt-weeks">
                  {scaleTicks(firstDay, totalDays, zoom).map((tick) => <span key={tick.iso} style={{ insetInlineStart: tick.offset * dayPx }}>{tickLabel(tick.iso)}</span>)}
                </div>
                {zoom === "week" && (
                  <div className="gantt-days">
                    {days.map((i) => <span key={i} data-weekend={weekend(i)} style={{ insetInlineStart: i * dayPx, width: dayPx }}>{new Date((firstDay + i) * 86_400_000).getUTCDate()}</span>)}
                  </div>
                )}
              </div>
            </div>
            <div className="gantt-body" style={{ height }}>
              <div role="list" aria-label={labels.task}>
                {rows.map((r, i) => {
                  const b = r.bar;
                  return (
                    <div key={r.key} role="listitem" className="gantt-row" data-summary={!!r.group} data-selected={!!b && selected === b.id} style={{ top: tops[i], height: r.group ? PHASE_PX : TASK_PX }}>
                      <div className="gantt-meta" data-attention={!!b && attention(b)}>
                        {r.group ? (
                          <>
                            <button type="button" style={{ marginInlineStart: r.depth * 14 }} aria-expanded={!folded.has(r.group.id)} aria-label={`${folded.has(r.group.id) ? labels.expand : labels.collapse}: ${r.group.name}`}
                              onClick={() => setFolded((f) => { const next = new Set(f); if (!next.delete(r.group!.id)) next.add(r.group!.id); return next; })}>
                              <span aria-hidden="true">{folded.has(r.group.id) ? "▸" : "▾"}</span> {r.group.name}
                            </button>
                            <span className="gantt-phase-count">{r.count}</span>
                          </>
                        ) : (
                          <>
                            <span className="gantt-task-title" style={{ paddingInlineStart: r.depth > 1 ? (r.depth - 1) * 14 : undefined }}><span className="gantt-task-name">{projectId ? <a href={`/app/gantt?project=${projectId}&detail=${b!.id}`}>{b!.title}</a> : b!.title}</span><span aria-hidden="true">›</span></span>
                            <span className="gantt-task-line">{b!.ownerName ?? tr("gantt.unowned")}{b!.number ? ` · ${prefix}-${b!.number}` : ""}</span>
                            <span className="gantt-task-line gantt-task-status">{b!.status ? `${translate(`status.${b!.status}`, locale)}${b!.priority ? ` · ${translate(`priority.${b!.priority}`, locale)}` : ""}` : `${show(b!.start)} – ${show(b!.due)}`}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="gantt-plot" style={{ width, height }}>
                {days.filter(weekend).map((i) => <div key={i} className="gantt-weekend" aria-hidden="true" style={{ insetInlineStart: i * dayPx, width: dayPx }} />)}
                {today >= 0 && today < totalDays && (
                  <div className="gantt-today" style={{ insetInlineStart: today * dayPx + dayPx / 2 }}><span>{show(isoOf(firstDay + today))}</span></div>
                )}
                <svg className="gantt-arrows" width={width} height={height} aria-hidden="true">
                  {dependencies.map((d) => {
                    const from = rows[row.get(d.predecessorId) ?? -1]?.bar;
                    const to = rows[row.get(d.successorId) ?? -1]?.bar;
                    const onPath = showCritical && critical.has(d.predecessorId) && critical.has(d.successorId);
                    const touches = selected === d.predecessorId || selected === d.successorId;
                    if (!from || !to || !(onPath || touches)) return null;
                    const x1 = (from.startDay + from.length) * dayPx;
                    const y1 = tops[row.get(d.predecessorId)!]! + TASK_PX / 2;
                    const x2 = to.startDay * dayPx;
                    const y2 = tops[row.get(d.successorId)!]! + TASK_PX / 2;
                    return <path key={`${d.predecessorId}-${d.successorId}`} d={`M${x1} ${y1} H${x1 + 6} V${y2} H${x2}`} data-critical={onPath} data-selected={touches} />;
                  })}
                </svg>
                {rows.map((r, i) => r.group && r.count > 0 && <div key={r.key} className="gantt-summary" aria-hidden="true" style={{ insetInlineStart: r.startDay * dayPx, width: (r.endDay - r.startDay + 1) * dayPx, top: tops[i]! + 11 }} />)}
                {rows.map((r, i) => r.bar && baseline?.[r.bar.id] && (
                  // shortcut: a baseline that starts before the first current task is clipped at the left edge, redraw the grid if that matters
                  <div key={`base-${r.key}`} className="gantt-baseline" aria-hidden="true" style={{ insetInlineStart: Math.max(0, dayOf(baseline[r.bar.id].startDate) - firstDay) * dayPx, width: (dayOf(baseline[r.bar.id].dueDate) - dayOf(baseline[r.bar.id].startDate) + 1) * dayPx, top: tops[i]! + TASK_PX - 14 }} />
                ))}
                {rows.map((r, i) => {
                  const b = r.bar;
                  if (!b || b.forecast) return null;
                  const roomy = b.length * dayPx >= DATES_INSIDE_PX && !b.isMilestone;
                  const after = predecessors.get(b.id);
                  return (
                    <div key={`note-${b.id}`} className="gantt-note" data-late={lateIds.has(b.id)} aria-hidden="true" style={{ insetInlineStart: (b.startDay + b.length) * dayPx + 8, top: tops[i]! + 21 }}>
                      {!roomy && <span>{`${show(b.start)} – ${show(b.due)}`}</span>}
                      {lateIds.has(b.id) ? <span>{labels.conflict}</span> : after ? <span>{tr("gantt.after").replace("{task}", after)}</span> : null}
                    </div>
                  );
                })}
                {rows.map((r, i) => r.bar?.forecast && (
                  <div key={`forecast-${r.key}`} aria-hidden="true">
                    <div className="gantt-forecast" style={{ insetInlineStart: (dayOf(r.bar.forecast.date) - firstDay) * dayPx, width: dayPx, top: tops[i]! + 9 }} />
                    <span className="gantt-forecast-label" style={{ insetInlineStart: (dayOf(r.bar.forecast.date) - firstDay + 1) * dayPx + 8, top: tops[i]! + 10 }}>{r.bar.forecast.label}</span>
                  </div>
                ))}
                {rows.map((r, i) => {
                  const b = r.bar;
                  if (!b) return null;
                  const late = lateIds.has(b.id);
                  const days = slip.get(b.id);
                  const roomy = b.length * dayPx >= DATES_INSIDE_PX && !b.isMilestone;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`gantt-bar${proposals?.[b.id] ? ` gantt-proposal ${proposals[b.id].cls}` : ""}`}
                      data-bar-id={b.id}
                      data-muted={(!!proposals && Object.keys(proposals).length > 0 && !proposals[b.id] && b.id !== "p-risk") || undefined}
                      data-flash={proposals?.[b.id]?.flash || undefined}
                      data-leaving={proposals?.[b.id]?.leaving || undefined}
                      data-milestone={b.isMilestone}
                      data-critical={critical.has(b.id)}
                      data-late={late}
                      data-status={b.status ?? "todo"}
                      aria-pressed={selected === b.id}
                      onClick={() => { if (!moved.current) setSelected((s) => (s === b.id ? null : b.id)); moved.current = false; }}
                      style={{ insetInlineStart: b.startDay * dayPx, width: b.length * dayPx, top: tops[i]! + 15 }}
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
                    >
                      {!b.isMilestone && <span aria-hidden="true">{SYMBOL[b.status ?? "todo"]}</span>}
                      {roomy && <span aria-hidden="true">{`${show(b.start)} – ${show(b.due)}`}</span>}
                    </button>
                  );
                })}
                {rows.map((r, i) => r.bar && (slip.get(r.bar.id) ?? 0) > 0 && (
                  <em key={`slip-${r.key}`} className="gantt-slip" aria-hidden="true" style={{ insetInlineStart: (r.bar.startDay + r.bar.length) * dayPx + 6, top: tops[i]! + 3 }}>{labels.slipShort.replace("{days}", String(slip.get(r.bar.id)))}</em>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ul className="gantt-legend">
          <li>{tr("gantt.legendStatus")}</li>
          <li data-forecast="true">{tr("gantt.legendForecast")}</li>
          <li>{tr("gantt.legendArrows")}</li>
          {showCritical && <li data-critical="true">{labels.critical}</li>}
          <li data-late="true">{labels.conflict}</li>
          <li data-milestone="true">{labels.milestone}</li>
          {baseline && <li data-baseline="true">{labels.baselineLegend}</li>}
        </ul>
      </div>
      {risk && (
        <article className="gantt-risk" aria-label={tr("gantt.risk.status")}>
          <div className="gantt-risk-head">
            <span className="gantt-risk-by">{tr("gantt.risk.attribution")}</span>
            <span className="gantt-risk-state">{tr("gantt.risk.status")}</span>
          </div>
          <h2>{risk.title}</h2>
          <blockquote>{risk.quote}</blockquote>
          <div className="gantt-risk-foot">
            <a href={risk.sourceHref}>{tr("gantt.risk.source").replace("{source}", risk.source)}</a>
            <a className="act act-primary" href={risk.reviewHref}>{tr("gantt.risk.review")}</a>
          </div>
        </article>
      )}
      {!embedded && <p className="gantt-policy">{tr("gantt.risk.policy")}</p>}
    </section>
  );
}
