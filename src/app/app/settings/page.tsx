import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { messages, t, type MessageKey } from "@/lib/messages";
import { exportTables } from "@/domain/export";
import { saveProfile, saveProject } from "./actions";

type Search = { project?: string; saved?: string; error?: string };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
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
  const canManage = role === "project_manager";
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("settings.title")}</h1>
      <p className="intro">{t("settings.intro")}</p>
      {error && <p role="alert">{error}</p>}
      {sp.saved && <p role="status">{t("settings.saved")}</p>}
      <form action={saveProfile}>
        <h2>{t("settings.you")}</h2>
        <input type="hidden" name="projectId" value={project.id} />
        <p><label>{t("settings.displayName")} <input name="displayName" defaultValue={me?.display_name ?? ""} required /></label></p>
        <p>
          <label>{t("settings.language")}{" "}
            <select name="locale" defaultValue={me?.locale ?? "en"}>
              {Object.keys(messages).map((l) => (
                <option key={l} value={l}>{t(`settings.language.${l}` as MessageKey)}</option>
              ))}
            </select>
          </label>
        </p>
        <button type="submit">{t("settings.save")}</button>
      </form>
      <form action={saveProject}>
        <h2>{t("settings.project")}</h2>
        <input type="hidden" name="projectId" value={project.id} />
        {!canManage && <p>{t("settings.managerOnly")}</p>}
        <fieldset disabled={!canManage}>
          <p><label>{t("settings.projectName")} <input name="name" defaultValue={project.name} required /></label></p>
          <p>
            <label>{t("settings.slug")} <input name="slug" defaultValue={project.email_slug} required /></label>
            <br /><small>{t("settings.slugHelp")}</small>
          </p>
          <button type="submit">{t("settings.save")}</button>
        </fieldset>
      </form>
      {isAdmin && (
        <section>
          <h2>{t("export.title")}</h2>
          <p>{t("export.intro")}</p>
          <p><a href={`/app/export?workspace=${ws?.workspace_id}`} download>{t("export.json")}</a></p>
          <ul>
            {exportTables.map((k) => (
              <li key={k}><a href={`/app/export?workspace=${ws?.workspace_id}&table=${k}`} download>{k}.csv</a></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
