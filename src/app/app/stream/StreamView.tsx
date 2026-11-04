import type { ReactNode } from "react";
import { MarkRead } from "./MarkRead";
import { Attach } from "./Attach";
import { SendButton } from "./SendButton";
import { AgentWait } from "./AgentWait";
import { LiveStream } from "./LiveStream";
import { StreamKeys } from "./StreamKeys";
import { applySuggestion, dismissSuggestionForm, linkMessageToTask, postMessage, resolveAgentAction, togglePin, undoAgentAction } from "./actions";
import { MoreLink } from "@/app/app/MoreLink";
import type { Pin } from "@/data/live";
import type { LinkedItem } from "@/domain/linking";
import type { MessageKey } from "@/lib/messages";
import { isImage, sizeLabel } from "@/domain/attachments";
import type { StreamDay, StreamQuery } from "@/domain/stream";
import { Composer } from "./Composer";
import { ReplyBar, ReplyButton } from "./Reply";
import { sanitizeHtml } from "@/domain/richtext";
import { proposalHosts, waitingForAgent, type AgentProposal } from "@/domain/agent";
import type { StoredSuggestion } from "@/domain/triage";
import type { TimelineMessage } from "@/domain/timeline";

// A body longer than this folds behind its first lines.
const LONG_BODY = 280;
const SOURCES = ["email", "app", "teams"] as const;

// "@agent" stands out in plain message text.
const mentions = (text: string) => text.split(/(@\w+)/).map((part, i) => (i % 2 ? <span key={i} className="mention">{part}</span> : part));

function AgentWho({ t, time, at }: { t: StreamViewProps["t"]; time: Intl.DateTimeFormat; at: string }) {
  return <p className="who"><b>{t("stream.agent.name")}</b><span className="pill">{t("stream.source.app")}</span><time dateTime={at}>{time.format(new Date(at))}</time></p>;
}

export type StreamViewProps = {
  t: (key: MessageKey) => string;
  base: string; // "/app/stream" or "/demo/messages"
  project: { id: string; name: string };
  days: StreamDay[];
  query: StreamQuery;
  next: string | null;
  fresh: { id: string; count: number } | null;
  linked: LinkedItem[];
  proposed: Map<string, StoredSuggestion[]>;
  actions?: AgentProposal[]; // pending proposals from the project agent, shown under the message they came from
  fileUrls?: Map<string, string>; // attachment id to a link, for files written in Plenum
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
  me?: string; // the signed-in person's address; their own messages get an accent bar
};

