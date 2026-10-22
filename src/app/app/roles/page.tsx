import { supabaseServer } from "@/auth/supabase";
import { listMembers, listProjects } from "@/data/projects";
import { ROLES } from "@/domain/invitations";
import { getT } from "@/lib/locale";
import { changeRole } from "../members/actions";

// Workspace admins see every project's people at once. Row-level security still decides who may change a role.
export default async function RolesPage() {
  const t = await getT();
  const supabase = await supabaseServer();
  const projects = await listProjects(supabase);
  const { data: ws } = projects[0]
    ? await supabase.from("projects").select("workspace_id").eq("id", projects[0].id).single()
    : { data: null };
  const { data: isAdmin } = ws ? await supabase.rpc("is_workspace_admin", { ws: ws.workspace_id }) : { data: false };
  if (!isAdmin) return <main id="main" className="page"><p>{t("roles.denied")}</p></main>;
  const members = await Promise.all(projects.map((p) => listMembers(supabase, p.id)));
  return (
    <main id="main" className="page">
      <h1>{t("roles.title")}</h1>
      <p className="intro">{t("roles.intro")}</p>
      {projects.map((p, i) => (
        <section key={p.id}>
          <h2>{p.name}</h2>
          <ul>
            {members[i].map((m) => (
              <li key={m.userId}>
                {m.name} ({m.email})
                <form action={changeRole}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <label>{t("members.role")} <select name="role" defaultValue={m.role}>
                    {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                  </select></label>
                  <button type="submit">{t("members.saveRole")}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
