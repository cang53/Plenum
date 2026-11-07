import type { MessageKey } from "@/lib/messages";

type Tone = "ok" | "warn" | "bad" | "todo" | "info";
const CHIP: Record<Tone, string> = { ok: "c-green", warn: "c-amber", bad: "c-red", todo: "c-neutral", info: "c-blue" };
type Card = { id: string; title: string; href: string; chip: string; tone: Tone; meta: string };
export type OverviewData = {
  projectName: string;
  dateLabel: string;
  headline: string;
  timelineHref: string;
  reviewHref: string;
  newTaskHref: string;
  membersHref: string;
  health: { label: string; tone: Tone; note: string; author: string; dateLabel: string } | null;
  attention: Card[];
  suggestion: { title: string; reason: string; details: string; href: string } | null;
  waiting: number;
  percent: number;
  counts: { done: number; in_progress: number; blocked: number; todo: number };
  overdue: number;
  nextMilestone: { title: string; days: number } | null;
  risks: { open: number; high: number };
  phases: { name: string; label: string; tone: Tone; percent: number; finish: string | null }[];
  week: { key: string; label: string; count: number; tasks: { id: string; title: string; href: string; chip: string; tone: Tone; date: string; initials: string }[] }[];
  calendar: { title: string; prevHref: string; nextHref: string; days: string[]; cells: { n: number | null; today?: boolean; milestone?: boolean; task?: boolean }[] };
  crew: { role: string; people: { initials: string; name: string }[]; pending: { initials: string; email: string }[] }[];
  crewTotal: number;
  canInvite: boolean;
  events: { text: string; dateLabel: string }[];
};

