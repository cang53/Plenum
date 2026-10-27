import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { intlLocale, messages, type MessageKey } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";
import { checkSwitches } from "@/server/switches";
import { integrationRows } from "@/domain/integrations";
import { exportTables } from "@/domain/export";
import { ConfirmDialog } from "../ConfirmDialog";
import { projectAddress } from "@/domain/onboarding";
import { createFromTemplate, deleteProject, removePerson, saveProfile, saveProject, saveRewardSwitches, saveTeamsChannel } from "./actions";

type Search = { project?: string; saved?: string; removed?: string; error?: string };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const locale = await getLocale();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("display_name, locale").eq("id", user?.id ?? "").single();
  const { data: role } = await supabase.rpc("project_role_of", { p: project.id });
  const { data: ws } = await supabase.from("projects").select("workspace_id").eq("id", project.id).single();
  const { data: isAdmin } = await supabase.rpc("is_workspace_admin", { ws: ws?.workspace_id });
  const { data: teams } = await supabase.from("projects").select("teams_channel_id").eq("id", project.id).single();
  const canManage = role === "project_manager";
  const { data: people } = isAdmin
    ? await supabase.from("workspace_members").select("user_id, profiles(display_name, email)")
        .eq("workspace_id", ws?.workspace_id ?? "").neq("user_id", user?.id ?? "")
        .returns<{ user_id: string; profiles: { display_name: string; email: string } | null }[]>()
    : { data: null };
  const { data: switches } = isAdmin
    ? await supabase.from("reward_switches").select("site").eq("workspace_id", ws?.workspace_id ?? "")
    : { data: null };
  const latest = async (table: "messages" | "suggestions", col: string) =>
    (await supabase.from(table).select(col).eq("project_id", project.id).order(col, { ascending: false }).limit(1).maybeSingle<Record<string, string>>()).data?.[col] ?? null;
  const integrations = isAdmin ? integrationRows(checkSwitches(), { email: await latest("messages", "received_at"), triage: await latest("suggestions", "created_at") }) : [];
  const offSites = (switches ?? []).map((r) => r.site);
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("settings.title")}</h1>
      <p className="intro">{t("settings.intro")}</p>
      {error && <p role="alert" className="badge badge-danger">{error}</p>}
      {sp.removed && <p role="status" className="badge badge-success">{t("settings.removed")}</p>}
      {sp.saved && <p role="status" className="badge badge-success">{t("settings.saved")}</p>}
      <form action={saveProfile} className="surface form-card">
        <h2>{t("settings.you")}</h2>
        <input type="hidden" name="projectId" value={project.id} />
        <p><label><span className="field-label">{t("settings.displayName")}</span><input className="field" name="displayName" defaultValue={me?.display_name ?? ""} required /></label></p>
        <p>
          <label><span className="field-label">{t("settings.language")}</span>
            <select className="field" name="locale" defaultValue={locale}>
              {Object.keys(messages).map((l) => (
                <option key={l} value={l}>{t(`settings.language.${l}` as MessageKey)}</option>
              ))}
            </select>
          </label>
        </p>
        <button type="submit" className="btn btn-primary">{t("settings.save")}</button>
      </form>
      <form action={saveProject} className="surface form-card">
        <h2>{t("settings.project")}</h2>
        <input type="hidden" name="projectId" value={project.id} />
        {!canManage && <p>{t("settings.managerOnly")}</p>}
        <fieldset disabled={!canManage}>
          <p><label><span className="field-label">{t("settings.projectName")}</span><input className="field" name="name" defaultValue={project.name} required /></label></p>
          <p>
            <label><span className="field-label">{t("settings.slug")}</span><input className="field" name="slug" defaultValue={project.email_slug} required /></label>
            <small className="meta">{t("settings.slugHelp")}</small>
          </p>
          <p><span className="field-label">{t("settings.address")}</span> <code>{projectAddress(project.email_slug, process.env.INBOUND_EMAIL_DOMAIN)}</code></p>
          <button type="submit" className="btn btn-primary">{t("settings.save")}</button>
        </fieldset>
      </form>
      <form action={saveTeamsChannel} className="surface form-card">
        <h2>{t("settings.teams")}</h2>
        <input type="hidden" name="projectId" value={project.id} />
        <fieldset disabled={!canManage}>
          <p><label><span className="field-label">{t("settings.teams")}</span><input className="field" name="link" type="url" /></label>
            <small className="meta">{t("settings.teamsHelp")}</small></p>
          <p role="status">{t(teams?.teams_channel_id ? "settings.teamsLinked" : "settings.teamsNone")}</p>
          <button type="submit" className="btn btn-primary">{t("settings.save")}</button>
        </fieldset>
      </form>
      {canManage && (
        <form action={createFromTemplate} className="surface form-card">
          <h2>{t("settings.template")}</h2>
          <input type="hidden" name="projectId" value={project.id} />
          <p><label><span className="field-label">{t("settings.templateName")}</span><input className="field" name="newName" required /></label>
            <small className="meta">{t("settings.templateHelp")}</small></p>
          <button type="submit" className="btn btn-secondary">{t("settings.templateButton")}</button>
        </form>
      )}
      {isAdmin && (
        <section>
          <h2>{t("export.title")}</h2>
          <p>{t("export.intro")}</p>
          <p><a className="btn btn-secondary" href={`/app/export?workspace=${ws?.workspace_id}`} download>{t("export.json")}</a></p>
          <ul>
            {exportTables.map((k) => (
              <li key={k}><a href={`/app/export?workspace=${ws?.workspace_id}&table=${k}`} download>{k}.csv</a></li>
            ))}
          </ul>
          <h2>{t("integrations.title")}</h2>
          <p>{t("integrations.intro")}</p>
          <div className="surface data-table">
            <table>
              <caption className="sr-only">{t("integrations.title")}</caption>
              <thead><tr><th scope="col">{t("integrations.name")}</th><th scope="col">{t("integrations.reads")}</th><th scope="col">{t("integrations.state")}</th><th scope="col">{t("integrations.last")}</th></tr></thead>
              <tbody>
                {integrations.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td><td>{t(r.reads)}</td><td>{t(r.live ? "integrations.on" : "integrations.off")}</td>
                    <td>{r.lastRead ? new Date(r.lastRead).toLocaleString(intlLocale[locale]) : t("integrations.never")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p><a href={`/app/audit?project=${project.id}`}>{t("audit.title")}</a></p>
          <form action={saveRewardSwitches} className="surface form-card">
            <h2>{t("rewards.title")}</h2>
            <input type="hidden" name="projectId" value={project.id} />
            <p>{t("rewards.intro")}</p>
            <p><label><input type="checkbox" name="everywhere" value="yes" defaultChecked={offSites.includes("")} /> {t("rewards.everywhere")}</label></p>
            <p><label><span className="field-label">{t("rewards.sites")}</span>
              <textarea className="field" name="sites" rows={3} defaultValue={offSites.filter(Boolean).join("\n")} /></label>
              <small className="meta">{t("rewards.help")}</small></p>
            <button type="submit" className="btn btn-primary">{t("settings.save")}</button>
          </form>
          <h2>{t("settings.danger")}</h2>
          <div className="surface form-card danger-zone">
            <ConfirmDialog trigger={t("settings.deleteProjectButton")} title={t("settings.deleteProjectButton")} body={t("settings.deleteProjectHelp")} cancel={t("link.cancel")}>
              <form action={deleteProject}>
                <input type="hidden" name="projectId" value={project.id} />
                <p><label><span className="field-label">{t("settings.deleteProject")}</span><input className="field" name="confirm" autoComplete="off" required /></label></p>
                <button type="submit" className="btn btn-danger">{t("settings.deleteProjectButton")}</button>
              </form>
            </ConfirmDialog>
            <ConfirmDialog trigger={t("settings.removePersonButton")} title={t("settings.removePersonButton")} cancel={t("link.cancel")}>
              <form action={removePerson}>
                <input type="hidden" name="projectId" value={project.id} />
                <p><label><span className="field-label">{t("settings.removePerson")}</span>
                  <select className="field" name="person" required>
                    <option value="">{t("settings.choosePerson")}</option>
                    {(people ?? []).map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name} ({m.profiles?.email})</option>
                    ))}
                  </select>
                </label></p>
                <p><label><input type="checkbox" name="confirm" value="yes" required /> {t("settings.removePersonConfirm")}</label></p>
                <button type="submit" className="btn btn-danger">{t("settings.removePersonButton")}</button>
              </form>
            </ConfirmDialog>
          </div>
        </section>
      )}
    </main>
  );
}
