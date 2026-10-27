import type { ReactNode } from "react";
import { MarkRead } from "./MarkRead";
import { StreamKeys } from "./StreamKeys";
import { applySuggestion, createTaskFromMessage, createTaskFromNote, dismissSuggestionForm, linkMessageToTask, togglePin } from "./actions";
import { MoreLink } from "@/app/app/MoreLink";
import type { Pin } from "@/data/live";
import type { LinkedItem } from "@/domain/linking";
import type { MessageKey } from "@/lib/messages";
import type { StreamDay } from "@/domain/stream";
import type { StoredSuggestion } from "@/domain/triage";
import type { TimelineMessage } from "@/domain/timeline";

// A body longer than this folds behind its first lines.
const LONG_BODY = 280;

export type StreamViewProps = {
  t: (key: MessageKey) => string;
  project: { id: string; name: string };
  rows: TimelineMessage[];
  days: StreamDay[];
  next: string | null;
  fresh: { id: string; count: number } | null;
  linked: LinkedItem[];
  proposed: Map<string, StoredSuggestion[]>;
  open: { id: string; title: string }[] | null;
  pins: Pin[];
  pinned: Set<string>;
  canPin: boolean;
  decisions: boolean;
  only: "email" | "teams" | undefined;
  time: Intl.DateTimeFormat;
  date: Intl.DateTimeFormat;
  now: Date;
  // The demo page shows the same markup with every button disabled and nothing stored.
  readOnly?: boolean;
};

