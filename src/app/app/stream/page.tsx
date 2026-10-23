import { supabaseServer } from "@/auth/supabase";
import { listTimelineMessages } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { SOURCE_BADGE } from "@/domain/channel";
import { buildStream } from "@/domain/stream";
import { MoreLink } from "@/app/app/MoreLink";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

export const dynamic = "force-dynamic";

// A body longer than this folds behind its first lines.
const LONG_BODY = 280;

export default async function StreamPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen, after } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tz = demoProject.timeZone;
  const { rows, next } = await listTimelineMessages(supabase, project.id, after);
  const days = buildStream(rows, new Date().toISOString(), tz);
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  return (
    <main id="main" className="page stream">
      <header className="stream-head">
        <h1>{t("stream.title")}</h1>
        <span className="sub">{project.name}</span>
      </header>
      {days.length === 0 && <p>{t("timeline.empty")}</p>}
      {days.map((d) => (
        <section key={d.day} aria-labelledby={`day-${d.day}`}>
          <h2 id={`day-${d.day}`} className="dayrule">
            {d.relative ? t(`timeline.${d.relative}`) : date.format(new Date(`${d.day}T12:00:00Z`))}
          </h2>
          {d.groups.map((g) =>
            g.messages.map((m, i) => (
              <article key={m.id} className="stream-row">
                <time className="t" dateTime={m.receivedAt}>{time.format(new Date(m.receivedAt))}</time>
                <div className="tx">
                  {i === 0 && (
                    <p className="who-line">
                      <span className="who">{m.fromName || m.fromAddress}</span>
                      <span className="src"><b aria-hidden="true">{SOURCE_BADGE[m.source]}</b>{t(`stream.source.${m.source}`)}</span>
                    </p>
                  )}
                  <p className="subject">{m.subject || t("timeline.noSubject")}</p>
                  {m.bodyText.length > LONG_BODY ? (
                    <details><summary>{m.bodyText.slice(0, LONG_BODY)}…</summary>{m.bodyText}</details>
                  ) : (
                    <p className="text">{m.bodyText}</p>
                  )}
                  {m.attachments.length > 0 && <span className="sm">{t("timeline.attachments")}: {m.attachments.map((a) => a.filename).join(", ")}</span>}
                </div>
              </article>
            )),
          )}
        </section>
      ))}
      <MoreLink path="/app/stream" params={{ project: project.id }} next={next} label={t("paging.more")} />
      <p className="comp">
        <span>{t("stream.composer")}</span>
        <em>{t("stream.projectOnly")}</em>
      </p>
    </main>
  );
}
