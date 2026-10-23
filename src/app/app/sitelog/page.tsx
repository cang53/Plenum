import { supabaseServer } from "@/auth/supabase";
import { getMessageForSiteLog, listSiteLogs } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { messages, type MessageKey } from "@/lib/messages";
import { pickDay, prefillSiteLog, stepDay } from "@/domain/siteLog";
import { submitSiteLog } from "./actions";
import { SiteLogForm } from "./SiteLogForm";

type Search = { project?: string; site?: string; date?: string; saved?: string; error?: string; message?: string; add?: string };

export default async function SiteLogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [logs, { data: role }] = await Promise.all([listSiteLogs(supabase, project.id), supabase.rpc("project_role_of", { p: project.id })]);
  const source = sp.message ? await getMessageForSiteLog(supabase, project.id, sp.message) : null;
  const pre = source ? prefillSiteLog(source) : null;
  const canWrite = role === "member" || role === "project_manager";
  const day = pickDay(logs, sp.site, sp.date, new Date().toISOString().slice(0, 10));
  const log = day.log;
  const href = (o: { site?: string; date?: string }) => `/app/sitelog?${new URLSearchParams({ project: project.id, site: o.site ?? day.site, date: o.date ?? day.date })}`;
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("sitelog.title")}</h1>
      <p className="intro">{t("sitelog.intro")}</p>
      {error && <p role="alert" className="badge badge-danger">{error}</p>}
      {sp.saved && <p role="status" className="badge badge-success">{t("sitelog.saved")}</p>}
      <nav aria-label={t("sitelog.sites")} className="sl-sites">
        {day.sites.map((n) => <a key={n} href={href({ site: n })} aria-current={n === day.site ? "page" : undefined}>{n}</a>)}
      </nav>
      <div className="sl-bar">
        <a className="chip" href={href({ date: stepDay(day.date, -1) })} aria-label={t("sitelog.prevDay")}>◂</a>
        <h2>{day.site ? `${day.site} · ${day.date}` : day.date}</h2>
        <a className="chip" href={href({ date: stepDay(day.date, 1) })} aria-label={t("sitelog.nextDay")}>▸</a>
      </div>
      {log ? (
        <section aria-label={`${log.site} ${log.log_date}`}>
          <div className="sl-sec"><h3>{t("sitelog.weather")}</h3><p>{log.weather || "-"}</p></div>
          <div className="sl-sec"><h3>{t("sitelog.people")}<span className="n">{log.headcount}</span></h3><p className="hint">{t("sitelog.peopleHint")}</p></div>
          <div className="sl-sec"><h3>{t("sitelog.deliveries")}</h3><p className="hint">{t("sitelog.deliveriesHint")}</p></div>
          <div className="sl-sec">
            <h3>{t("sitelog.notes")}</h3>
            {log.work_done && <p>{log.work_done}</p>}
            {log.delays && <p>{t("sitelog.delays")}: {log.delays}</p>}
            {log.source_message_id && <p className="meta"><a href={`/app/timeline?project=${project.id}#message-${log.source_message_id}`}>{t("sitelog.source")}</a></p>}
          </div>
        </section>
      ) : <p className="sl-sec">{t("sitelog.dayEmpty")}</p>}
      {day.days.length > 1 && (
        <p className="sl-sites">{t("sitelog.otherDays")}: {day.days.filter((d) => d !== day.date).slice(0, 14).map((d) => <a key={d} href={href({ date: d })}>{d}</a>)}</p>
      )}
      {canWrite ? (
        <>
        <a className="btn btn-primary sl-add" href={`${href({})}&add=1#sl-form`}>{t("sitelog.add")}</a>
        <SiteLogForm action={submitSiteLog} projectId={project.id} open={!log || !!pre || !!sp.add} labels={{ summary: t("sitelog.edit"), offline: t("sitelog.offline"), waiting: t("sitelog.waiting"), sent: t("sitelog.sent"), invalid: t("sitelog.invalid") }}>
          {pre && <><input type="hidden" name="sourceMessageId" value={sp.message} /><p className="hint">{t("sitelog.fromMessage")}</p></>}
          <p><label><span className="field-label">{t("sitelog.site")}</span><input className="field" name="site" defaultValue={pre?.site ?? day.site} maxLength={100} required /></label></p>
          <p><label><span className="field-label">{t("sitelog.date")}</span><input className="field" type="date" name="date" defaultValue={pre?.date ?? day.date} required /></label></p>
          <p><label><span className="field-label">{t("sitelog.weather")}</span><input className="field" name="weather" maxLength={100} defaultValue={log?.weather} /></label></p>
          <p><label><span className="field-label">{t("sitelog.headcount")}</span><input className="field" type="number" name="headcount" min={0} max={100000} defaultValue={log?.headcount ?? 0} /></label></p>
          <p><label><span className="field-label">{t("sitelog.work")}</span><textarea className="field" name="work" defaultValue={pre?.work ?? log?.work_done} maxLength={4000} rows={3} /></label></p>
          <p><label><span className="field-label">{t("sitelog.delays")}</span><textarea className="field" name="delays" maxLength={4000} rows={2} defaultValue={log?.delays} /></label></p>
          <p className="hint">{t("sitelog.replaceHint")}</p>
          <button type="submit" className="btn btn-primary">{t("sitelog.save")}</button>
        </SiteLogForm>
        </>
      ) : <p>{t("sitelog.readOnly")}</p>}
    </main>
  );
}
