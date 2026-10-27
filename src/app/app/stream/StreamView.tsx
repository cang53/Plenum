import type { ReactNode } from "react";
import { MarkRead } from "./MarkRead";
import { StreamKeys } from "./StreamKeys";
import { applySuggestion, dismissSuggestionForm, linkMessageToTask, postMessage, togglePin } from "./actions";
import { MoreLink } from "@/app/app/MoreLink";
import type { Pin } from "@/data/live";
import type { LinkedItem } from "@/domain/linking";
import type { MessageKey } from "@/lib/messages";
import type { StreamDay, StreamQuery } from "@/domain/stream";
import type { StoredSuggestion } from "@/domain/triage";
import type { TimelineMessage } from "@/domain/timeline";

// A body longer than this folds behind its first lines.
const LONG_BODY = 280;
const SOURCES = ["email", "app", "teams"] as const;

export type StreamViewProps = {
  t: (key: MessageKey) => string;
  base: string; // "/app/stream" or "/demo/messages"
  project: { id: string; name: string };
  days: StreamDay[];
  query: StreamQuery;
  reply: TimelineMessage | null; // the message the composer answers
  next: string | null;
  fresh: { id: string; count: number } | null;
  linked: LinkedItem[];
  proposed: Map<string, StoredSuggestion[]>;
  open: { id: string; title: string }[] | null;
  pins: Pin[];
  pinned: Set<string>;
  canPin: boolean;
  decisions: boolean;
  time: Intl.DateTimeFormat;
  date: Intl.DateTimeFormat;
  now: Date;
  // The demo page shows the same markup with every button disabled and nothing stored.
  readOnly?: boolean;
};

