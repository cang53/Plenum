"use client";

import { useState } from "react";
import { draftFromMessage, isValidDraft, ITEM_KINDS, linkedTo, type ItemDraft, type ItemKind, type LinkedItem } from "@/domain/linking";
import { toDraft, type StoredSuggestion } from "@/domain/triage";
import { buildTimeline, formatSize, relativeDay, type TimelineMessage } from "@/domain/timeline";
import { logError } from "@/lib/log";
import { intlLocale, t as translate, type Locale, type MessageKey } from "@/lib/messages";

// Bodies longer than this start folded, with a button to show the rest.
const LONG_BODY = 280;

const STATE_BADGE = { suggested: "badge-warning", linked: "badge-success", new: "" } as const;

type Props = {
  messages: TimelineMessage[];
  suggestions: StoredSuggestion[];
  now: string;
  timeZone: string;
  // Items already made from these messages. Live pages pass these.
  linked?: LinkedItem[];
  // Live pages save the decision; the demo leaves these out and keeps changes in the page.
  onAccept?: (suggestionId: string, draft: ItemDraft) => Promise<void>;
  onDismiss?: (suggestionId: string) => Promise<void>;
  // The signed-in person's language; the demo stays English.
  language?: Locale;
  // Live pages send the reply by email; without it the reply button is not shown.
  onReply?: (messageId: string, text: string, confirmWider: boolean) => Promise<"sent" | "wider">;
};