const Icon = ({ d, size = 14 }: { d: string; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const Head = ({ id, title, sub, action }: { id: string; title: string; sub?: string; action?: React.ReactNode }) => (
  <div className="ov-head"><div><h2 id={id} className="h2">{title}</h2>{sub && <p className="subline">{sub}</p>}</div>{action}</div>
);

// The Overview frame from the canvas: headline and metrics, then phases and the week on the left, calendar, decisions and team on the right.
// Pure markup from aggregate numbers; the live page and /demo/overview both feed it.
export function OverviewView({ t, data, write }: { t: (key: MessageKey) => string; data: OverviewData; write?: React.ReactNode }) {
  const fill = (key: MessageKey, v: Record<string, string | number>) => Object.entries(v).reduce((s, [k, x]) => s.replace(`{${k}}`, String(x)), t(key));
  const chip = (tone: Tone, text: string) => <span className={`chip ${CHIP[tone]}`}>{text}</span>;
  const total = data.counts.done + data.counts.in_progress + data.counts.blocked + data.counts.todo;
  const metrics: { icon: string; value: string; label: string }[] = [
    { icon: "M5 12l5 5 9-10", value: `${data.percent}%`, label: t("overview.m.done") },
    data.nextMilestone
      ? { icon: "M12 3v9l5 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", value: String(data.nextMilestone.days), label: fill("overview.m.days", { n: data.nextMilestone.days, title: data.nextMilestone.title }).replace(/^\d+ /, "") }
      : { icon: "M12 3v9l5 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", value: "–", label: t("overview.m.daysNone") },
    { icon: "M5 4h14v16l-7-4-7 4z", value: String(data.waiting), label: t("overview.m.waiting") },
    { icon: "M12 4l9 16H3zM12 10v4", value: String(data.risks.open), label: fill("overview.m.risks", { n: data.risks.high }) },
  ];
  return (
    <div className="ov">
      <div className="ov-head ov-top">
        <div>
          <h1 className="h1">{data.headline}</h1>
          <p className="subline">{t("overview.subtitle").replace("{project}", data.projectName).replace("{date}", data.dateLabel)}</p>
        </div>
        <div className="ov-actions">
          {write}
          <a className="btn btn-primary" href={data.newTaskHref}><Icon d="M12 5v14M5 12h14" />{t("shell.newTask")}</a>
        </div>
      </div>
      {data.health && (
        <section className="ov-health cell" aria-labelledby="ov-health">
          <h2 id="ov-health" className="sr-only">{t("overview.healthTitle")}</h2>
          {chip(data.health.tone, data.health.label)}
          <p>{data.health.note}</p>
          <span className="muted">{data.health.author} · {data.health.dateLabel}</span>
        </section>
      )}
      {data.crew.length > 0 && (
        <section className="panel ov-crew" aria-labelledby="ov-crew">
          <Head id="ov-crew" title={t("overview.crew.title")} sub={fill("overview.crew.sub", { n: data.crewTotal })} action={<span className="ov-crew-actions"><a className="btn btn-soft btn-sm" href={data.membersHref}>{t("overview.team.all")}</a>{data.canInvite && <a className="btn btn-sm btn-primary" href={data.membersHref}>{t("overview.team.invite")}</a>}</span>} />
          <div className="ov-crew-scroll">
            <div className="ov-crew-grid">
              {data.crew.map((c, i) => (
                <article key={c.role} className={`ov-crew-card org-${i % 4}`} aria-label={c.role}>
                  <h3 className="ov-crew-role">{c.role}</h3>
                  <ul className="ov-crew-people">
                    {c.people.map((m) => (
                      <li key={m.name}><span className="ov-tile" role="img" aria-label={`${m.name}, ${c.role}`}>{m.initials}<i /></span><span className="ov-who">{m.name}</span></li>
                    ))}
                    {c.pending.map((m) => (
                      <li key={m.email}><span className="ov-tile pending" role="img" aria-label={fill("overview.crew.pending", { name: m.email })}>{m.initials}</span><span className="ov-who">{m.email}<span className="subline">{t("overview.crew.pendingLabel")}</span></span></li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
      <section aria-label={t("overview.healthTitle")}>
        <div className="metrics">
          {metrics.map((m) => (
            <div key={m.label} className="metric"><span className="ov-metric"><span className="icon-chip"><Icon d={m.icon} /></span><b>{m.value}</b></span><span className="muted">{m.label}</span></div>
          ))}
        </div>
        <p className="subline">{fill("overview.basis", { done: data.counts.done, total })}{data.overdue > 0 && ` · ${fill("overview.overdueCount", { n: data.overdue })}`}</p>
      </section>
      <div className="ov-cols">
        <div className="ov-main">
          {data.phases.length > 0 && (
            <section className="panel" aria-labelledby="ov-phases">
              <Head id="ov-phases" title={t("overview.phases")} sub={t("overview.phases.sub")} action={<a className="btn btn-soft" href={data.timelineHref}>{t("overview.openPlan")}</a>} />
              <div className="tablewrap">
                <table className="num">
                  <thead><tr><th scope="col">{t("overview.col.phase")}</th><th scope="col">{t("timesheets.col.status")}</th><th scope="col">{t("overview.col.progress")}</th><th scope="col">{t("overview.col.finish")}</th></tr></thead>
                  <tbody>
                    {data.phases.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td>{chip(p.tone, p.label)}</td>
                        <td><span className="ov-prog"><span className="bar"><i style={{ width: `${p.percent}%` }} /></span><span className="muted">{p.percent}%</span></span></td>
                        <td>{p.finish ?? <span className="muted">–</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section aria-labelledby="ov-week">
            <Head id="ov-week" title={t("overview.week.title")} sub={t("overview.week.sub")} />
            <div className="ov-stages">
              {data.week.map((c) => (
                <div key={c.key} className="ov-stage">
                  <div className="ov-colhead">{c.label} <span className="ov-count">{c.count}</span></div>
                  {c.tasks.map((k) => (
                    <article key={k.id} className="panel ov-task">
                      <a href={k.href}>{k.title}</a>
                      <span>{chip(k.tone, k.chip)}</span>
                      <span className="muted num ov-foot"><span>{k.date}</span><span className="av" aria-hidden="true">{k.initials}</span></span>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>
          {data.events.length > 0 && (
            <section className="panel" aria-labelledby="ov-events">
              <Head id="ov-events" title={t("overview.recent")} />
              <ul className="ov-list">
                {data.events.map((e, i) => <li key={i}><span>{e.text}</span><span className="muted num">{e.dateLabel}</span></li>)}
              </ul>
            </section>
          )}
        </div>
        <aside className="ov-side">
          <section aria-labelledby="ov-cal">
            <Head id="ov-cal" title={t("overview.cal.title")} sub={t("overview.cal.sub")} />
            <div className="panel">
              <div className="ov-head">
                <span>{data.calendar.title}</span>
                <span className="ov-arrows"><a className="btn btn-white btn-sm" href={data.calendar.prevHref} aria-label={t("overview.cal.prev")}><Icon d="M15 6l-6 6 6 6" /></a><a className="btn btn-white btn-sm" href={data.calendar.nextHref} aria-label={t("overview.cal.next")}><Icon d="M9 6l6 6-6 6" /></a></span>
              </div>
              <div className="ov-cal num">
                {data.calendar.days.map((d) => <span key={d} className="dow">{d}</span>)}
                {data.calendar.cells.map((c, i) => (
                  <span key={i} className={c.n === null ? "empty" : c.today ? "today" : undefined}>
                    {c.n}{(c.milestone || c.task) && <i className={c.milestone ? "ms" : "tk"} />}
                    {c.milestone && <span className="sr-only">{t("overview.cal.milestone")}</span>}
                    {c.task && !c.milestone && <span className="sr-only">{t("overview.cal.task")}</span>}
                  </span>
                ))}
              </div>
              <div className="muted ov-legend"><span><i className="ms" />{t("overview.cal.milestone")}</span><span><i className="tk" />{t("overview.cal.task")}</span></div>
            </div>
          </section>
          <section aria-labelledby="ov-wait">
            <Head id="ov-wait" title={t("overview.wait.title")} sub={fill("overview.wait.sub", { n: data.waiting + data.attention.length })} action={<a className="btn btn-soft" href={data.reviewHref}>{t("overview.wait.viewAll")}</a>} />
            {data.suggestion && (
              <article className="panel ov-ai" aria-labelledby="ov-ai">
                <div className="ov-head">
                  <div><h3 id="ov-ai" className="h3">{data.suggestion.title}</h3><p className="subline">{data.suggestion.details}</p></div>
                  {chip("info", t("overview.aiLabel"))}
                </div>
                <blockquote className="ov-quote"><p>{data.suggestion.reason}</p><a href={data.suggestion.href}>{t("overview.source")}</a></blockquote>
                <a className="btn btn-primary ov-full" href={data.reviewHref}>{t("overview.reviewSuggestion")}</a>
                <p className="subline">{t("overview.policy")}</p>
              </article>
            )}
            {data.attention.length > 0 && (
              <ul className="panel ov-list" aria-label={t("overview.attention")}>
                {data.attention.map((a) => (
                  <li key={a.id}><span><a href={a.href}>{a.title}</a><span className="subline">{a.meta}</span></span>{chip(a.tone, a.chip)}</li>
                ))}
              </ul>
            )}
            {!data.suggestion && data.attention.length === 0 && <p className="panel muted">{t("overview.wait.none")}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
