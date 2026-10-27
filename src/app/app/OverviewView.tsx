import type { MessageKey } from "@/lib/messages";

type Tone = "ok" | "warn" | "bad" | "todo";
export type OverviewData = {
  projectName: string;
  dateLabel: string;
  timelineHref: string;
  reviewHref: string;
  health: { label: string; tone: Tone; note: string; author: string; dateLabel: string } | null;
  attention: { id: string; title: string; href: string; chip: string; tone: Tone; meta: string }[];
  suggestion: { title: string; reason: string; details: string; href: string } | null;
  percent: number;
  counts: { done: number; in_progress: number; blocked: number; todo: number };
  overdue: number;
  upcoming: { id: string; title: string; href: string; day: string; soon: boolean; meta: string }[];
  events: { text: string; dateLabel: string }[];
  address: string | null;
};

// The Overview frame: heading, health and decisions on the left, work and schedule on the right, project email below.
// Pure markup from aggregate numbers; the live page and /demo/overview both feed it.
export function OverviewView({ t, data, write }: { t: (key: MessageKey) => string; data: OverviewData; write?: React.ReactNode }) {
  const chip = (tone: Tone, text: string) => <span className={`st st-${tone}`}>{text}</span>;
  const later = data.upcoming.findIndex((u) => !u.soon);
  return (
    <div className="ov">
      <div className="board-head ov-top">
        <div>
          <h1>{t("overview.title")}</h1>
          <p className="sub">{t("overview.subtitle").replace("{project}", data.projectName).replace("{date}", data.dateLabel)}</p>
        </div>
        <div className="ov-actions">
          <a className="act" href={data.timelineHref}>{t("overview.viewTimeline")} ↗</a>
          {data.suggestion && <a className="act act-primary" href={data.reviewHref}>{t("overview.reviewSuggestions")} ↗</a>}
        </div>
      </div>
      <div className="ov-cols">
        <div className="ov-main">
          <section className="ov-card ov-soft" aria-labelledby="ov-health">
            <div className="ov-row">
              <h2 id="ov-health">{t("overview.healthTitle")}</h2>
              {data.health ? chip(data.health.tone, data.health.label) : chip("todo", t("overview.health.none"))}
            </div>
            {data.health && (
              <>
                <p className="ov-body">{data.health.note}</p>
                <div className="ov-author">
                  <span className="ov-avatar" aria-hidden="true">{data.health.author.charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{data.health.author}</strong>
                    <span>{data.health.dateLabel}</span>
                  </div>
                </div>
              </>
            )}
            {write}
          </section>
          <section className="ov-card" aria-labelledby="ov-attention">
            <h2 id="ov-attention">{t("overview.attention")}</h2>
            {data.attention.length === 0 && <p className="ov-meta">{t("overview.attentionNone")}</p>}
            {data.attention.map((a) => (
              <div key={a.id} className="ov-item">
                <div className="ov-row"><a href={a.href}>{a.title}</a>{chip(a.tone, a.chip)}</div>
                <p className="ov-meta">{a.meta}</p>
              </div>
            ))}
          </section>
          {data.suggestion && (
            <section className="ov-card ov-soft" aria-labelledby="ov-ai">
              <div className="ov-row"><strong className="ov-accent">{t("overview.aiLabel")}</strong>{chip("ok", t("overview.awaiting"))}</div>
              <h2 id="ov-ai">{data.suggestion.title}</h2>
              <p className="ov-meta">{data.suggestion.details}</p>
              <blockquote className="ov-quote">
                <p>{data.suggestion.reason}</p>
                <a href={data.suggestion.href}>{t("overview.source")}</a>
              </blockquote>
              <div><a className="act act-primary" href={data.reviewHref}>{t("overview.reviewSuggestion")} ↗</a></div>
              <p className="ov-meta ov-small">{t("overview.policy")}</p>
            </section>
          )}
        </div>
        <div className="ov-side">
          <section className="ov-card" aria-labelledby="ov-work">
            <h2 id="ov-work">{t("overview.workTitle")}</h2>
            <div className="ov-row"><strong>{t("overview.completion")}</strong><span className="ov-accent">{data.percent}%</span></div>
            <progress value={data.percent} max={100} aria-label={t("overview.completion")} />
            <div className="ov-counts">
              {(["done", "in_progress", "blocked", "todo"] as const).map((s) => (
                <p key={s}>{t(`overview.count.${s}`).replace("{n}", String(data.counts[s]))}</p>
              ))}
            </div>
            {data.overdue > 0 && <p className="ov-late">{t("overview.overdueCount").replace("{n}", String(data.overdue))}</p>}
          </section>
          <section className="ov-card" aria-labelledby="ov-up">
            <h2 id="ov-up">{t("overview.upcoming")}</h2>
            {data.upcoming.length === 0 && <p className="ov-meta">{t("overview.upcomingNone")}</p>}
            {data.upcoming.map((u, i) => (
              <div key={u.id} className="ov-item">
                {i === later && <p className="ov-group">{t("overview.later")}</p>}
                <div className="ov-when">
                  <time className={u.soon ? "ov-day ov-day-soon" : "ov-day"}>{u.day}</time>
                  <div><a href={u.href}>{u.title}</a><p className="ov-meta">{u.meta}</p></div>
                </div>
              </div>
            ))}
            <div><a className="act" href={data.timelineHref}>{t("overview.fullPlan")} ↗</a></div>
          </section>
          {data.events.length > 0 && (
            <section className="ov-card" aria-labelledby="ov-events">
              <h2 id="ov-events">{t("overview.recent")}</h2>
              {data.events.map((e, i) => (
                <div key={i} className="ov-event">
                  <span className="ov-accent" aria-hidden="true">●</span>
                  <div><p>{e.text}</p><p className="ov-meta">{e.dateLabel}</p></div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
      {data.address && (
        <section className="ov-card ov-soft ov-address" aria-labelledby="ov-addr">
          <strong id="ov-addr" className="ov-accent">{t("overview.addressTitle")}</strong>
          <p><code>{data.address}</code></p>
          <p className="ov-meta">{t("overview.addressPolicy")}</p>
        </section>
      )}
    </div>
  );
}
