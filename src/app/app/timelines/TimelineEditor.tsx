"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { addDays, addFromGantt, cleanDoc, FONTS, isIsoDate, newId, PAGES, PALETTE, refreshFromGantt, SCALES, SHAPES, STATUS_COLORS, type GanttTask, type TlDoc, type TlItem } from "@/domain/tlDoc";
import { layoutTimeline } from "@/domain/tlLayout";
import { buildPdf, pdfFileName } from "@/domain/tlPdf";
import { SlideSvg } from "./SlideSvg";
import type { TimelineLabels } from "./labels";

type Props = {
  id: string; listHref: string; initial: TlDoc; tasks: GanttTask[]; canEdit: boolean; labels: TimelineLabels; locale: string; today: string;
  author: string; createdAt: string; updatedAt: string; save: (id: string, doc: TlDoc) => Promise<{ updatedAt: string }>;
};
type Status = "saved" | "dirty" | "saving" | "error";

const F = ({ label, children }: { label: string; children: ReactNode }) => <label className="tl-f"><span>{label}</span>{children}</label>;
const pageKey = { "16:9": "timelines.page.169", a4: "timelines.page.a4", letter: "timelines.page.letter" } as const;

function Colour({ label, hexLabel, value, onChange }: { label: string; hexLabel: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="tl-f" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="tl-colour">
        {PALETTE.map((c) => <button key={c} type="button" className="tl-sw" style={{ background: c }} aria-label={c} aria-pressed={c === value} onClick={() => onChange(c)} />)}
        <input type="color" value={value} aria-label={hexLabel} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function TimelineEditor({ id, listHref, initial, tasks, canEdit, labels: L, locale, today, author, createdAt, updatedAt, save }: Props) {
  const [doc, setDoc] = useState(initial);
  const [draft, setDraft] = useState<TlDoc | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("saved");
  const [stamp, setStamp] = useState(updatedAt);
  const [hist, setHist] = useState<{ past: TlDoc[]; future: TlDoc[] }>({ past: [], future: [] });
  const dialog = useRef<HTMLDialogElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const drag = useRef<{ id: string; x: number; base: TlDoc; ppd: number } | null>(null);

  const shown = draft ?? doc;
  const layout = useMemo(() => layoutTimeline(shown, today, { today: L["timelines.today"], activity: L["timelines.f.activity"], owner: L["timelines.f.owner"], locale }), [shown, today, L, locale]);

  const commit = (next: TlDoc) => {
    if (!canEdit) return;
    setHist((h) => ({ past: [...h.past.slice(-99), doc], future: [] }));
    setDoc(next);
    setStatus("dirty");
  };
  const undo = () => { const p = hist.past.at(-1); if (!p) return; setHist({ past: hist.past.slice(0, -1), future: [...hist.future, doc] }); setDoc(p); setStatus("dirty"); };
  const redo = () => { const f = hist.future.at(-1); if (!f) return; setHist({ past: [...hist.past, doc], future: hist.future.slice(0, -1) }); setDoc(f); setStatus("dirty"); };
  const patch = (p: Partial<TlDoc>) => commit({ ...doc, ...p });
  const setItem = (itemId: string, p: Record<string, unknown>) => commit(cleanDoc({ ...doc, items: doc.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) }));

  const doSave = async () => {
    setStatus("saving");
    try { const r = await save(id, doc); setStamp(r.updatedAt); setStatus((s) => (s === "saving" ? "saved" : s)); } catch { setStatus("error"); }
  };
  // Saves a moment after the last change, so nothing is lost when the tab closes.
  useEffect(() => {
    if (status !== "dirty" || !canEdit) return;
    const timer = setTimeout(() => void doSave(), 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, status, canEdit]);

  const rowOfSelection = () => {
    if (selected?.startsWith("row:")) return selected.slice(4);
    const it = doc.items.find((i) => i.id === selected);
    return it && "row" in it ? it.row : doc.rows.at(-1)?.id;
  };
  const withRow = (build: (row: string) => TlItem, rows = doc.rows) => {
    let list = rows;
    let row = rowOfSelection();
    if (!row || !list.some((r) => r.id === row)) { row = newId(); list = [...list, { id: row, label: L["timelines.tool.row"], owner: "" }]; }
    const item = build(row);
    commit(cleanDoc({ ...doc, rows: list, items: [...doc.items, item] }));
    setSelected(item.id);
  };
  const end14 = addDays(today, 13);
  const tools: [string, () => void][] = [
    [L["timelines.tool.bar"], () => withRow((row) => ({ id: newId(), kind: "bar", row, label: L["timelines.tool.bar"], start: today, end: end14, color: STATUS_COLORS.active, shape: "pill", progress: 0 }))],
    [L["timelines.tool.milestone"], () => withRow((row) => ({ id: newId(), kind: "milestone", row, label: L["timelines.tool.milestone"], date: today, color: STATUS_COLORS.milestone }))],
    [L["timelines.tool.row"], () => { const r = { id: newId(), label: `${L["timelines.tool.row"]} ${doc.rows.length + 1}`, owner: "" }; commit({ ...doc, rows: [...doc.rows, r] }); setSelected(`row:${r.id}`); }],
    [L["timelines.tool.bracket"], () => withRow((row) => ({ id: newId(), kind: "bracket", row, label: L["timelines.tool.bracket"], start: today, end: end14, color: "#344054" }))],
    [L["timelines.tool.shade"], () => { const it: TlItem = { id: newId(), kind: "shade", label: L["timelines.tool.shade"], start: today, end: end14, color: STATUS_COLORS.active }; commit({ ...doc, items: [...doc.items, it] }); setSelected(it.id); }],
  ];

  const removeSelected = () => {
    if (!selected) return;
    if (selected.startsWith("row:")) commit(cleanDoc({ ...doc, rows: doc.rows.filter((r) => `row:${r.id}` !== selected) }));
    else commit(cleanDoc({ ...doc, items: doc.items.filter((i) => i.id !== selected) }));
    setSelected(null);
  };
  const moveRow = (rid: string, by: -1 | 1) => {
    const i = doc.rows.findIndex((r) => r.id === rid), j = i + by;
    if (i < 0 || j < 0 || j >= doc.rows.length) return;
    const rows = [...doc.rows];
    [rows[i], rows[j]] = [rows[j], rows[i]];
    commit({ ...doc, rows });
  };

  const exportPdf = () => {
    const bytes = buildPdf(layoutTimeline(doc, today, { today: L["timelines.today"], activity: L["timelines.f.activity"], owner: L["timelines.f.owner"], locale }), doc.title);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFileName(doc.title);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // dragging an item on the slide moves it in time, a whole day at a time
  const shift = (base: TlDoc, itemId: string, days: number): TlDoc => ({ ...base, items: base.items.map((i) => (i.id !== itemId ? i : i.kind === "milestone" ? { ...i, date: addDays(i.date, days) } : i.kind === "arrow" ? i : { ...i, start: addDays(i.start, days), end: addDays(i.end, days) })) });
  const onDown = (itemId: string, e: PointerEvent<SVGElement>) => {
    if (!canEdit || itemId.startsWith("row:")) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const perDay = layout.x("2026-01-02") - layout.x("2026-01-01");
    drag.current = { id: itemId, x: e.clientX, base: doc, ppd: perDay * (svg.getBoundingClientRect().width / layout.w) };
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || !d.ppd) return;
    const days = Math.round((e.clientX - d.x) / d.ppd);
    setDraft(days ? shift(d.base, d.id, days) : null);
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (draft && d) { commit(draft); }
    setDraft(null);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if ((e.key === "Delete" || e.key === "Backspace") && selected && canEdit) { e.preventDefault(); removeSelected(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
  };

  const fresh = tasks.filter((t) => (t.startDate || t.dueDate) && !doc.items.some((i) => "taskId" in i && i.taskId === t.id));
  const dateText = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  const statusText = { saved: L["timelines.saved"], dirty: L["timelines.unsaved"], saving: L["timelines.saving"], error: L["timelines.saveError"] }[status];
  const item = doc.items.find((i) => i.id === selected);
  const row = selected?.startsWith("row:") ? doc.rows.find((r) => `row:${r.id}` === selected) : undefined;
  const bars = doc.items.filter((i) => i.kind === "bar");
  const rowSelect = (value: string, onChange: (v: string) => void) => <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>{doc.rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>;
  const date = (value: string, onChange: (v: string) => void) => <input className="field" type="date" value={value} onChange={(e) => isIsoDate(e.target.value) && onChange(e.target.value)} />;
  const toggle = (value: boolean, onChange: (v: boolean) => void) => (
    <div className="tl-seg" role="group">
      <button type="button" aria-pressed={value} onClick={() => onChange(true)}>{L["timelines.s.show"]}</button>
      <button type="button" aria-pressed={!value} onClick={() => onChange(false)}>{L["timelines.s.hide"]}</button>
    </div>
  );

  return (
    <div className="tl-editor" onKeyDown={onKey}>
      <header className="tl-bar">
        <a className="btn btn-plain" href={listHref}>← {L["timelines.back"]}</a>
        <input className="tl-title" aria-label={L["timelines.s.title"]} value={doc.title} disabled={!canEdit} onChange={(e) => patch({ title: e.target.value })} maxLength={200} />
        <span className="tl-status" role="status" data-state={status}>{statusText}</span>
        <span className="tl-meta">{L["timelines.meta"].replace("{author}", author).replace("{created}", dateText(createdAt)).replace("{updated}", dateText(stamp))}</span>
        <span className="tl-spacer" />
        {canEdit && <>
          <button type="button" className="btn" onClick={undo} disabled={!hist.past.length}>{L["timelines.undo"]}</button>
          <button type="button" className="btn" onClick={redo} disabled={!hist.future.length}>{L["timelines.redo"]}</button>
          <button type="button" className="btn" onClick={() => void doSave()} disabled={status === "saved" || status === "saving"}>{L["timelines.save"]}</button>
        </>}
        <button type="button" className="btn btn-primary" onClick={exportPdf}>{L["timelines.exportPdf"]}</button>
      </header>
      {!canEdit && <p className="tl-note" role="note">{L["timelines.readOnly"]}</p>}
      <div className="tl-body">
        <div className="tl-stage" onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          <div className="tl-paper"><SlideSvg layout={layout} label={L["timelines.canvas"]} selected={selected} onPick={setSelected} onDown={onDown} /></div>
          {canEdit && (
            <div className="tl-tools" role="toolbar" aria-label={L["timelines.tools"]}>
              {tools.map(([name, run]) => <button key={name} type="button" onClick={run}>{name}</button>)}
              <span className="tl-sep" aria-hidden="true" />
              <button type="button" onClick={() => { setPicked(fresh.map((t) => t.id)); dialog.current?.showModal(); }}>{L["timelines.fromGantt"]}</button>
              <button type="button" onClick={() => commit(refreshFromGantt(doc, tasks))} disabled={!doc.items.some((i) => "taskId" in i && i.taskId)}>{L["timelines.refresh"]}</button>
            </div>
          )}
        </div>
        <aside className="tl-panel surface" aria-label={L["timelines.panel.item"]}>
          <fieldset disabled={!canEdit}>
            {!item && !row && <p className="tl-hint">{L["timelines.panel.none"]}</p>}
            {row && <>
              <h2>{L["timelines.panel.item"]}</h2>
              <F label={L["timelines.f.text"]}><input className="field" value={row.label} maxLength={120} onChange={(e) => commit({ ...doc, rows: doc.rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)) })} /></F>
              <F label={L["timelines.f.owner"]}><input className="field" value={row.owner} maxLength={60} onChange={(e) => commit({ ...doc, rows: doc.rows.map((r) => (r.id === row.id ? { ...r, owner: e.target.value } : r)) })} /></F>
              <div className="tl-actions">
                <button type="button" className="btn" onClick={() => moveRow(row.id, -1)}>{L["timelines.row.up"]}</button>
                <button type="button" className="btn" onClick={() => moveRow(row.id, 1)}>{L["timelines.row.down"]}</button>
                <button type="button" className="btn btn-danger" onClick={removeSelected}>{L["timelines.item.remove"]}</button>
              </div>
            </>}
            {item && item.kind !== "arrow" && <>
              <h2>{L["timelines.panel.item"]}</h2>
              <F label={L["timelines.f.text"]}><input className="field" value={item.label} maxLength={120} onChange={(e) => setItem(item.id, { label: e.target.value })} /></F>
              {"row" in item && <F label={L["timelines.f.row"]}>{rowSelect(item.row, (v) => setItem(item.id, { row: v }))}</F>}
              {item.kind === "milestone" ? <F label={L["timelines.f.date"]}>{date(item.date, (v) => setItem(item.id, { date: v }))}</F> : <>
                <F label={L["timelines.f.start"]}>{date(item.start, (v) => setItem(item.id, { start: v }))}</F>
                <F label={L["timelines.f.end"]}>{date(item.end, (v) => setItem(item.id, { end: v }))}</F>
              </>}
              <Colour label={L["timelines.f.colour"]} hexLabel={L["timelines.f.hex"]} value={item.color} onChange={(v) => setItem(item.id, { color: v })} />
              {item.kind === "bar" && <>
                <F label={L["timelines.f.shape"]}><select className="field" value={item.shape} onChange={(e) => setItem(item.id, { shape: e.target.value })}>{SHAPES.map((s) => <option key={s} value={s}>{L[`timelines.shape.${s}`]}</option>)}</select></F>
                <F label={L["timelines.f.progress"]}><input className="field" type="number" min={0} max={100} value={item.progress} onChange={(e) => setItem(item.id, { progress: Number(e.target.value) })} /></F>
                <F label={L["timelines.f.to"]}>
                  <select className="field" value={doc.items.find((i) => i.kind === "arrow" && i.from === item.id)?.id ? (doc.items.find((i) => i.kind === "arrow" && i.from === item.id) as { to: string }).to : ""} onChange={(e) => commit(cleanDoc({ ...doc, items: [...doc.items.filter((i) => !(i.kind === "arrow" && i.from === item.id)), ...(e.target.value ? [{ id: newId(), kind: "arrow", from: item.id, to: e.target.value }] : [])] }))}>
                    <option value="" />
                    {bars.filter((b) => b.id !== item.id).map((b) => <option key={b.id} value={b.id}>{b.kind === "bar" ? b.label : ""}</option>)}
                  </select>
                </F>
              </>}
              {"taskId" in item && item.taskId && <p className="tl-hint">{L["timelines.link"]}</p>}
              <div className="tl-actions"><button type="button" className="btn btn-danger" onClick={removeSelected}>{L["timelines.item.remove"]}</button></div>
            </>}
            <h2>{L["timelines.panel.slide"]}</h2>
            <F label={L["timelines.s.subtitle"]}><input className="field" value={doc.subtitle} maxLength={300} onChange={(e) => patch({ subtitle: e.target.value })} /></F>
            <F label={L["timelines.s.scale"]}><select className="field" value={doc.scale} onChange={(e) => patch({ scale: e.target.value as TlDoc["scale"] })}>{SCALES.map((s) => <option key={s} value={s}>{L[`timelines.scale.${s}`]}</option>)}</select></F>
            <F label={L["timelines.s.today"]}>{toggle(doc.showToday, (v) => patch({ showToday: v }))}</F>
            <F label={L["timelines.s.legend"]}>{toggle(doc.showLegend, (v) => patch({ showLegend: v }))}</F>
            <F label={L["timelines.s.owner"]}>{toggle(doc.ownerColumn, (v) => patch({ ownerColumn: v }))}</F>
            <F label={L["timelines.s.font"]}><select className="field" value={doc.font} onChange={(e) => patch({ font: e.target.value as TlDoc["font"] })}>{FONTS.map((f) => <option key={f} value={f}>{L[`timelines.font.${f}`]}</option>)}</select></F>
            <F label={L["timelines.s.fontSize"]}><input className="field" type="number" min={8} max={24} value={doc.fontSize} onChange={(e) => patch({ fontSize: Number(e.target.value) })} /></F>
            <F label={L["timelines.s.page"]}><select className="field" value={doc.page} onChange={(e) => patch({ page: e.target.value as TlDoc["page"] })}>{PAGES.map((p) => <option key={p} value={p}>{L[pageKey[p]]}</option>)}</select></F>
            <Colour label={L["timelines.s.background"]} hexLabel={L["timelines.f.hex"]} value={doc.background} onChange={(v) => patch({ background: v })} />
            <Colour label={L["timelines.s.textColour"]} hexLabel={L["timelines.f.hex"]} value={doc.textColor} onChange={(v) => patch({ textColor: v })} />
            <F label={L["timelines.s.rangeStart"]}><input className="field" type="date" value={doc.rangeStart} onChange={(e) => patch({ rangeStart: e.target.value })} /></F>
            <F label={L["timelines.s.rangeEnd"]}><input className="field" type="date" value={doc.rangeEnd} onChange={(e) => patch({ rangeEnd: e.target.value })} /></F>
            <div className="tl-actions"><button type="button" className="btn" onClick={() => patch({ rangeStart: "", rangeEnd: "" })}>{L["timelines.s.rangeAuto"]}</button></div>
            <h3>{L["timelines.s.legendEntries"]}</h3>
            {doc.legend.map((l, i) => (
              <div key={i} className="tl-legend">
                <input type="color" value={l.color} aria-label={L["timelines.f.hex"]} onChange={(e) => patch({ legend: doc.legend.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} />
                <input className="field" value={l.label} maxLength={40} aria-label={L["timelines.s.legendEntries"]} onChange={(e) => patch({ legend: doc.legend.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <button type="button" className="btn btn-plain" aria-label={L["timelines.item.remove"]} onClick={() => patch({ legend: doc.legend.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <div className="tl-actions"><button type="button" className="btn" onClick={() => patch({ legend: [...doc.legend, { color: STATUS_COLORS.active, label: "" }].slice(0, 8) })}>{L["timelines.s.legendAdd"]}</button></div>
          </fieldset>
        </aside>
      </div>

      <dialog ref={dialog} className="dialog" aria-labelledby="tl-gantt-t">
        <h2 id="tl-gantt-t">{L["timelines.fromGantt"]}</h2>
        <p className="tl-hint">{fresh.length ? L["timelines.gantt.hint"] : L["timelines.gantt.none"]}</p>
        <ul className="tl-picklist">
          {fresh.map((t) => (
            <li key={t.id}><label><input type="checkbox" checked={picked.includes(t.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, t.id] : picked.filter((x) => x !== t.id))} /> <b>{t.title}</b> <span className="tl-hint">{t.startDate ?? ""} {t.startDate && t.dueDate ? "→" : ""} {t.dueDate ?? ""}</span></label></li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()}>{L["timelines.cancel"]}</button>
          <button type="button" className="btn btn-primary" disabled={!picked.length} onClick={() => { commit(addFromGantt(doc, fresh.filter((t) => picked.includes(t.id)), L["timelines.milestones"])); dialog.current?.close(); }}>{L["timelines.gantt.add"].replace("{n}", String(picked.length))}</button>
        </div>
      </dialog>
    </div>
  );
}
