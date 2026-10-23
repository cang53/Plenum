import { cookies } from "next/headers";
import { supabaseServer } from "@/auth/supabase";
import { listLinkedItems, listPins, listTimelineMessages } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { SOURCE_BADGE } from "@/domain/channel";
import { buildStream, newSince } from "@/domain/stream";
import { MarkRead } from "./MarkRead";
import { createTaskFromMessage, linkMessageToTask, togglePin } from "./actions";
import { MoreLink } from "@/app/app/MoreLink";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

export const dynamic = "force-dynamic";

// A body longer than this folds behind its first lines.
const LONG_BODY = 280;

export default async function StreamPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; view?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen, after, view } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tz = demoProject.timeZone;
  const { rows, next } = await listTimelineMessages(supabase, project.id, after);
  const days = buildStream(rows, new Date().toISOString(), tz);
  const fresh = newSince(rows, (await cookies()).get(`stream-read-${project.id}`)?.value);
  const linked = await listLinkedItems(supabase, project.id, rows.map((m) => m.id));
  const { data: open } = await supabase.from("tasks").select("id, title").eq("project_id", project.id).is("source_message_id", null).neq("status", "done").order("title").limit(50);
  const pins = await listPins(supabase, project.id);
  const pinned = new Set(pins.map((p) => p.messageId));
  const { data: canPin } = await supabase.rpc("can_manage_project", { p: project.id });
  const decisions = view === "decisions";
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  return (
    <main id="main" className="page stream">
      <header className="stream-head">
        <h1>{t("stream.title")}</h1>
        <span className="sub">{project.name}</span>
      </header>
      <MarkRead projectId={project.id} />
      <nav className="tabs" aria-label={t("stream.views")}>
        <a href={`/app/stream?project=${project.id}`} aria-current={decisions ? undefined : "page"}>{t("stream.tab.all")}</a>
        <a href={`/app/stream?project=${project.id}&view=decisions`} aria-current={decisions ? "page" : undefined}>{t("stream.tab.decisions")} · {pins.length}</a>
      </nav>
      {(decisions || pins.length > 0) && (
        <section className="pins" aria-labelledby="pins-h">
          <h2 id="pins-h">{t("stream.pinned")}</h2>
          {pins.length === 0 && <p className="sm">{t("stream.noPins")}</p>}
          {pins.map((p) => (
            <article key={p.messageId} className="pin">
              <p className="subject">{p.message.subject || t("timeline.noSubject")}</p>
              {decisions && <p className="text">{p.message.bodyText}</p>}
              <p className="sm">
                {p.message.fromName || p.message.fromAddress} · {t("stream.pinnedBy").replace("{name}", p.pinnedBy).replace("{date}", date.format(new Date(p.pinnedAt)))}
                {canPin && (
                  <form action={togglePin}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="messageId" value={p.messageId} />
                    <input type="hidden" name="pinned" value="1" />
                    <button type="submit" className="btn btn-plain">{t("stream.unpin")}</button>
                  </form>
                )}
              </p>
            </article>
          ))}
        </section>
      )}
      {!decisions && days.length === 0 && <p>{t("timeline.empty")}</p>}
      {!decisions && days.map((d) => (
        <section key={d.day} aria-labelledby={`day-${d.day}`}>
          <h2 id={`day-${d.day}`} className="dayrule">
            {d.relative ? t(`timeline.${d.relative}`) : date.format(new Date(`${d.day}T12:00:00Z`))}
          </h2>
          {d.groups.map((g) =>
            g.messages.map((m, i) => (
              <div key={m.id}>
              {fresh?.id === m.id && <p className="newline" role="separator"><span>{t("stream.new")} · {fresh.count}</span></p>}
              <article className="stream-row">
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
                  {linked.filter((l) => l.messageId === m.id).map((l) => (
                    <a key={l.id} className="sm linked" href={`/app/items?project=${project.id}`}>{t(`stream.linked.${l.kind}`)}: {l.title}</a>
                  ))}
                </div>
                <div className="tools" role="group" aria-label={t("stream.actions")}>
                  {canPin && (
                    <form action={togglePin}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="messageId" value={m.id} />
                      {pinned.has(m.id) && <input type="hidden" name="pinned" value="1" />}
                      <button type="submit" className="btn btn-plain">{pinned.has(m.id) ? t("stream.unpin") : t("stream.pin")}</button>
                    </form>
                  )}
                  <form action={createTaskFromMessage}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="messageId" value={m.id} />
                    <input type="hidden" name="title" value={m.subject || t("timeline.noSubject")} />
                    <button type="submit" className="btn btn-plain">{t("stream.createTask")}</button>
                  </form>
                  {open && open.length > 0 && (
                    <details className="link-pop">
                      <summary className="btn btn-plain">{t("stream.linkTask")}</summary>
                      <form action={linkMessageToTask}>
                        <input type="hidden" name="messageId" value={m.id} />
                        <select name="taskId" aria-label={t("stream.pickTask")} required>
                          {open.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                        </select>
                        <button type="submit" className="btn btn-secondary">{t("stream.link")}</button>
                      </form>
                    </details>
                  )}
                </div>
              </article>
              </div>
            )),
          )}
        </section>
      ))}
      {!decisions && <MoreLink path="/app/stream" params={{ project: project.id }} next={next} label={t("paging.more")} />}
      <p className="comp">
        <span>{t("stream.composer")}</span>
        <em>{t("stream.projectOnly")}</em>
      </p>
    </main>
  );
}
