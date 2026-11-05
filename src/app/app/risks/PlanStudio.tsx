"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BaseLoad, bestOwnerLocal } from "./studioLocal";
import { loadPct, nearlyFull, type Draft, type Person } from "@/domain/planStudio";
import { studioChat, studioCommit, studioFromNotes } from "./studio-actions";
import type { STUDIO_KEYS } from "./studioLabels";

type Labels = Record<(typeof STUDIO_KEYS)[number], string>;
type Msg = { id: number; who: "me" | "ai"; text: string; typing?: boolean };
type Props = { riskId: string; people: Person[]; weekNames: string[]; existing: { title: string; s: number; l: number; hot?: boolean }[]; marker?: number | null; base: BaseLoad; labels: Labels; canManage: boolean; initialSteps?: Draft[] };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PlanStudio({ riskId, people, weekNames, existing, marker = null, base, labels: L, canManage, initialSteps = [] }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [steps, setSteps] = useState<Draft[]>(initialSteps);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [log, setLog] = useState<Msg[]>([{ id: 0, who: "ai", text: L["ps.hello"] }]);
  const [chips, setChips] = useState<string[]>([L["ps.chip.propose"]]);
  const [say, setSay] = useState("");
  const [notes, setNotes] = useState(L["ps.manual.sample"]);
  const [added, setAdded] = useState(false);
  const [toast, setToast] = useState("");
  const [asking, setAsking] = useState(false);
  const busy = useRef(false);
  const seq = useRef(0);
  const logEl = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const segBtns = useRef<Record<string, HTMLButtonElement | null>>({});
  const nameOf = (id: string | null) => people.find((p) => p.userId === id);
  const roleLabel = (r: string) => L[`risks.role.${r}` as keyof Labels] ?? r;

  const push = (m: Omit<Msg, "id">) => { const id = ++seq.current; setLog((x) => [...x, { ...m, id }]); return id; };
  const reply = async (text: string, typingId?: number) => { await wait(650); setLog((x) => x.map((m) => (m.id === typingId ? { ...m, typing: false, text } : m))); };
  const flash = (id?: number) => { if (!id) return; setFlashId(id); setTimeout(() => setFlashId(null), 1400); };

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
      setSteps(out.steps); flash(out.changed);
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
      for (const s of out) { await wait(380); setSteps((x) => [...x, s]); flash(s.id); }
      setAsking(true);
    } catch { setToast(L["ps.error"]); setTimeout(() => setToast(""), 2600); }
    busy.current = false;
  }

  const open = asking ? steps.find((s) => !s.owner) : undefined;
  const suggest = open ? bestOwnerLocal(open, steps, people, base) : null;
  const answer = (id: number, owner: string | null) => { setSteps((x) => x.map((s) => (s.id === id ? (owner ? { ...s, owner } : { ...s, s: Math.min(8 - s.l, s.s + 1) }) : s))); flash(id); };

  async function commit() {
    try {
      const n = await studioCommit(riskId, mode === "ai" ? "ai" : "manual", steps, log.filter((m) => !m.typing && m.text).map(({ who, text }) => ({ who, text })), existing, marker);
      setAdded(true); setToast(L["ps.added"].replace("{n}", String(n))); setTimeout(() => setToast(""), 2600);
      router.refresh();
    } catch { setToast(L["ps.error"]); setTimeout(() => setToast(""), 2600); }
  }

  const grid = { gridTemplateColumns: `150px repeat(8, 1fr)` };
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
            <div className="ps-tl"><div className="ps-grid" role="img" aria-label={L["ps.timeline"]}>
              <div className="ps-weeks" style={grid}><span />{weekNames.map((w) => <span key={w}>{w}</span>)}</div>
              {existing.map((e) => (
                <div className="ps-lane" key={e.title}><span className="ps-lbl"><span className="ps-tag">{e.hot ? L["ps.affected"] : L["ps.existing"]}</span> {e.title}</span><div className="ps-track"><div className={`ps-bar${e.hot ? " hot" : ""}`} style={{ left: `${e.s * 12.5}%`, width: `${e.l * 12.5}%` }} /></div></div>
              ))}
              {marker !== null && <div className="ps-lane"><span className="ps-lbl"><span className="ps-tag">{L["ps.riskDate"]}</span></span><div className="ps-track"><div className="ps-bar mark" style={{ left: `${marker * 12.5}%` }} /></div></div>}
              {steps.map((s) => (
                <div className="ps-lane" key={s.id}><span className="ps-lbl"><b>{L["ps.new"]}</b> {s.title}</span><div className="ps-track"><div className={`ps-bar new${s.owner ? "" : " gap"}${added ? " done" : ""}`} style={{ left: `${s.s * 12.5}%`, width: `${s.l * 12.5}%` }} /></div></div>
              ))}
            </div></div>
          </section>
          <section className="ps-card" aria-labelledby="ps-t2">
            <div className="ps-row"><h2 id="ps-t2">{L["ps.steps"]}</h2><span className="ps-tag">{steps.length || ""}</span></div>
            <ul className="ps-steps">
              {steps.length === 0 && <li className="ps-hint">{L["ps.stepsEmpty"]}</li>}
              {steps.map((s) => {
                const who = nameOf(s.owner);
                return (
                  <li key={s.id} className={`ps-step${flashId === s.id ? " flash" : ""}${leaving === s.id ? " leaving" : ""}`}>
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