export function StreamView({ t, project, rows, days, next, fresh, linked, proposed, open, pins, pinned, canPin, decisions, only, time, date, now, readOnly }: StreamViewProps): ReactNode {
  const count = rows.length;
  const countOf = (k: "teams" | "email") => rows.filter((m) => m.source === k).length;
  const rail = [
    { k: undefined, href: `/app/stream?project=${project.id}`, label: t("stream.tab.all"), note: String(count), on: !decisions && !only },
    { k: "teams", href: `/app/stream?project=${project.id}&source=teams`, label: t("stream.source.teams"), note: String(countOf("teams")), on: only === "teams" },
    { k: "email", href: `/app/stream?project=${project.id}&source=email`, label: t("stream.source.email"), note: String(countOf("email")), on: only === "email" },
    { k: "decisions", href: `/app/stream?project=${project.id}&view=decisions`, label: t("stream.tab.decisions"), note: String(pins.length), on: decisions },
  ];
  const shown = days.reduce((n, d) => n + d.groups.reduce((m, g) => m + g.messages.length, 0), 0);
  const side = linked.filter((l, i, all) => all.findIndex((x) => x.title === l.title) === i);
  return (
    <main id="main" className="page msgs">
      {!readOnly && <MarkRead projectId={project.id} />}
      <header className="msgs-head">
        <h1>{t("stream.title")}</h1>
        <p className="sub">{project.name} · {date.format(now)}</p>
      </header>
      <div className="msgs-grid">
        <nav className="msgs-rail" aria-label={t("stream.views")}>
          <h2>{t("stream.rail")}</h2>
          {rail.map((r) => (
            <a key={r.k ?? "all"} className="topic" href={r.href} aria-current={r.on ? "page" : undefined}>
              <b>{r.label}</b>
              <span>{r.note}</span>
            </a>
          ))}
          <div className="msgs-note">
            <b>{t("stream.projectEmail")}</b>
            <p>{t("stream.projectEmailNote")}</p>
          </div>
        </nav>
        <div className="msgs-main">
          <div className="msgs-title">
            <h2>{decisions ? t("stream.tab.decisions") : t(only ? `stream.source.${only}` : "stream.tab.all")}</h2>
            <p className="sub">{t("stream.shown").replace("{n}", String(decisions ? pins.length : shown))}</p>
          </div>
              {(decisions || pins.length > 0) && (
                <section className="pins" aria-labelledby="pins-h">
                  <h2 id="pins-h" className="sr">{t("stream.pinned")}</h2>
                  {pins.length === 0 && <p className="sub">{t("stream.noPins")}</p>}
                  {pins.map((p) => (
                    <article key={p.messageId} className="pin">
                      <p className={decisions ? "text" : "text clamp"}><b>{t("stream.pinned")}</b> · {p.message.subject || t("timeline.noSubject")}. {p.message.bodyText}</p>
                      <p className="sm">
                        {p.message.fromName || p.message.fromAddress} · {t("stream.pinnedBy").replace("{name}", p.pinnedBy).replace("{date}", date.format(new Date(p.pinnedAt)))}
                        {canPin && (
                          <form action={togglePin}>
                            <input type="hidden" name="projectId" value={project.id} />
                            <input type="hidden" name="messageId" value={p.messageId} />
                            <input type="hidden" name="pinned" value="1" />
                            <button type="submit" disabled={readOnly} className="btn btn-plain">{t("stream.unpin")}</button>
                          </form>
                        )}
                      </p>
                    </article>
                  ))}
                </section>
              )}
          {!decisions && <MoreLink path="/app/stream" params={{ project: project.id }} next={next} label={t("stream.earlier")} />}
          {!decisions && days.length === 0 && <p>{t("timeline.empty")}</p>}
          {!decisions && days.map((d) => (
            <section key={d.day} className="msgs-main" aria-labelledby={`day-${d.day}`}>
              <h2 id={`day-${d.day}`} className="dayrule">
                {d.relative ? t(`timeline.${d.relative}`) : date.format(new Date(`${d.day}T12:00:00Z`))}
              </h2>
              {d.groups.flatMap((g) => g.messages).map((m) => {
                const name = m.fromName || m.fromAddress;
                return (
                  <div key={m.id} className="msgs-main">
                    {fresh?.id === m.id && <p className="newline" role="separator"><span>{t("stream.new")} · {fresh.count}</span></p>}
                    <article className="mail" id={`msg-${m.id}`}>
                      <div className="mail-head">
                        <p className="owner"><span className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>{name}</p>
                        <p className="mail-meta">
                          <span className="pill">{t(`stream.source.${m.source}`)}</span>
                          <time dateTime={m.receivedAt}>{time.format(new Date(m.receivedAt))}</time>
                        </p>
                      </div>
                      <div className="envelope">
                        <p className="subject">{m.subject || t("timeline.noSubject")}</p>
                        <p className="line" title={m.fromAddress}>{t("stream.from")} {m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress}</p>
                      </div>
                      {m.bodyText.length > LONG_BODY ? (
                        <details>
                          <summary>
                            <span className="ex">{m.bodyText.slice(0, LONG_BODY)}…</span>
                            <span className="open">{t("stream.openEmail")} ⌄</span>
                            <span className="shut">⌃ {t("stream.collapse")}</span>
                          </summary>
                          <div className="full">{m.bodyText}</div>
                        </details>
                      ) : (
                        <p className="body">{m.bodyText}</p>
                      )}
                      {m.attachments.map((a) => (
                        <div key={a.id} className="attach">
                          <span className="clip" aria-hidden="true">📎</span>
                          <span className="info">{a.filename}<small>{a.contentType}</small></span>
                        </div>
                      ))}
                      <div className="mail-acts" role="group" aria-label={t("stream.actions")}>
                        {canPin && (
                          <form action={togglePin}>
                            <input type="hidden" name="projectId" value={project.id} />
                            <input type="hidden" name="messageId" value={m.id} />
                            {pinned.has(m.id) && <input type="hidden" name="pinned" value="1" />}
                            <button type="submit" data-act="pin" disabled={readOnly} className="btn btn-plain">{pinned.has(m.id) ? t("stream.unpin") : t("stream.pin")}</button>
                          </form>
                        )}
                        <form action={createTaskFromMessage}>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="messageId" value={m.id} />
                          <input type="hidden" name="title" value={m.subject || t("timeline.noSubject")} />
                          <button type="submit" data-act="task" disabled={readOnly} className="btn btn-plain">{t("stream.createTask")}</button>
                        </form>
                        {open && open.length > 0 && (
                          <details className="link-pop">
                            <summary className="btn btn-plain">{t("stream.linkTask")}</summary>
                            <form action={linkMessageToTask}>
                              <input type="hidden" name="messageId" value={m.id} />
                              <select name="taskId" aria-label={t("stream.pickTask")} required>
                                {open.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                              </select>
                              <button type="submit" disabled={readOnly} className="btn btn-secondary">{t("stream.link")}</button>
                            </form>
                          </details>
                        )}
                        {linked.filter((l) => l.messageId === m.id).map((l) => (
                          <a key={l.id} className="linked" href={`/app/items?project=${project.id}`}>{t(`stream.linked.${l.kind}`)}: {l.title}</a>
                        ))}
                      </div>
                    </article>
                        {(proposed.get(m.id) ?? []).map((sg) => (
                          <section key={sg.id} className="agent-card" aria-label={t("stream.agent")}>
                            <p className="agent-tag">{t("stream.agent")} · {t(`stream.linked.${sg.kind}`)}</p>
                            <p className="agent-title">{sg.title}</p>
                            {sg.details && <p className="agent-details">{sg.details}</p>}
                            <p className="from">{t("stream.basedOn")} <a href={`#msg-${m.id}`}>{m.fromName || m.fromAddress}, {time.format(new Date(m.receivedAt))}</a></p>
                            <div className="agent-acts">
                              <form action={applySuggestion}>
                                {["id", "kind", "title", "details"].map((k) => <input key={k} type="hidden" name={k} value={k === "id" ? sg.id : String(sg[k as "kind" | "title" | "details"])} />)}
                                <button type="submit" disabled={readOnly} className="btn btn-primary">{t("stream.apply")}</button>
                              </form>
                              <details className="edit-pop">
                                <summary className="btn btn-secondary">{t("stream.edit")}</summary>
                                <form action={applySuggestion}>
                                  <input type="hidden" name="id" value={sg.id} />
                                  <input type="hidden" name="kind" value={sg.kind} />
                                  <input name="title" defaultValue={sg.title} aria-label={t("stream.editTitle")} required />
                                  <input name="details" defaultValue={sg.details} aria-label={t("stream.editDetails")} />
                                  <button type="submit" disabled={readOnly} className="btn btn-primary">{t("stream.apply")}</button>
                                </form>
                              </details>
                              <form action={dismissSuggestionForm}>
                                <input type="hidden" name="id" value={sg.id} />
                                <button type="submit" disabled={readOnly} className="btn btn-secondary">{t("stream.dismiss")}</button>
                              </form>
                            </div>
                          </section>
                        ))}
                  </div>
                );
              })}
            </section>
          ))}
          {!decisions && (
            <form className="comp" action={createTaskFromNote}>
              <input type="hidden" name="projectId" value={project.id} />
              <textarea name="title" rows={1} required disabled={readOnly} placeholder={t("stream.composer")} aria-label={t("stream.composer")} />
              <p className="comp-foot">
                <span>🔒 {t("stream.projectOnly")} · {t("stream.composerHint")}</span>
                <button type="submit" className="btn btn-primary" disabled={readOnly}>{t("stream.send")}</button>
              </p>
            </form>
          )}
          {!decisions && <StreamKeys label={t("stream.jump")} hint={t("stream.keys")} />}
        </div>
        <aside className="msgs-side" aria-label={t("stream.linkedItems")}>
          <section className="side-card">
            <h2>{t("stream.linkedItems")}</h2>
            {side.length === 0 && <p>{t("stream.noLinked")}</p>}
            {side.map((l) => <a key={l.id} href={`/app/items?project=${project.id}`}>↗ {l.title}</a>)}
          </section>
        </aside>
      </div>
    </main>
  );
}
