"use client";

import { useState } from "react";
import { buildTimeline, formatSize, relativeDay, type TimelineMessage } from "@/domain/timeline";
import { intlLocale, t } from "@/lib/messages";

// Bodies longer than this start folded, with a button to show the rest.
const LONG_BODY = 280;

type Props = { messages: TimelineMessage[]; now: string; timeZone: string };

export function Timeline({ messages, now, timeZone }: Props) {
  const [query, setQuery] = useState("");
  const [on, setOn] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const locale = intlLocale.en;
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

      {messages.length === 0 && <p className="empty">{t("timeline.empty")}</p>}
      {messages.length > 0 && shown === 0 && <p className="empty">{t("timeline.noResults")}</p>}

      {days.map((d) => (
        <section key={d.day} className="timeline-day" aria-label={dayLabel(d.day)}>
          <h2>{dayLabel(d.day)}</h2>
          {d.messages.map((m) => {
            const long = m.bodyText.length > LONG_BODY;
            const expanded = Boolean(open[m.id]);
            return (
              <article key={m.id} className="message">
                <header>
                  <span className="chip">{t(`source.${m.source}`)}</span>
                  <strong>{m.fromName ?? m.fromAddress}</strong>
                  {m.fromName && <span className="meta">{m.fromAddress}</span>}
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
              </article>
            );
          })}
        </section>
      ))}
    </>
  );
}
