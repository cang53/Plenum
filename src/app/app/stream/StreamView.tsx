import type { ReactNode } from "react";
import { MarkRead } from "./MarkRead";
import { Attach } from "./Attach";
import { SendButton } from "./SendButton";
import { AgentWait } from "./AgentWait";
import { LiveStream } from "./LiveStream";
import { StreamKeys } from "./StreamKeys";
import { SearchBar } from "./SearchBar";
import { SuggestionCarousel } from "./SuggestionCarousel";
import { applySuggestion, dismissSuggestionForm, linkMessageToTask, postMessage, resolveAgentAction, toggleReaction, togglePin, undoAgentAction } from "./actions";
import { MoreLink } from "@/app/app/MoreLink";
import type { Pin } from "@/data/live";
import type { LinkedItem } from "@/domain/linking";
import type { MessageKey } from "@/lib/messages";
import { isImage, sizeLabel } from "@/domain/attachments";
import type { StreamDay, StreamQuery } from "@/domain/stream";
import { Composer } from "./Composer";
import type { MentionItem } from "@/domain/mentions";
import { ReplyBar, ReplyButton } from "./Reply";
import { sanitizeHtml } from "@/domain/richtext";
import { AGENT_ADDRESS, proposalHosts, waitingForAgent, type AgentProposal } from "@/domain/agent";
import { isoWeek, shiftDays } from "@/domain/riskPlan";
import type { StoredSuggestion } from "@/domain/triage";
import { REACTION_EMOJIS, type Reaction } from "@/domain/reactions";
import type { TimelineMessage } from "@/domain/timeline";

// A body longer than this folds behind its first lines.
const LONG_BODY = 280;

// "@cobia" stands out in plain message text.
const mentions = (text: string) => text.split(/(@\w+)/).map((part, i) => (i % 2 ? <span key={i} className="mention">{part}</span> : part));

// CobIA's face: a small friendly robot with a wink.
function Robot() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3" /><circle cx="12" cy="2.6" r="1" fill="currentColor" />
      <rect x="4.5" y="6" width="15" height="12" rx="4" />
      <path d="M2.5 11v3M21.5 11v3" />
      <circle cx="9.2" cy="11" r="1.3" fill="currentColor" stroke="none" /><path d="M13.6 11h2.6" />
      <path d="M9 14.6c1.8 1.4 4.2 1.4 6 0" />
      <path d="M9 18v2h6v-2" />
    </svg>
  );
}

// What a proposed date change does to the timeline: the old dates in grey, the proposal hatched, green once accepted. One column per day.
const DAY_MS = 86_400_000;
export function Impact({ a, label, before, after, done }: { a: AgentProposal; label: string; before: string; after: string; done: boolean }) {
  if (a.kind === "add_dependency" || !a.dueDate) return null;
  const span = (s: string | null, d: string | null) => (d ? { start: s ?? d, due: d } : null);
  const now = span(a.startDate, a.dueDate)!;
  const was = a.before ? span(a.before.startDate, a.before.dueDate) : null;
  const all = [now, ...(was ? [was] : [])];
  const first = all.map((x) => x.start).sort()[0];
  const last = all.map((x) => x.due).sort().reverse()[0];
  const day = (d: string) => Math.round((Date.parse(d) - Date.parse(first)) / DAY_MS);
  const n = day(last) + 1;
  if (n < 1 || n > 120) return null;
  const weeks = Array.from({ length: n }, (_, i) => shiftDays(first, i)).flatMap((d, i) => (i === 0 || new Date(`${d}T00:00:00Z`).getUTCDay() === 1 ? [{ i, w: isoWeek(d) }] : []));
  const cols = { gridTemplateColumns: `repeat(${n}, 1fr)` };
  const lane = (x: { start: string; due: string } | null, name: string, cls: string) => (
    <div className="impact-lane"><span>{name}</span><div className="impact-track" style={cols}>{x && <i className={cls} style={{ gridColumn: `${day(x.start) + 1} / ${day(x.due) + 2}` }} />}</div></div>
  );
  return (
    <div className="impact" role="img" aria-label={label}>
      <div className="impact-lane impact-weeks"><span /><div className="impact-track" style={cols}>{weeks.map((x) => <b key={x.i} style={{ gridColumn: `${x.i + 1} / ${n + 1}`, justifySelf: "start", gridRow: 1 }}>W{x.w}</b>)}</div></div>
      {was && lane(was, before, "was")}
      {lane(now, after, done ? "now done" : "now")}
    </div>
  );
}

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
  reactions?: Map<string, Reaction[]>; // emoji chips per message id
  fileUrls?: Map<string, string>; // attachment id to a link, for files written in Plenum
  open: { id: string; title: string }[] | null;
  mentionItems?: MentionItem[];
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

