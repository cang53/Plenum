"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseLoad, bestOwnerLocal } from "./studioLocal";
import { Gantt } from "@/app/app/gantt/Gantt";
import type { ganttLabels } from "@/app/app/gantt/labels";
import type { GanttGroup, GanttTask } from "@/domain/gantt";
import type { Dependency } from "@/domain/schedule";
import type { Locale } from "@/lib/messages";
import { weekDates, loadPct, nearlyFull, type Draft, type Person } from "@/domain/planStudio";
import { studioChat, studioCommit, studioFromNotes } from "./studio-actions";
import type { STUDIO_KEYS } from "./studioLabels";

type Labels = Record<(typeof STUDIO_KEYS)[number], string>;
type Msg = { id: number; who: "me" | "ai"; text: string; typing?: boolean };
type Props = { riskId: string; people: Person[]; weekNames: string[]; existing: { title: string; s: number; l: number; hot?: boolean }[]; marker?: number | null; weekStart: string; gantt: { tasks: GanttTask[]; groups: GanttGroup[]; anchor?: string; dependencies: Dependency[]; labels: ReturnType<typeof ganttLabels>; locale: Locale; prefix: string; focusId?: string }; base: BaseLoad; labels: Labels; canManage: boolean; initialSteps?: Draft[]; initialLog?: { who: "me" | "ai"; text: string }[] };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PlanStudio({ riskId, people, weekNames, existing, marker = null, weekStart, gantt: { anchor, ...g }, base, labels: L, canManage, initialSteps = [], initialLog }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [steps, setSteps] = useState<Draft[]>(initialSteps);
  const saved = Boolean(initialLog?.length);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [log, setLog] = useState<Msg[]>(saved ? initialLog!.map((m, i) => ({ id: i, ...m })) : [{ id: 0, who: "ai", text: L["ps.hello"] }]);
  const [chips, setChips] = useState<string[]>([L["ps.chip.propose"]]);
  const [say, setSay] = useState("");
  const [notes, setNotes] = useState(L["ps.manual.sample"]);
  const [added, setAdded] = useState(saved);
  const [toast, setToast] = useState("");
  const [asking, setAsking] = useState(false);
  const [revealed, setRevealed] = useState<{ ids: string[] }>();
  const busy = useRef(false);
  const seq = useRef(initialLog?.length ?? 0);
  const logEl = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const segBtns = useRef<Record<string, HTMLButtonElement | null>>({});
  const nameOf = (id: string | null) => people.find((p) => p.userId === id);
  const roleLabel = (r: string) => L[`risks.role.${r}` as keyof Labels] ?? r;

  const push = (m: Omit<Msg, "id">) => { const id = ++seq.current; setLog((x) => [...x, { ...m, id }]); return id; };
  const reply = async (text: string, typingId?: number) => { await wait(650); setLog((x) => x.map((m) => (m.id === typingId ? { ...m, typing: false, text } : m))); };
  // Slide the chart to a step the agent added or moved.
  const reveal = (list: { id: number }[]) => setRevealed({ ids: [...list.map((x) => `p-${x.id}`), ...(g.focusId ? [g.focusId] : [])] });
  const flash = (id?: number) => { if (!id) return; setFlashId(id); setTimeout(() => setFlashId(null), 1400); };

  // The draft and the chat stay in this browser until the plan is added or the person starts over.
  const draftKey = `plenum:plan-draft:${riskId}`;
  const loaded = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect -- read once after mount: the server cannot see this browser's storage */
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? "null") as { mode: "ai" | "manual"; steps: Draft[]; log: Omit<Msg, "typing">[]; notes: string } | null;
      if (d && Array.isArray(d.steps) && Array.isArray(d.log)) {
        setMode(d.mode); setSteps(d.steps); setLog(d.log); setNotes(d.notes); setAdded(false);
        seq.current = Math.max(seq.current, ...d.log.map((m) => m.id), 0);
        setChips(d.steps.length ? [L["ps.chip.move"], L["ps.chip.assign"], L["ps.chip.shorter"], L["ps.chip.add"], L["ps.chip.remove"]] : mode === "ai" ? [L["ps.chip.propose"]] : []);
        if (d.steps.length) reveal(d.steps);
      }
    } catch { /* no saved draft */ }
    loaded.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loaded.current || added) return;
    try {
      const talked = log.some((m) => m.who === "me") || steps.length > 0;
      if (talked) localStorage.setItem(draftKey, JSON.stringify({ mode, steps, log: log.filter((m) => !m.typing && m.text), notes }));
      else localStorage.removeItem(draftKey);
    } catch { /* storage is off */ }
  }, [steps, log, mode, notes, added, draftKey]);
  useEffect(() => { logEl.current?.scrollTo({ top: 1e9 }); }, [log]);
  useEffect(() => {
    const b = segBtns.current[mode];
    if (b && pill.current) { pill.current.style.width = `${b.offsetWidth}px`; pill.current.style.transform = `translateX(${b.offsetLeft - 3}px)`; }
  }, [mode]);

  const reset = (m: "ai" | "manual") => { setMode(m); setSteps([]); setAdded(false); setAsking(false); setLog(m === "ai" ? [{ id: ++seq.current, who: "ai", text: L["ps.hello"] }] : []); setChips(m === "ai" ? [L["ps.chip.propose"]] : []); };

  async function turn(text: string) {
    if (busy.current || !text.trim()) return;
    busy.current = true; setSay("");
    push({ who: "me", text });
    const typing = push({ who: "ai", text: "", typing: true });
    try {
      const out = await studioChat(riskId, text, steps);
      const gone = steps.filter((s) => !out.steps.some((n) => n.id === s.id));
      if (gone.length) { setLeaving(gone[0].id); await wait(350); setLeaving(null); }
      const fresh = out.steps.filter((n) => !steps.some((o) => o.id === n.id));
      setAdded(false);
      if (fresh.length > 1) {
        // New steps arrive one after another so each bar visibly grows into place.
        const shown = new Set(out.steps.filter((n) => !fresh.includes(n)).map((n) => n.id));
        setSteps(out.steps.filter((n) => shown.has(n.id)));
        for (const n of fresh) { await wait(420); shown.add(n.id); const now = out.steps.filter((x) => shown.has(x.id)); setSteps(now); reveal(now); flash(n.id); }
      } else {
        setSteps(out.steps); flash(out.changed);
        const c = out.steps.find((n) => n.id === out.changed) ?? fresh[0];
        if (c) reveal(out.steps);
      }
      await reply(out.reply, typing);
      setChips(out.steps.length ? [L["ps.chip.move"], L["ps.chip.assign"], L["ps.chip.shorter"], L["ps.chip.add"], L["ps.chip.remove"]] : [L["ps.chip.propose"]]);
    } catch {
      await reply(L["ps.error"], typing);
    }
    busy.current = false;
  }

  async function fromNotes() {
    if (busy.current) return;
    busy.current = true; setSteps([]); setAdded(false);
    try {
      const out = await studioFromNotes(riskId, notes);
      for (const [i, s] of out.entries()) { await wait(380); setSteps((x) => [...x, s]); reveal(out.slice(0, i + 1)); flash(s.id); }
      setAsking(true);
    } catch { setToast(L["ps.error"]); setTimeout(() => setToast(""), 2600); }
    busy.current = false;
  }

  const open = asking ? steps.find((s) => !s.owner) : undefined;
  const suggest = open ? bestOwnerLocal(open, steps, people, base) : null;
  const answer = (id: number, owner: string | null) => { setSteps((x) => x.map((s) => (s.id === id ? (owner ? { ...s, owner } : { ...s, s: Math.min(8 - s.l, s.s + 1) }) : s))); flash(id); };

  async function commit() {
    try {
      const n = await studioCommit(riskId, mode === "ai" ? "ai" : "manual", steps, log.filter((m) => !m.typing && m.text).map(({ who, text }) => ({ who, text })), existing.slice(0, 6), marker);
      try { localStorage.removeItem(draftKey); } catch { /* storage is off */ }
      setAdded(true); setToast(L["ps.added"].replace("{n}", String(n))); setTimeout(() => setToast(""), 2600);
      router.refresh();
    } catch { setToast(L["ps.error"]); setTimeout(() => setToast(""), 2600); }
  }

  const proposals = Object.fromEntries(steps.map((s, i) => [`p-${s.id}`, { cls: `ps-c${i % 8}`, flash: flashId === s.id, leaving: leaving === s.id }]));
  // Proposed steps sit in the "Remediation plan" group right below the affected activity, as they will once accepted.
  const home = g.tasks.find((x) => x.id === anchor)?.phaseId;
  const remGroup = useMemo<GanttGroup | null>(() => (home && anchor ? (g.groups.find((x) => x.parentId === home && x.afterTaskId === anchor) ?? { id: "p-group", name: L["ps.group"], parentId: home, afterTaskId: anchor }) : null), [g.groups, home, anchor, L]);
  const groups = useMemo(() => (remGroup && !g.groups.some((x) => x.id === remGroup.id) ? [...g.groups, remGroup] : g.groups), [g.groups, remGroup]);
  const tasks = useMemo<GanttTask[]>(() => [
    ...g.tasks,
    ...(marker === null ? [] : [{ id: "p-risk", title: L["ps.riskDate"], startDate: weekDates(weekStart, marker, 1).startDate, dueDate: weekDates(weekStart, marker, 1).startDate, isMilestone: true, phase: null }]),
    ...steps.map((s) => ({ id: `p-${s.id}`, title: s.title, ...weekDates(weekStart, s.s, s.l), phase: remGroup?.name ?? L["ps.proposed"], phaseId: remGroup?.id, status: "todo" as const, ownerName: people.find((p) => p.userId === s.owner)?.name ?? null })),
  ], [g.tasks, steps, marker, weekStart, people, L, remGroup]);
  return (
    <div className="ps">
      <div className="ps-row">
        <h2>{L["ps.title"]}</h2>
        <div className="ps-seg" role="group" aria-label={L["ps.title"]}>
          <span className="ps-pill" ref={pill} />
          {(["ai", "manual"] as const).map((m) => (
            <button key={m} type="button" ref={(el) => { segBtns.current[m] = el; }} aria-pressed={mode === m} onClick={() => reset(m)}>{L[m === "ai" ? "ps.mode.ai" : "ps.mode.manual"]}</button>
          ))}
        </div>
      </div>
      <div className="ps-panes">
        <div>
          <section className="ps-card" aria-labelledby="ps-t1">
            <div className="ps-row">
              <div><h2 id="ps-t1">{L["ps.timeline"]}</h2><p className="ps-sub">{L["ps.timelineHint"]}</p></div>
              <div className="ps-row">
                <button type="button" className="ps-btn" onClick={() => reset(mode)}>{L["ps.start"]}</button>
                <button type="button" className="ps-btn p" disabled={!steps.length || added || !canManage} onClick={commit}>{added ? L["ps.added"].replace("{n}", String(steps.length)) : steps.length ? L["ps.add"].replace("{n}", String(steps.length)) : L["ps.addNone"]}</button>
              </div>
            </div>
            <div className="ps-gantt"><Gantt embedded {...g} groups={groups} tasks={tasks} proposals={proposals} reveal={revealed} /></div>
          </section>
          <section className="ps-card" aria-labelledby="ps-t2">
            <div className="ps-row"><h2 id="ps-t2">{L["ps.steps"]}</h2><span className="ps-tag">{steps.length || ""}</span></div>
            <ul className="ps-steps">
              {steps.length === 0 && <li className="ps-hint">{L["ps.stepsEmpty"]}</li>}
              {steps.map((s, i) => {
                const who = nameOf(s.owner);
                return (
                  <li key={s.id} className={`ps-step ps-c${i % 8}${flashId === s.id ? " flash" : ""}${leaving === s.id ? " leaving" : ""}`}>
                    <div className="ps-top">
                      <label><input type="checkbox" checked readOnly aria-label={s.title} />{s.title}</label>
                      {who ? <span className="ps-who"><span className="ps-av">{who.name.charAt(0).toUpperCase()}</span>{who.name} · {roleLabel(who.role)}</span> : <span className="ps-chip ps-bad">{L["ps.noOwner"]}</span>}
                    </div>
                    <p className="ps-meta">{weekNames[s.s]} → {weekNames[s.s + s.l - 1]} · {s.l} {L["ps.weekShort"]}</p>
                    {s.why && <p className="ps-hint">{s.why}</p>}
                    {!s.owner ? <p className="ps-gapmsg">{L["ps.gap"]} {mode === "ai" ? L["ps.gapAi"] : L["ps.gapManual"]}</p> : nearlyFull(s, steps, base) ? <p className="ps-gapmsg">{L["ps.nearlyFull"].replace("{who}", who?.name ?? "")}</p> : null}
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="ps-card" aria-labelledby="ps-t3">
            <h2 id="ps-t3">{L["ps.people"]}</h2>
            <div className="ps-people">
              {people.filter((p) => p.role !== "contributor").map((p) => {
                const v = loadPct(p.userId, steps, base);
                return (
                  <div className="ps-pp" key={p.userId}>
                    <span>{p.name}<br /><span className="ps-tag">{roleLabel(p.role)}</span></span>
                    <div className="ps-meter"><i style={{ width: `${v}%`, background: v >= 100 ? "var(--danger)" : v >= 66 ? "var(--warning)" : "var(--success)" }} /></div>
                    <span className="ps-meta">{v}%</span>
                  </div>
                );
              })}
            </div>
            <p className="ps-hint" style={{ marginTop: 8 }}>{L["ps.peopleHint"]}</p>
          </section>
        </div>
        <aside className="ps-card" aria-label={L["ps.agent"]}>
          {mode === "ai" ? (
            <div className="ps-chat">
              <div className="ps-row"><h2>{L["ps.agent"]}</h2><span className="ps-tag">{L["ps.agentHint"]}</span></div>
              <div className="ps-log" ref={logEl} aria-live="polite">
                {log.map((m) => <div key={m.id} className={`ps-msg ${m.who}`}>{m.typing ? <span className="ps-typing"><i /><i /><i /></span> : m.text}</div>)}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div className="ps-chips">{chips.map((c) => <button type="button" key={c} onClick={() => turn(c)}>{c}</button>)}</div>
                <form className="ps-send" onSubmit={(e) => { e.preventDefault(); turn(say); }}>
                  <input value={say} onChange={(e) => setSay(e.target.value)} placeholder={L["ps.say"]} aria-label={L["ps.say"]} autoComplete="off" maxLength={500} />
                  <button className="ps-btn p" type="submit">{L["ps.send"]}</button>
                </form>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="ps-row"><h2>{L["ps.manual.title"]}</h2><span className="ps-tag">{L["ps.manual.hint"]}</span></div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label={L["ps.manual.title"]} maxLength={4000} />
              <div className="ps-row"><span className="ps-hint">{L["ps.manual.help"]}</span><button type="button" className="ps-btn p" onClick={fromNotes}>{L["ps.manual.turn"]}</button></div>
              {asking && (open ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="ps-msg ai" style={{ maxWidth: "100%" }}><b>{L["ps.q.title"].replace("{n}", String(steps.findIndex((s) => s.id === open.id) + 1)).replace("{total}", String(steps.length))}</b><br />{L["ps.q.ask"].replace("{title}", open.title)}<br /><span className="ps-hint">{suggest ? L["ps.q.suggest"].replace("{who}", nameOf(suggest)?.name ?? "").replace("{week}", weekNames[open.s]) : L["ps.q.none"].replace("{week}", weekNames[open.s])}</span></div>
                  <div className="ps-chips">
                    {people.filter((p) => p.role !== "contributor").map((p) => <button type="button" key={p.userId} onClick={() => answer(open.id, p.userId)}>{p.name} · {roleLabel(p.role)}</button>)}
                    <button type="button" onClick={() => answer(open.id, null)}>{L["ps.q.later"]}</button>
                  </div>
                </div>
              ) : <p className="ps-gapmsg ok">{L["ps.q.done"]}</p>)}
            </div>
          )}
        </aside>
      </div>
      <div className={`ps-toast${toast ? " on" : ""}`} role="status">{toast}</div>
    </div>
  );
}
