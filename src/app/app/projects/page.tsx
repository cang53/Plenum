import { supabaseServer } from "@/auth/supabase";
import { listParents, listProjects } from "@/data/projects";
import { projectStats } from "@/domain/projectStats";
import { getLocale, getT } from "@/lib/locale";
import type { MessageKey } from "@/lib/messages";
import { createParent, createProject, moveProject, renameParent } from "./actions";
import { ProjectTree } from "./ProjectTree";

const LABELS = ["heading", "intro", "search", "parent", "standalone", "count", "addTo", "rename", "save", "noParent", "emptyParent", "noMatch", "name", "newParent", "newProject", "collapse", "expand", "ok", "warn", "bad", "done", "next", "noNext", "blocked", "move", "moveHelp", "cancel", "create"] as const;

// The Projects crumb in the top bar opens this page: parent projects with their projects below.
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const [projects, parents] = await Promise.all([listProjects(supabase), listParents(supabase)]);
  const { data: ws } = projects[0]
    ? await supabase.from("projects").select("workspace_id").eq("id", projects[0].id).single()
    : { data: null };
  const { data: staff } = ws ? await supabase.rpc("is_workspace_staff", { ws: ws.workspace_id }) : { data: false };
  const { data: tasks } = await supabase.from("tasks").select("project_id, title, status, due_date, is_milestone");
  const stats = projectStats(tasks ?? [], new Date().toISOString().slice(0, 10));
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const sp = await searchParams;
  const labels = Object.fromEntries(LABELS.map((k) => [k, t(`projects.${k}` as MessageKey)])) as Record<(typeof LABELS)[number], string>;
  const rows = projects.map((p) => {
    const s = stats[p.id];
    return { ...p, done: s?.done ?? 0, total: s?.total ?? 0, blocked: s?.blocked ?? 0, health: s?.health ?? "ok", next: s?.next?.title, nextDate: s?.next?.date ? day.format(new Date(s.next.date)) : "" };
  });
  return (
    <main id="main" className="pt-page">
      {sp.error && <p role="alert">{t("projectPick.error")}</p>}
      <ProjectTree parents={parents} projects={rows} labels={labels} workspaceId={staff && ws ? ws.workspace_id : null}
        move={moveProject} rename={renameParent} createParent={createParent} createProject={createProject} />
      {projects.length === 0 && !staff && <a className="btn btn-primary" href="/app/welcome">{t("projectPick.start")}</a>}
    </main>
  );
}
