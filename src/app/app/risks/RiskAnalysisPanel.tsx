"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { askAnalysis, refreshAnalysis } from "./analysis-actions";
import type { Analysis } from "@/domain/riskAnalysis";

type Labels = Record<"title" | "hint" | "updated" | "weekly" | "manual" | "none" | "refresh" | "working" | "flags" | "hints" | "lessons" | "fromLibrary" | "ask" | "send" | "error" | "noLessons" | "empty" | "high" | "medium" | "info", string>;
type Props = { projectId: string; analysis: (Analysis & { source: "weekly" | "manual"; createdAt: string }) | null; items: Record<string, { code: string; title: string; href: string }>; labels: Labels; canManage: boolean; locale: string };
type Msg = { id: number; who: "me" | "ai"; text: string; typing?: boolean };

// The analysis as a chat: the agent's findings as messages, then the person can ask follow-up questions.
export function RiskAnalysisPanel({ projectId, analysis, items, labels: L, canManage, locale }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const seq = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (msgs.length) end.current?.scrollIntoView({ block: "nearest" }); }, [msgs]);
  const link = (id: string | null) => (id && items[id] ? <a href={items[id].href} className="rk-link" title={items[id].title}>{items[id].code}</a> : null);

  async function refresh() {
    setBusy(true);
    try { await refreshAnalysis(projectId); router.refresh(); } catch { setMsgs((m) => [...m, { id: ++seq.current, who: "ai", text: L.error }]); }
    setBusy(false);
  }
  async function send() {
    const q = text.trim();
    if (!q || busy) return;
    setText(""); setBusy(true);
    const typing = ++seq.current;
    setMsgs((m) => [...m, { id: ++seq.current, who: "me", text: q }, { id: typing, who: "ai", text: "", typing: true }]);
    let a = L.error;
    try { a = (await askAnalysis(projectId, q)) || L.error; } catch { /* keep the error text */ }
    setMsgs((m) => m.map((x) => (x.id === typing ? { ...x, typing: false, text: a } : x)));
    setBusy(false);
  }
  const when = analysis ? new Date(analysis.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" }) : "";
  return (
    <section className="surface rk-card ra" aria-labelledby="ra-t">
      <div className="rk-card-top">
        <div><h2 id="ra-t"><span className="rk-aitag">{L.title}</span></h2><p className="meta">{analysis ? L.updated.replace("{date}", when).replace("{source}", analysis.source === "weekly" ? L.weekly : L.manual) : L.none}</p></div>
        {canManage && <button type="button" className="btn btn-soft btn-sm" onClick={refresh} disabled={busy}>{busy ? L.working : L.refresh}</button>}
      </div>
      <div className="ra-log" aria-live="polite">
        {!analysis && <div className="ps-msg ai">{L.hint}</div>}
        {analysis && (
          <>
            <div className="ps-msg ai">{analysis.summary}</div>
            {analysis.flags.length > 0 && (
              <div className="ps-msg ai"><strong>{L.flags}</strong>
                <ul className="ra-list">{analysis.flags.map((f, i) => <li key={i}><span className={`st st-${f.level === "high" ? "bad" : f.level === "medium" ? "warn" : "ok"}`}>{L[f.level]}</span> {link(f.riskId)} {f.text}</li>)}</ul></div>
            )}
            {analysis.hints.length > 0 && <div className="ps-msg ai"><strong>{L.hints}</strong><ul className="ra-list">{analysis.hints.map((h, i) => <li key={i}>{h}</li>)}</ul></div>}
            <div className="ps-msg ai"><strong>{L.lessons}</strong>
              {analysis.lessons.length === 0 ? <p className="meta">{L.noLessons}</p> : (
                <ul className="ra-list">{analysis.lessons.map((l, i) => <li key={i}>{link(l.riskId)} {l.text}<br /><a className="rk-link" href="/app/library">{L.fromLibrary.replace("{doc}", l.docTitle)}</a></li>)}</ul>
              )}
            </div>
          </>
        )}
        {msgs.map((m) => <div key={m.id} className={`ps-msg ${m.who}`}>{m.typing ? <span className="ps-typing"><i /><i /><i /></span> : m.text}</div>)}
        <div ref={end} />
      </div>
      <form className="ps-send" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={L.ask} aria-label={L.ask} maxLength={800} autoComplete="off" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{L.send}</button>
      </form>
    </section>
  );
}
