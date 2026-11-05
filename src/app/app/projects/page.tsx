import { supabaseServer } from "@/auth/supabase";
import { listParents, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { createParent, createProject, moveProject, renameParent } from "./actions";
import { ProjectTree } from "./ProjectTree";

// The Projects crumb in the top bar opens this page: parent projects with their projects below.
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string; parent?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const [projects, parents] = await Promise.all([listProjects(supabase), listParents(supabase)]);
  const { data: ws } = projects[0]
    ? await supabase.from("projects").select("workspace_id").eq("id", projects[0].id).single()
    : { data: null };
  const { data: staff } = ws ? await supabase.rpc("is_workspace_staff", { ws: ws.workspace_id }) : { data: false };
  const sp = await searchParams;
  const canManage = Boolean(staff && ws);
  const labels = {
    search: t("projects.search"), parent: t("projects.parent"), standalone: t("projects.standalone"), count: t("projects.count"),
    addTo: t("projects.addTo"), rename: t("projects.rename"), save: t("projects.save"), moveTo: t("projects.moveTo"),
    noParent: t("projects.noParent"), emptyParent: t("projects.emptyParent"), noMatch: t("projects.noMatch"), name: t("projects.name"),
  };
  return (
    <main id="main" className="pt-page">
      <h1>{t("projectPick.title")}</h1>
      <p className="intro">{projects.length === 0 ? t("projectPick.empty") : t("projects.intro")}</p>
      {sp.error && <p role="alert">{t("projectPick.error")}</p>}
      <ProjectTree parents={parents} projects={projects} labels={labels} canManage={canManage} move={moveProject} rename={renameParent} />
      {projects.length === 0 && !canManage && <a className="btn btn-primary" href="/app/welcome">{t("projectPick.start")}</a>}
      {canManage && ws && (
        <div className="pt-forms">
          <form action={createParent} className="inline-form">
            <input type="hidden" name="workspaceId" value={ws.workspace_id} />
            <label><span className="field-label">{t("projects.newParent")}</span><input className="field" name="name" required /></label>
            <button className="btn" type="submit">{t("projectPick.create")}</button>
          </form>
          <form action={createProject} className="inline-form" id="new-project">
            <input type="hidden" name="workspaceId" value={ws.workspace_id} />
            <label><span className="field-label">{t("projects.newProject")}</span><input className="field" name="name" required /></label>
            <label><span className="field-label">{t("projects.parent")}</span>
              <select className="field" name="parentId" defaultValue={sp.parent ?? ""}>
                <option value="">{t("projects.noParent")}</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <button className="btn btn-primary" type="submit">{t("projectPick.create")}</button>
          </form>
        </div>
      )}
    </main>
  );
}