export function StreamView({ t, base, project, days, query, next, fresh, linked, proposed, actions = [], reactions, fileUrls, open, mentionItems, pins, pinned, canPin, decisions, time, date, now, readOnly, me }: StreamViewProps): ReactNode {
  const all = days.flatMap((d) => d.groups.flatMap((g) => g.messages));
  const host = proposalHosts(all);
  const waiting = readOnly ? new Set<string>() : waitingForAgent(all, now);
  const src = (a: AgentProposal) => all.find((x) => x.id === a.messageId) ?? all[0];
  const who = (m: TimelineMessage) => (m.fromAddress === AGENT_ADDRESS ? t("stream.agent.name") : m.fromName || m.fromAddress);
  const sugBubble = (sg: StoredSuggestion, m: TimelineMessage) => (
    <div className="bubble">
      <p className="agent-tag">{t("stream.agent")} · {t(sg.riskKind ? (`risks.kind.${sg.riskKind}` as "risks.kind.risk") : `stream.linked.${sg.kind}`)}</p>
      <p className="agent-title">{sg.title}</p>
      {sg.details && <p className="agent-details">{sg.details}</p>}
      {sg.riskKind && <p className="agent-details">{t("risks.likelihood")} {sg.likelihood}/5 · {t("risks.severityShort")} {sg.severity}/5</p>}
      <p className="from">{t("stream.basedOn")} <a href={`#msg-${m.id}`}>{who(m)}, {time.format(new Date(m.receivedAt))}</a></p>
      <div className="agent-acts agent-foot">
        <form action={applySuggestion}>
          {["id", "kind", "title", "details", "riskKind", "likelihood", "severity"].map((k) => sg[k as "kind"] !== undefined && <input key={k} type="hidden" name={k} value={k === "id" ? sg.id : String(sg[k as "kind"])} />)}
          <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-primary">{t("stream.apply")}</button>
        </form>
        <details className="edit-pop">
          <summary className="btn btn-secondary">{t("stream.edit")}</summary>
          <form action={applySuggestion}>
            <input type="hidden" name="id" value={sg.id} />
            <input type="hidden" name="kind" value={sg.kind} />
            <input name="title" defaultValue={sg.title} aria-label={t("stream.editTitle")} required />
            <input name="details" defaultValue={sg.details} aria-label={t("stream.editDetails")} />
            {sg.riskKind && (
              <>
                <select name="riskKind" defaultValue={sg.riskKind} aria-label={t("stream.editType")}>
                  {["risk", "issue"].map((k) => <option key={k} value={k}>{t(k === "issue" ? "risks.kind.issue" : "risks.kind.risk")}</option>)}
                </select>
                <input name="likelihood" type="number" min={1} max={5} defaultValue={sg.likelihood} aria-label={t("risks.likelihood")} required />
                <input name="severity" type="number" min={1} max={5} defaultValue={sg.severity} aria-label={t("risks.severityShort")} required />
              </>
            )}
            <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-primary">{t("stream.apply")}</button>
          </form>
        </details>
        <form action={dismissSuggestionForm}>
          <input type="hidden" name="id" value={sg.id} />
          <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-secondary">{t("stream.dismiss")}</button>
        </form>
      </div>
    </div>
  );
  const actBubble = (a: AgentProposal) => (
    <div className="bubble">
      <p className="agent-tag">{t("stream.agent")} · {t(`stream.agent.${a.kind}`)}</p>
      <p className="agent-title">{a.title}</p>
      {a.details && <p className="agent-details">{a.details}</p>}
      {a.kind !== "add_dependency" && a.before && <p className="agent-details">{t("stream.before")}: {a.before.startDate ?? "–"} → {a.before.dueDate ?? "–"}</p>}
      {a.kind !== "add_dependency" && <p className="agent-details">{a.before ? `${t("stream.after")}: ` : ""}{a.startDate ?? "–"} → {a.dueDate ?? "–"}</p>}
      <Impact a={a} label={t("stream.impact")} before={t("stream.before")} after={t("stream.after")} done={!!a.accepted} />
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
  );
  return (
    <main id="main" className="page msgs chat">
      {!readOnly && <MarkRead projectId={project.id} />}
      <header className="chat-head">
        <h1 className="sr-only">{project.name} · {t("stream.title")}</h1>
        <div className="chat-title"><h2>{t("stream.conversation")}</h2><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></div>
        <SearchBar action={base} projectId={project.id} source={query.source} q={query.q} label={t("stream.c.search")} />
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
                  <article className={`mail msg${m.fromAddress === AGENT_ADDRESS ? " msg-agent" : ""}`} data-src={m.source} data-mine={me && m.source === "app" && m.fromAddress === me ? "" : undefined} id={`msg-${m.id}`}>
                    <span className="avatar" aria-hidden="true">{m.fromAddress === AGENT_ADDRESS ? <Robot /> : who(m).charAt(0).toUpperCase()}</span>
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
                      <div className="reacts">
                        {(reactions?.get(m.id) ?? []).map((r) => (
                          <form key={r.emoji} action={toggleReaction}>
                            <input type="hidden" name="messageId" value={m.id} />
                            <input type="hidden" name="emoji" value={r.emoji} />
                            <button type="submit" disabled={readOnly} className="react" aria-pressed={r.mine} title={r.agent ? t("stream.reactedByAgent") : undefined}>{r.emoji} {r.count}{r.agent && <Robot />}</button>
                          </form>
                        ))}
                      </div>
                      <div className="mail-acts" role="group" aria-label={t("stream.actions")}>
                        <ReplyButton disabled={readOnly} label={t("stream.c.reply")} target={{ id: m.id, who: who(m), subject: m.subject, excerpt: m.bodyText.slice(0, 80) }} />
<details className="link-pop">
                          <summary className="act" data-ico="react" data-tip={t("stream.react")} aria-label={t("stream.react")}>☺</summary>
                          <div className="react-pick">{REACTION_EMOJIS.map((e) => (
                            <form key={e} action={toggleReaction}>
                              <input type="hidden" name="messageId" value={m.id} />
                              <input type="hidden" name="emoji" value={e} />
                              <button type="submit" disabled={readOnly} className="react">{e}</button>
                            </form>
                          ))}</div>
                        </details>
<details className="mail-create">
                          <summary className="act" data-ico="create" data-tip={t("stream.createItem")} aria-label={t("stream.createItem")} />
                          <div>{(["task", "decision", "risk"] as const).map((k) => <a key={k} href={`/app/items?project=${project.id}&create=${k}&from=${m.id}`}>{t(`kind.${k}`)}</a>)}</div>
                        </details>
                        {canPin && (
                          <form action={togglePin}>
                            <input type="hidden" name="projectId" value={project.id} />
                            <input type="hidden" name="messageId" value={m.id} />
                            {pinned.has(m.id) && <input type="hidden" name="pinned" value="1" />}
                            <button type="submit" data-act="pin" disabled={readOnly} className="act" data-ico="pin" data-tip={pinned.has(m.id) ? t("stream.unpin") : t("stream.pin")} aria-label={pinned.has(m.id) ? t("stream.unpin") : t("stream.pin")} />
                          </form>
                        )}
                        {open && open.length > 0 && (
                          <details className="link-pop">
                            <summary className="act" data-ico="link" data-tip={t("stream.linkTask")} aria-label={t("stream.linkTask")} />
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
                        <a key={l.id} className="linked" href={l.kind === "risk" ? `/app/risks/${l.id}?project=${project.id}` : `/app/items?project=${project.id}`}>{t(l.riskKind ? (`risks.kind.${l.riskKind}` as "risks.kind.risk") : `stream.linked.${l.kind}`)}: {l.title}</a>
                      ))}
                    </div>
                  </article>
                  {waiting.has(m.id) && (
                    <div className="mail msg msg-agent msg-pending" data-src="app" role="status">
                      <span className="avatar" aria-hidden="true"><Robot /></span>
                      <div className="msg-body"><p className="who"><b>{t("stream.agent.name")}</b><span className="pill">{t("stream.source.app")}</span></p><div className="bubble"><p className="body">{t("stream.agentWriting")}…</p></div></div>
                    </div>
                  )}
                  {(() => {
                    const sugs = proposed.get(m.id) ?? [];
                    const acts = actions.filter((a) => host.get(a.messageId) === m.id);
                    const pend = acts.filter((a) => !a.accepted);
                    const slides = [...sugs.map((sg) => sugBubble(sg, m)), ...pend.map(actBubble)];
                    const solo = slides.length < 2; // one suggestion keeps the plain card
          const rest = solo ? acts : acts.filter((a) => a.accepted);
                    return (
                      <>
                        {!solo && (
                          <section className="mail msg msg-agent agent-card" aria-label={t("stream.agent")}>
                            <span className="avatar" aria-hidden="true"><Robot /></span>
                            <div className="msg-body">
                              <AgentWho t={t} time={time} at={m.receivedAt} />
                              <SuggestionCarousel prev={t("stream.prev")} next={t("stream.next")}>{slides}</SuggestionCarousel>
                            </div>
                          </section>
                        )}
                        {solo && sugs.map((sg) => (
                          <section key={sg.id} className="mail msg msg-agent agent-card" aria-label={t("stream.agent")}>
                            <span className="avatar" aria-hidden="true"><Robot /></span>
                            <div className="msg-body"><AgentWho t={t} time={time} at={m.receivedAt} />{sugBubble(sg, m)}</div>
                          </section>
                        ))}
                        {rest.map((a) => (
                          <section key={a.id} className="mail msg msg-agent agent-card" aria-label={t("stream.agent")}>
                            <span className="avatar" aria-hidden="true"><Robot /></span>
                            <div className="msg-body"><AgentWho t={t} time={time} at={src(a).receivedAt} />{actBubble(a)}</div>
                          </section>
                        ))}
                      </>
                    );
                  })()}
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
              <Composer disabled={!!readOnly} mentions={mentionItems} labels={{ mention: { empty: t("stream.mention.empty"), types: { person: t("stream.mention.person"), agent: t("stream.mention.agent"), task: t("stream.mention.task"), risk: t("stream.mention.risk"), issue: t("stream.mention.issue"), decision: t("stream.mention.decision"), file: t("stream.mention.file") } }, placeholder: t("stream.composer"), bold: t("stream.fmt.bold"), italic: t("stream.fmt.italic"), underline: t("stream.fmt.underline"), list: t("stream.fmt.list"), color: t("stream.fmt.color"), colors: [t("stream.fmt.red"), t("stream.fmt.orange"), t("stream.fmt.green"), t("stream.fmt.blue"), t("stream.fmt.purple")], plain: t("stream.fmt.plain") }} />
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