export function StreamView({ t, base, project, days, query, reply, next, fresh, linked, proposed, open, pins, pinned, canPin, decisions, time, date, now, readOnly }: StreamViewProps): ReactNode {
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ project: project.id });
    for (const [k, v] of Object.entries({ q: query.q, source: query.source, ...over })) if (v) p.set(k, v);
    return `${base}?${p}`;
  };
  const replySubject = reply ? `Re: ${reply.subject.replace(/^(\s*re:)+\s*/i, "") || reply.bodyText.slice(0, 60)}` : "";
  const who = (m: TimelineMessage) => m.fromName || m.fromAddress;
  return (
    <main id="main" className="page msgs chat">
      {!readOnly && <MarkRead projectId={project.id} />}
      <header className="chat-head">
        <div>
          <h1>{project.name}</h1>
          <p className="sub">{t("stream.title")} · {date.format(now)}</p>
        </div>
        <nav className="chips" aria-label={t("stream.views")}>
          <a className="chip" href={href({ source: undefined, view: undefined })} aria-current={!query.source && !decisions ? "page" : undefined}>{t("stream.tab.all")}</a>
          {SOURCES.map((k) => <a key={k} className="chip" data-src={k} href={href({ source: k, view: undefined })} aria-current={query.source === k ? "page" : undefined}>{t(`stream.source.${k}`)}</a>)}
          <a className="chip" href={href({ view: "decisions", source: undefined })} aria-current={decisions ? "page" : undefined}>{t("stream.tab.decisions")} · {pins.length}</a>
          <form action={base} role="search" className="msgs-search">
            <input type="hidden" name="project" value={project.id} />
            {query.source && <input type="hidden" name="source" value={query.source} />}
            <input type="search" name="q" defaultValue={query.q} placeholder={t("stream.c.search")} aria-label={t("stream.c.search")} />
          </form>
        </nav>
      </header>
      <div className="msgs-main feed">
        {(decisions || pins.length > 0) && (
          <details className="pins" open={decisions}>
            <summary>{t("stream.pinned")} · {pins.length}</summary>
            {pins.length === 0 && <p className="sub">{t("stream.noPins")}</p>}
            {pins.map((p) => (
              <article key={p.messageId} className="pin">
                <p className="text"><b>{p.message.subject || t("timeline.noSubject")}</b> {p.message.bodyText.slice(0, 160)}</p>
                <p className="sm">
                  {who(p.message)} · {t("stream.pinnedBy").replace("{name}", p.pinnedBy).replace("{date}", date.format(new Date(p.pinnedAt)))}
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
          </details>
        )}
        {!decisions && <MoreLink path={base} params={{ project: project.id }} next={next} label={t("stream.earlier")} />}
        {!decisions && days.length === 0 && <p className="sub">{t("timeline.empty")}</p>}
        {!decisions && days.map((d) => (
          <section key={d.day} className="msgs-main" aria-labelledby={`day-${d.day}`}>
            <h2 id={`day-${d.day}`} className="dayrule"><span>{d.relative ? t(`timeline.${d.relative}`) : date.format(new Date(`${d.day}T12:00:00Z`))}</span></h2>
            {d.groups.flatMap((g) => g.messages).map((m) => {
              const email = m.source === "email";
              const long = m.bodyText.length > LONG_BODY;
              return (
                <div key={m.id} className="msgs-main">
                  {fresh?.id === m.id && <p className="newline" role="separator"><span>{t("stream.new")} · {fresh.count}</span></p>}
                  <article className="mail msg" data-src={m.source} id={`msg-${m.id}`}>
                    <span className="avatar" aria-hidden="true">{who(m).charAt(0).toUpperCase()}</span>
                    <div className="msg-body">
                      <p className="who">
                        <b>{who(m)}</b>
                        <span className="pill" data-src={m.source}>{t(`stream.source.${m.source}`)}</span>
                        <time dateTime={m.receivedAt}>{time.format(new Date(m.receivedAt))}</time>
                      </p>
                      {m.subject && <p className="subject">{email ? "✉ " : ""}{m.subject}</p>}
                      {long ? (
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
                        <a className="btn btn-plain" href={`${href({ reply: m.id })}#composer`}>{t("stream.c.reply")}</a>
<details className="mail-create">
                          <summary className="btn btn-plain">{t("stream.createItem")}</summary>
                          <div>{(["task", "decision", "risk"] as const).map((k) => <a key={k} href={`/app/items?project=${project.id}&create=${k}&from=${m.id}`}>{t(`kind.${k}`)}</a>)}</div>
                        </details>
                        {canPin && (
                          <form action={togglePin}>
                            <input type="hidden" name="projectId" value={project.id} />
                            <input type="hidden" name="messageId" value={m.id} />
                            {pinned.has(m.id) && <input type="hidden" name="pinned" value="1" />}
                            <button type="submit" data-act="pin" disabled={readOnly} className="btn btn-plain">{pinned.has(m.id) ? t("stream.unpin") : t("stream.pin")}</button>
                          </form>
                        )}
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
                      </div>
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
                      <p className="from">{t("stream.basedOn")} <a href={`#msg-${m.id}`}>{who(m)}, {time.format(new Date(m.receivedAt))}</a></p>
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
          <form className="comp" id="composer" action={postMessage}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="subject" value={replySubject} />
            {reply && <p className="replying">{t("stream.c.replyingTo")} <b>{who(reply)}</b> · <a href={href({})}>{t("stream.c.cancel")}</a></p>}
            <textarea name="body" rows={1} required disabled={readOnly} placeholder={t("stream.composer")} aria-label={t("stream.composer")} />
            <p className="comp-foot">
              <span>
                <select name="channel" aria-label={t("stream.channel")} defaultValue="app">
                  <option value="app">{t("stream.source.app")}</option>
                  <option value="email" disabled>{t("stream.source.email")} · {t("stream.notConnected")}</option>
                  <option value="teams" disabled>{t("stream.source.teams")} · {t("stream.notConnected")}</option>
                </select>{" "}
                {t("stream.composerHint")}
              </span>
              <button type="submit" className="btn btn-primary" disabled={readOnly}>{t("stream.send")}</button>
            </p>
          </form>
        )}
        {!decisions && <StreamKeys label={t("stream.jump")} hint={t("stream.keys")} />}
      </div>
    </main>
  );
}
