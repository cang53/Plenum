import { supabaseServer } from "@/auth/supabase";
import { currentProject, listInvitations, listMembers, listProjects } from "@/data/projects";
import { isExpired, ROLES } from "@/domain/invitations";
import { getT } from "@/lib/locale";
import { changeRole, invite, removeMember, resend, withdraw } from "./actions";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [members, invitations] = await Promise.all([listMembers(supabase, project.id), listInvitations(supabase, project.id)]);
  const roleOptions = ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>);
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("members.title")}</h1>
      <p className="intro">{t("members.intro")}</p>
      <ul>
        {members.map((m) => (
          <li key={m.userId}>
            {m.name} ({m.email})
            <form action={changeRole}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="userId" value={m.userId} />
              <label>{t("members.role")} <select name="role" defaultValue={m.role}>{roleOptions}</select></label>
              <button type="submit">{t("members.saveRole")}</button>
            </form>
            <form action={removeMember}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="userId" value={m.userId} />
              <button type="submit">{t("members.remove")}</button>
            </form>
          </li>
        ))}
      </ul>
      <h2>{t("members.pending")}</h2>
      {invitations.length === 0 ? <p>{t("members.noPending")}</p> : (
        <ul>
          {invitations.map((i) => (
            <li key={i.id}>
              {i.email} ({t(`role.${i.role as (typeof ROLES)[number]}`)}){isExpired(i.expiresAt) && <> {t("members.expired")}</>}
              <form action={resend}>
                <input type="hidden" name="id" value={i.id} />
                <button type="submit">{t("members.resend")}</button>
              </form>
              <form action={withdraw}>
                <input type="hidden" name="id" value={i.id} />
                <button type="submit">{t("members.withdraw")}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <h2>{t("members.invite")}</h2>
      <form action={invite}>
        <input type="hidden" name="projectId" value={project.id} />
        <label>{t("login.email")} <input type="email" name="email" required /></label>
        <label>{t("members.role")} <select name="role" defaultValue="member">{roleOptions}</select></label>
        <button type="submit">{t("members.send")}</button>
      </form>
    </main>
  );
}
