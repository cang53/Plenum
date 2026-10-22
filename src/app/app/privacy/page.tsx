import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { messages, type MessageKey } from "@/lib/messages";
import { getT } from "@/lib/locale";
import { saveRetention } from "./actions";

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ project?: string; saved?: string; error?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { data: p } = await supabase.from("projects").select("workspace_id").eq("id", project.id).single();
  const { data: isAdmin } = await supabase.rpc("is_workspace_admin", { ws: p?.workspace_id });
  const { data: ws } = await supabase.from("workspaces").select("retention_days").eq("id", p?.workspace_id ?? "").single();
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("privacy.title")}</h1>
      <p className="intro">{t("privacy.intro")}</p>
      {error && <p role="alert">{error}</p>}
      {sp.saved && <p role="status">{t("settings.saved")}</p>}
      <ul>
        {(["privacy.read", "privacy.ai", "privacy.where", "privacy.people"] as const).map((k) => <li key={k}>{t(k)}</li>)}
      </ul>
      <h2>{t("privacy.retention")}</h2>
      <p>{ws?.retention_days ? t("privacy.keptFor").replace("{days}", String(ws.retention_days)) : t("privacy.keptForever")}</p>
      {isAdmin ? (
        <form action={saveRetention}>
          <input type="hidden" name="projectId" value={project.id} />
          <p><label>{t("privacy.days")} <input name="days" inputMode="numeric" defaultValue={ws?.retention_days ?? ""} /></label>
            <br /><small>{t("privacy.help")}</small></p>
          <button type="submit">{t("settings.save")}</button>
        </form>
      ) : <p>{t("privacy.adminOnly")}</p>}
    </main>
  );
}