export function Timeline({ messages, suggestions, now, timeZone, linked = [], onAccept, onDismiss, onReply, language = "en" }: Props) {
  const t = (key: MessageKey) => translate(key, language);
  const [query, setQuery] = useState("");
  const [on, setOn] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Items made by hand are kept in the page, not saved (until the manual create screens, S3-7).
  const [items, setItems] = useState<LinkedItem[]>(linked);
  const [drafting, setDrafting] = useState<{ messageId: string; draft: ItemDraft; suggestionId?: string } | null>(null);
  // Which suggestions a person has dealt with.
  const [decided, setDecided] = useState<Record<string, "accepted" | "dismissed">>({});
  const [reply, setReply] = useState<{ messageId: string; text: string; wider: boolean; sent?: boolean; failed?: boolean } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [saveFailed, setSaveFailed] = useState<(() => void) | null>(null);
  const makeItem = (messageId: string, draft: ItemDraft) =>
    setItems((prev) => [...prev, { id: `${draft.kind}-${prev.length}`, kind: draft.kind, title: draft.title.trim(), messageId }]);
  // Saves the decision first (when the page saves), so a failure leaves the suggestion open.
  const decide = async (id: string, outcome: "accepted" | "dismissed", draft?: ItemDraft, messageId?: string): Promise<boolean> => {
    try {
      if (outcome === "accepted" && draft) await onAccept?.(id, draft);
      if (outcome === "dismissed") await onDismiss?.(id);
    } catch (error) {
      logError("suggestion save failed", error);
      setSaveFailed(() => () => void decide(id, outcome, draft, messageId));
      return false;
    }
    setSaveFailed(null);
    if (draft && messageId) makeItem(messageId, draft);
    setDecided((prev) => ({ ...prev, [id]: outcome }));
    return true;
  };

  const sendReply = async (confirmWider: boolean) => {
    if (!reply || !onReply || !reply.text.trim()) return;
    try {
      const result = await onReply(reply.messageId, reply.text, confirmWider);
      setReply(result === "wider" ? { ...reply, wider: true, failed: false } : { ...reply, text: "", wider: false, sent: true, failed: false });
    } catch (error) {
      logError("reply failed", error);
      setReply({ ...reply, failed: true });
    }
  };

  const locale = intlLocale[language];
  const days = buildTimeline(messages, { query, on: on || undefined }, timeZone);
  const shown = days.reduce((sum, d) => sum + d.messages.length, 0);
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit" });
  // Days are calendar dates already in the project's time zone, so they are formatted as UTC.
  const date = new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const dayLabel = (day: string) => {
    const relative = relativeDay(day, now, timeZone);
    return relative ? t(`timeline.${relative}`) : date.format(new Date(`${day}T12:00:00Z`));
  };

  return (
    <>
      <form className="timeline-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          {t("timeline.search")}
          <input type="search" value={query} placeholder={t("timeline.searchPlaceholder")} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {t("timeline.date")}
          <input type="date" value={on} onChange={(e) => setOn(e.target.value)} />
        </label>
        {(query || on) && (
          <button
            type="button"
            className="button"
            onClick={() => {
              setQuery("");
              setOn("");
            }}
          >
            {t("timeline.clear")}
          </button>
        )}
        <p className="meta" aria-live="polite">
          {t("timeline.shown")} {shown}
        </p>
      </form>

      {picked.some((id) => !decided[id]) && (
        <p>
          <button type="button" className="btn btn-secondary" onClick={async () => {
            for (const id of picked) if (!decided[id] && !(await decide(id, "dismissed"))) return;
            setPicked([]);
          }}>
            {t("bulk.dismissSelected")} ({picked.filter((id) => !decided[id]).length})
          </button>
        </p>
      )}
      {saveFailed && (
        <p role="alert">
          {t("triage.saveError")}{" "}
          <button type="button" className="button" onClick={saveFailed}>{t("app.retry")}</button>
        </p>
      )}
      {messages.length === 0 && <p className="empty">{t("timeline.empty")}</p>}
      {messages.length > 0 && shown === 0 && <p className="empty">{t("timeline.noResults")}</p>}

      {days.map((d) => (
        <section key={d.day} className="timeline-day" aria-label={dayLabel(d.day)} data-today={relativeDay(d.day, now, timeZone) === "today"}>
          <h2>{dayLabel(d.day)}</h2>
          {d.messages.map((m) => {
            const long = m.bodyText.length > LONG_BODY;
            const expanded = Boolean(open[m.id]);
            const state = suggestions.some((s) => s.messageId === m.id && s.status === "pending" && !decided[s.id])
              ? "suggested"
              : linkedTo(items, m.id).length > 0 ? "linked" : "new";
            return (
              <article key={m.id} id={`message-${m.id}`} className="message" data-state={state}>
                <header>
                  <span className="chip">{t(`source.${m.source}`)}</span>
                  <strong>{m.fromName ?? m.fromAddress}</strong>
                  {m.fromName && <span className="meta">{m.fromAddress}</span>}
                  <span className={`badge ${STATE_BADGE[state]}`}>{t(`timeline.state.${state}`)}</span>
                  <time dateTime={m.receivedAt}>{time.format(new Date(m.receivedAt))}</time>
                </header>
                <h3>{m.subject || t("timeline.noSubject")}</h3>
                <p className={long && !expanded ? "body folded" : "body"}>{m.bodyText}</p>
                {long && (
                  <button type="button" className="link-button" aria-expanded={expanded} onClick={() => setOpen({ ...open, [m.id]: !expanded })}>
                    {expanded ? t("timeline.showLess") : t("timeline.showMore")}
                  </button>
                )}
                {m.attachments.length > 0 && (
                  <ul className="attachments" aria-label={t("timeline.attachments")}>
                    {m.attachments.map((a) => (
                      <li key={a.id}>
                        {a.filename} <span className="meta">{formatSize(a.sizeBytes, locale)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {linkedTo(items, m.id).length > 0 && (
                  <ul className="attachments" aria-label={t("link.linked")}>
                    {linkedTo(items, m.id).map((item) => (
                      <li key={item.id}>
                        <span className="chip">{t(`kind.${item.kind}`)}</span> {item.title}
                      </li>
                    ))}
                  </ul>
                )}
                {suggestions
                  .filter((s) => s.messageId === m.id && s.status === "pending" && !decided[s.id] && drafting?.suggestionId !== s.id)
                  .map((s) => (
                    <div key={s.id} className="suggestion glass" role="group" aria-label={t("triage.title")}>
                      <p className="meta">
                        <input type="checkbox" checked={picked.includes(s.id)} aria-label={`${t("bulk.selectSuggestion")}: ${s.title}`}
                          onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} />{" "}
                        {t("triage.title")}
                      </p>
                      <p>
                        <span className="chip">{t(`kind.${s.kind}`)}</span> <strong>{s.title}</strong>
                      </p>
                      {s.details && <p className="body">{s.details}</p>}
                      <p className="meta">{t("triage.source")}: <a href={`#message-${m.id}`}>{m.subject || t("timeline.noSubject")}</a></p>
                      <div className="suggestion-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => decide(s.id, "accepted", toDraft(s), m.id)}
                        >
                          {t("triage.accept")}
                        </button>{" "}
                        <button type="button" className="btn btn-secondary" onClick={() => setDrafting({ messageId: m.id, draft: toDraft(s), suggestionId: s.id })}>
                          {t("triage.edit")}
                        </button>{" "}
                        <button type="button" className="btn btn-plain" onClick={() => decide(s.id, "dismissed")}>
                          {t("triage.dismiss")}
                        </button>
                      </div>
                    </div>
                  ))}
                {onReply && m.source === "email" && m.fromAddress && (reply?.messageId === m.id && !reply.sent ? (
                  <form className="reply-form glass" onSubmit={(e) => { e.preventDefault(); void sendReply(false); }}>
                    <label>
                      {t("reply.label")}
                      <textarea rows={3} value={reply.text} onChange={(e) => setReply({ messageId: m.id, text: e.target.value, wider: false })} />
                    </label>
                    <p className="meta">{t("reply.to")}: {m.fromAddress}</p>
                    {reply.wider && <p role="alert">{t("reply.wider")}</p>}
                    {reply.failed && <p role="alert">{t("reply.error")}</p>}
                    <div>
                      {reply.wider ? (
                        <button type="button" className="button" onClick={() => void sendReply(true)}>{t("reply.sendAnyway")}</button>
                      ) : (
                        <button type="submit" className="button" disabled={!reply.text.trim()}>{t("reply.send")}</button>
                      )}{" "}
                      <button type="button" className="button" onClick={() => setReply(null)}>{t("link.cancel")}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {reply?.messageId === m.id && reply.sent && <p className="meta" role="status">{t("reply.sent")}</p>}
                    <button type="button" className="link-button" onClick={() => setReply({ messageId: m.id, text: "", wider: false })}>{t("reply.action")}</button>
                  </>
                ))}
                {drafting?.messageId === m.id ? (
                  <form
                    className="link-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!isValidDraft(drafting.draft)) return;
                      if (drafting.suggestionId) {
                        if (!(await decide(drafting.suggestionId, "accepted", drafting.draft, m.id))) return;
                      } else makeItem(m.id, drafting.draft);
                      setDrafting(null);
                    }}
                  >
                    <label>
                      {t("link.kind")}
                      <select
                        value={drafting.draft.kind}
                        onChange={(e) => setDrafting({ messageId: m.id, draft: { ...draftFromMessage(e.target.value as ItemKind, m) } })}
                      >
                        {ITEM_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {t(`kind.${kind}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t("link.title")}
                      <input value={drafting.draft.title} onChange={(e) => setDrafting({ messageId: m.id, draft: { ...drafting.draft, title: e.target.value } })} />
                    </label>
                    {drafting.draft.kind !== "task" && (
                      <label>
                        {t("link.details")}
                        <textarea
                          rows={3}
                          value={drafting.draft.details}
                          onChange={(e) => setDrafting({ messageId: m.id, draft: { ...drafting.draft, details: e.target.value } })}
                        />
                      </label>
                    )}
                    <p className="meta">{t("link.fromMessage")}: {m.subject || t("timeline.noSubject")}</p>
                    <div>
                      <button type="submit" className="button" disabled={!isValidDraft(drafting.draft)}>
                        {t("link.save")}
                      </button>{" "}
                      <button type="button" className="button" onClick={() => setDrafting(null)}>
                        {t("link.cancel")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button type="button" className="link-button" onClick={() => setDrafting({ messageId: m.id, draft: draftFromMessage("task", m) })}>
                    {t("link.action")}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      ))}
    </>
  );
}