export function StreamView({ t, base, project, days, query, next, fresh, linked, proposed, actions = [], fileUrls, open, pins, pinned, canPin, decisions, time, date, now, readOnly, me }: StreamViewProps): ReactNode {
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ project: project.id });
    for (const [k, v] of Object.entries({ q: query.q, source: query.source, ...over })) if (v) p.set(k, v);
    return `${base}?${p}`;
  };
  const all = days.flatMap((d) => d.groups.flatMap((g) => g.messages));
  const host = proposalHosts(all);
  const waiting = readOnly ? new Set<string>() : waitingForAgent(all, now);
  const src = (a: AgentProposal) => all.find((x) => x.id === a.messageId) ?? all[0];
  const who = (m: TimelineMessage) => m.fromName || m.fromAddress;
  return (
    <main id="main" className="page msgs chat">
      {!readOnly && <MarkRead projectId={project.id} />}
      <header className="chat-head">
        <h1 className="sr-only">{project.name} · {t("stream.title")}</h1>
        <div className="chat-title"><h2>{t("stream.conversation")}</h2><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></div>
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
                  <article className="mail msg" data-src={m.source} data-mine={me && m.source === "app" && m.fromAddress === me ? "" : undefined} id={`msg-${m.id}`}>
                    <span className="avatar" aria-hidden="true">{who(m).charAt(0).toUpperCase()}</span>
                    <div className="msg-body">
                      <p className="who">
                        <b>{who(m)}</b>
                        <span className="pill" data-src={m.source}>{t(`stream.source.${m.source}`)}</span>
                        <time dateTime={m.receivedAt}>{time.format(new Date(m.receivedAt))}</time>
                      </p>
                      <div className="bubble">
                      {m.replyTo && (() => {
                        const q = all.find((x) => x.id === m.replyTo);
                        return q ? <a className="quote" href={`#msg-${q.id}`}><b>{who(q)}</b> {q.bodyText.slice(0, 120)}</a> : null;
                      })()}
                      {m.subject && <p className="subject">{email ? "✉ " : ""}{m.subject}</p>}
                      {long ? (
                        <details>
                          <summary>
                            <span className="ex">{m.bodyText.slice(0, LONG_BODY)}…</span>
                            <span className="open">{t("stream.openEmail")} ⌄</span>
                            <span className="shut">⌃ {t("stream.collapse")}</span>
                          </summary>
                          {m.bodyHtml ? <div className="full rich" dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.bodyHtml) }} /> : <div className="full">{m.bodyText}</div>}
                        </details>
                      ) : (
                        m.bodyHtml ? <div className="body rich" dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.bodyHtml) }} /> : <p className="body">{mentions(m.bodyText)}</p>
                      )}
                      {m.attachments.map((a) => {
                        const url = fileUrls?.get(a.id);
                        if (url && isImage(a.contentType)) {
                          // eslint-disable-next-line @next/next/no-img-element
                          return <a key={a.id} className="pic" href={url} target="_blank" rel="noreferrer"><img src={url} alt={a.filename} loading="lazy" /></a>;
                        }
                        return (
                          <div key={a.id} className="attach">
                            <span className="clip" aria-hidden="true">📎</span>
                            <span className="info">{url ? <a href={url} download={a.filename}>{a.filename}</a> : a.filename}<small>{a.contentType} · {sizeLabel(a.sizeBytes)}</small></span>
                          </div>
                        );
                      })}
                      </div>
                      <div className="mail-acts" role="group" aria-label={t("stream.actions")}>
                        <ReplyButton disabled={readOnly} label={t("stream.c.reply")} target={{ id: m.id, who: who(m), subject: m.subject, excerpt: m.bodyText.slice(0, 80) }} />
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
                  {waiting.has(m.id) && (
                    <div className="mail msg msg-agent msg-pending" data-src="app" role="status">
                      <span className="avatar" aria-hidden="true">P</span>
                      <div className="msg-body"><p className="who"><b>{t("stream.agent.name")}</b><span className="pill">{t("stream.source.app")}</span></p><div className="bubble"><p className="body">{t("stream.agentWriting")}…</p></div></div>
                    </div>
                  )}
                  {(proposed.get(m.id) ?? []).map((sg) => (
                    <section key={sg.id} className="mail msg msg-agent agent-card" aria-label={t("stream.agent")}>
                      <span className="avatar" aria-hidden="true">P</span>
                      <div className="msg-body">
                        <AgentWho t={t} time={time} at={m.receivedAt} />
                        <div className="bubble">
                          <p className="agent-tag">{t("stream.agent")} · {t(`stream.linked.${sg.kind}`)}</p>
                          <p className="agent-title">{sg.title}</p>
                          {sg.details && <p className="agent-details">{sg.details}</p>}
                          <p className="from">{t("stream.basedOn")} <a href={`#msg-${m.id}`}>{who(m)}, {time.format(new Date(m.receivedAt))}</a></p>
                          <div className="agent-acts agent-foot">
                            <form action={applySuggestion}>
                              {["id", "kind", "title", "details"].map((k) => <input key={k} type="hidden" name={k} value={k === "id" ? sg.id : String(sg[k as "kind" | "title" | "details"])} />)}
                              <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-primary">{t("stream.apply")}</button>
                            </form>
                            <details className="edit-pop">
                              <summary className="btn btn-secondary">{t("stream.edit")}</summary>
                              <form action={applySuggestion}>
                                <input type="hidden" name="id" value={sg.id} />
                                <input type="hidden" name="kind" value={sg.kind} />
                                <input name="title" defaultValue={sg.title} aria-label={t("stream.editTitle")} required />
                                <input name="details" defaultValue={sg.details} aria-label={t("stream.editDetails")} />
                                <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-primary">{t("stream.apply")}</button>
                              </form>
                            </details>
                            <form action={dismissSuggestionForm}>
                              <input type="hidden" name="id" value={sg.id} />
                              <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-secondary">{t("stream.dismiss")}</button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </section>
                  ))}
                  {actions.filter((a) => host.get(a.messageId) === m.id).map((a) => (
                    <section key={a.id} className="mail msg msg-agent agent-card" aria-label={t("stream.agent")}>
                      <span className="avatar" aria-hidden="true">P</span>
                      <div className="msg-body">
                        <AgentWho t={t} time={time} at={src(a).receivedAt} />
                        <div className="bubble">
                          <p className="agent-tag">{t("stream.agent")} · {t(`stream.agent.${a.kind}`)}</p>
                          <p className="agent-title">{a.title}</p>
                          {a.details && <p className="agent-details">{a.details}</p>}
                          {a.kind !== "add_dependency" && a.before && <p className="agent-details">{t("stream.before")}: {a.before.startDate ?? "–"} → {a.before.dueDate ?? "–"}</p>}
                          {a.kind !== "add_dependency" && <p className="agent-details">{a.before ? `${t("stream.after")}: ` : ""}{a.startDate ?? "–"} → {a.dueDate ?? "–"}</p>}
                          <p className="from">{t("stream.basedOn")} <a href={`#msg-${a.messageId}`}>{who(src(a))}, {time.format(new Date(src(a).receivedAt))}</a> · {a.reason}</p>
                          {a.accepted ? (
                            <div className="agent-foot" title={`${t("stream.acceptedBy")} ${a.accepted.by} · ${date.format(new Date(a.accepted.at))} ${time.format(new Date(a.accepted.at))}`}>
                              <svg className="ok" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M2 13l5 5L18 6M12 16l2 2L23 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              <p className="agent-done">{t(`stream.done.${a.kind}`)} · {`${t("stream.acceptedBy")} ${a.accepted.by} · ${date.format(new Date(a.accepted.at))} ${time.format(new Date(a.accepted.at))}`}</p>
                              <form action={undoAgentAction}>
                                <input type="hidden" name="id" value={a.id} />
                                <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-danger">{t("stream.undo")}</button>
                              </form>
                              <a className="go" href={`/app/items?project=${project.id}`} aria-label={t("stream.openItems")} title={t("stream.openItems")}>
                                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 12h17M14 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </a>
                            </div>
                          ) : (
                            <div className="agent-acts agent-foot">
                              {[["1", "stream.apply", "btn btn-primary"], ["0", "stream.dismiss", "btn btn-secondary"]].map(([accept, label, cls]) => (
                                <form key={accept} action={resolveAgentAction}>
                                  <input type="hidden" name="id" value={a.id} />
                                  <input type="hidden" name="accept" value={accept} />
                                  <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className={cls}>{t(label as MessageKey)}</button>
                                </form>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              );
            })}
          </section>
        ))}
        <LiveStream projectId={project.id} />
        {!decisions && (
          <div className="comp-wrap">
          <form className="comp" id="composer" action={postMessage}>
            <input type="hidden" name="projectId" value={project.id} />
            <ReplyBar replyingTo={t("stream.c.replyingTo")} cancel={t("stream.c.cancel")} />
            <div className="comp-row">
              <Attach label={t("stream.file.add")} remove={t("stream.file.remove")} errors={{ "stream.file.tooMany": t("stream.file.tooMany"), "stream.file.tooBig": t("stream.file.tooBig"), "stream.file.type": t("stream.file.type") }} disabled={readOnly} />
              <Composer disabled={!!readOnly} labels={{ placeholder: t("stream.composer"), bold: t("stream.fmt.bold"), italic: t("stream.fmt.italic"), underline: t("stream.fmt.underline"), list: t("stream.fmt.list"), color: t("stream.fmt.color"), colors: [t("stream.fmt.red"), t("stream.fmt.orange"), t("stream.fmt.green"), t("stream.fmt.blue"), t("stream.fmt.purple")], plain: t("stream.fmt.plain") }} />
              <SendButton label={t("stream.send")} disabled={readOnly}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </SendButton>
            </div>
            {!readOnly && <AgentWait />}
          </form>
          <p className="hint-agent">{t("stream.hint.agent")}</p>
          <p className="hint-keys">{t("stream.hint.keys")}</p>
          </div>
        )}
        {!decisions && <StreamKeys label={t("stream.jump")} hint={t("stream.keys")} fresh={t("stream.newMessages")} />}
      </div>
    </main>
  );
}
