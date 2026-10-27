import type { ReactNode } from "react";
import { MarkRead } from "./MarkRead";
import { StreamKeys } from "./StreamKeys";
import { applySuggestion, createTaskFromMessage, dismissSuggestionForm, linkMessageToTask, postMessage, togglePin } from "./actions";
import { MoreLink } from "@/app/app/MoreLink";
import type { Pin } from "@/data/live";
import type { LinkedItem } from "@/domain/linking";
import type { MessageKey } from "@/lib/messages";
import type { StreamDay, StreamQuery, Thread } from "@/domain/stream";
import type { StoredSuggestion } from "@/domain/triage";

// A body longer than this folds behind its first lines.
const LONG_BODY = 280;

export type StreamViewProps = {
  t: (key: MessageKey) => string;
  base: string; // "/app/stream" or "/demo/messages"
  project: { id: string; name: string };
  threads: Thread[];
  current: Thread | null;
  days: StreamDay[];
  query: StreamQuery;
  chosen: boolean; // a conversation was picked, so a phone shows it instead of the list
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

export function StreamView({ t, base, project, threads, current, days, query, chosen, next, fresh, linked, proposed, open, pins, pinned, canPin, decisions, time, date, now, readOnly }: StreamViewProps): ReactNode {
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ project: project.id });
    const all: Record<string, string | undefined> = { q: query.q, filter: query.filter, source: query.source, ...over };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, v);
    return `${base}?${p}`;
  };
  const chips = [
    { label: t("stream.tab.all"), over: { filter: undefined, view: undefined }, on: !decisions && !query.filter },
    { label: t("stream.c.unread"), over: { filter: "unread", view: undefined }, on: query.filter === "unread" },
    { label: t("stream.c.reply"), over: { filter: "reply", view: undefined }, on: query.filter === "reply" },
    { label: t("stream.tab.decisions"), over: { view: "decisions" }, on: decisions },
  ];
  const sources = (["email", "app", "teams"] as const).map((k) => ({ k, label: t(`stream.source.${k}`), on: query.source === k }));
  const threadIds = new Set(current?.messages.map((m) => m.id));
  const side = linked.filter((l) => threadIds.has(l.messageId)).filter((l, i, all) => all.findIndex((x) => x.title === l.title) === i);
  const waiting = current ? current.messages.reduce((n, m) => n + (proposed.get(m.id)?.length ?? 0), 0) : 0;
  const newHere = current ? current.unread : 0;
  return (
    <main id="main" className="page msgs">
      {!readOnly && <MarkRead projectId={project.id} />}
      <header className="msgs-head">
        <h1>{t("stream.title")}</h1>
        <p className="sub">{project.name} · {date.format(now)}</p>
      </header>
      <div className="msgs-grid" data-open={chosen ? "" : undefined}>
        <nav className="msgs-rail" aria-label={t("stream.views")}>
          <form action={base} role="search" className="msgs-search">
            <input type="hidden" name="project" value={project.id} />
            {query.filter && <input type="hidden" name="filter" value={query.filter} />}
            {query.source && <input type="hidden" name="source" value={query.source} />}
            <input type="search" name="q" defaultValue={query.q} placeholder={t("stream.c.search")} aria-label={t("stream.c.search")} />
          </form>
          <div className="chips" role="group" aria-label={t("stream.c.state")}>
            {chips.map((c) => <a key={c.label} className="chip" href={href(c.over)} aria-current={c.on ? "page" : undefined}>{c.label}</a>)}
          </div>
          <div className="chips" role="group" aria-label={t("stream.filter")}>
            {sources.map((c) => <a key={c.k} className="chip" href={href({ source: c.on ? undefined : c.k, view: undefined })} aria-current={c.on ? "page" : undefined}>{c.label}</a>)}
          </div>
          <h2 className="sr">{t("stream.c.conv")}</h2>
          {!decisions && threads.length === 0 && <p className="sub">{t("stream.c.none")}</p>}
          {!decisions && threads.map((th) => (
            <a key={th.key} className="topic thread" href={href({ thread: th.key })} aria-current={th.key === current?.key ? "page" : undefined}>
              <b>{th.unread > 0 && <i className="dot" aria-label={t("stream.new")} />}{th.subject || t("timeline.noSubject")}</b>
              <span className="snip">{th.last.fromName || th.last.fromAddress}: {th.last.bodyText}</span>
              <span className="meta">
                {th.sources.map((k) => <em key={k} className="pill">{t(`stream.source.${k}`)}</em>)}
                <time dateTime={th.last.receivedAt}>{time.format(new Date(th.last.receivedAt))}</time>
                {th.unread > 0 && <strong>{th.unread}</strong>}
                {th.needsReply && <small>{t("stream.c.nowait")}</small>}
              </span>
            </a>
          ))}
          {!decisions && <MoreLink path={base} params={{ project: project.id }} next={next} label={t("stream.earlier")} />}
        </nav>
        <div className="msgs-main conv">
          {current && !decisions && (
            <div className="msgs-title">
              <a className="back" href={href({ thread: undefined })}>← {t("stream.c.back")}</a>
              <h2>{current.subject || t("timeline.noSubject")}</h2>
              <p className="sub">{t("stream.c.msgs").replace("{n}", String(current.messages.length))} · {current.sources.map((k) => t(`stream.source.${k}`)).join(", ")}</p>
              {(newHere > 0 || waiting > 0) && <p className="catchup">{t("stream.c.catch").replace("{n}", String(newHere)).replace("{s}", String(waiting))}</p>}
            </div>
          )}
              {(decisions || pins.some((p) => threadIds.has(p.messageId))) && (
                <section className="pins" aria-labelledby="pins-h">
                  <h2 id="pins-h" className="sr">{t("stream.pinned")}</h2>
                  {pins.length === 0 && <p className="sub">{t("stream.noPins")}</p>}
                  {pins.filter((p) => decisions || threadIds.has(p.messageId)).map((p) => (
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
                        {(m.subject || m.source === "email") && <p className="subject">{m.subject || t("timeline.noSubject")}</p>}
                        {m.source === "email" && <p className="line" title={m.fromAddress}>{t("stream.from")} {m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress}</p>}
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
                          <input type="hidden" name="title" value={m.subject || m.bodyText.slice(0, 80) || t("timeline.noSubject")} />
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
            <form className="comp" action={postMessage}>
              <input type="hidden" name="projectId" value={project.id} />
              {current ? <input type="hidden" name="subject" value={current.subject} /> : <input name="subject" required disabled={readOnly} placeholder={t("stream.c.subject")} aria-label={t("stream.c.subject")} />}
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
