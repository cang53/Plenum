import Link from "next/link";
import { supabaseServer } from "@/auth/supabase";
import { listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { createProject } from "./actions";

// After sign-in: pick an existing project or start a new one.
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const projects = await listProjects(supabase);
  const { data: ws } = projects[0]
    ? await supabase.from("projects").select("workspace_id").eq("id", projects[0].id).single()
    : { data: null };
  const { data: staff } = ws ? await supabase.rpc("is_workspace_staff", { ws: ws.workspace_id }) : { data: false };
  const sp = await searchParams;
  return (
    <main id="main" className="center-stage">
      <div className="surface state-card">
        <h1>{t("projects.title")}</h1>
        {projects.length === 0 && <p className="intro">{t("projects.empty")}</p>}
        <ul>
          {projects.map((p) => (
            <li key={p.id}><Link href={`/app?project=${p.id}`}>{p.name}</Link></li>
          ))}
        </ul>
        {projects.length === 0 && <Link className="btn btn-primary" href="/app/welcome">{t("projects.start")}</Link>}
        {staff && ws && (
          <form action={createProject}>
            <h2>{t("projects.new")}</h2>
            {sp.error && <p role="alert">{t("projects.error")}</p>}
            <input type="hidden" name="workspaceId" value={ws.workspace_id} />
            <p><label><span className="field-label">{t("welcome.project")}</span><input className="field" name="name" required /></label></p>
            <button className="btn btn-primary" type="submit">{t("projects.create")}</button>
          </form>
        )}
      </div>
    </main>
  );
}
