import { supabaseServer } from "@/auth/supabase";
import { currentProject, listInvitations, listMembers, listProjects } from "@/data/projects";
import { isExpired, ROLES } from "@/domain/invitations";
import { ACTIONS, can } from "@/domain/permissions";
import { initials } from "@/domain/board";
import { getT } from "@/lib/locale";
import { ConfirmDialog } from "../ConfirmDialog";
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
      <div className="surface data-table">
        <table>
          <caption className="sr-only">{t("members.title")}</caption>
          <thead><tr><th scope="col">{t("members.person")}</th><th scope="col">{t("members.role")}</th><th scope="col"><span className="sr-only">{t("members.actions")}</span></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td><span className="row-actions"><span className="av" aria-hidden="true">{initials(m.name)}</span><span>{m.name}<br /><small className="meta">{m.email}</small></span></span></td>
                <td>
                  <form action={changeRole} className="inline-form">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="userId" value={m.userId} />
                    <select name="role" defaultValue={m.role} aria-label={`${t("members.role")}: ${m.name}`} className="field">{roleOptions}</select>
                    <button type="submit" className="btn btn-secondary">{t("members.saveRole")}</button>
                  </form>
                </td>
                <td>
                  <ConfirmDialog trigger={t("members.remove")} title={`${t("members.removeTitle")} ${m.name}`} body={t("members.removeBody")} cancel={t("link.cancel")}>
                    <form action={removeMember}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="userId" value={m.userId} />
                      <button type="submit" className="btn btn-danger">{t("members.remove")}</button>
                    </form>
                  </ConfirmDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>{t("members.pending")}</h2>
      {invitations.length === 0 ? <p>{t("members.noPending")}</p> : (
        <div className="surface data-table">
          <table>
            <caption className="sr-only">{t("members.pending")}</caption>
            <thead><tr><th scope="col">{t("login.email")}</th><th scope="col">{t("members.role")}</th><th scope="col"><span className="sr-only">{t("members.actions")}</span></th></tr></thead>
            <tbody>
              {invitations.map((i) => (
                <tr key={i.id}>
                  <td>{i.email}{isExpired(i.expiresAt) && <><br /><small className="meta">{t("members.expired")}</small></>}</td>
                  <td>{t(`role.${i.role as (typeof ROLES)[number]}`)}</td>
                  <td className="row-actions">
                    <form action={resend}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="btn btn-secondary">{t("members.resend")}</button>
                    </form>
                    <ConfirmDialog trigger={t("members.withdraw")} title={t("members.withdrawTitle")} body={t("members.withdrawBody")} cancel={t("link.cancel")}>
                      <form action={withdraw}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="btn btn-danger">{t("members.withdraw")}</button>
                      </form>
                    </ConfirmDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2>{t("members.matrix")}</h2>
      <p className="intro">{t("members.matrixIntro")}</p>
      <div className="surface data-table">
        <table>
          <caption className="sr-only">{t("members.matrix")}</caption>
          <thead><tr><th scope="col">{t("members.actions")}</th>{ROLES.map((r) => <th key={r} scope="col">{t(`role.${r}`)}</th>)}</tr></thead>
          <tbody>
            {ACTIONS.map((a) => (
              <tr key={a}>
                <th scope="row">{t(`perm.${a}`)}</th>
                {ROLES.map((r) => <td key={r}>{can(r, a) ? <span role="img" aria-label={t("members.allowed")}>●</span> : <span role="img" aria-label={t("members.notAllowed")}>–</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>{t("members.invite")}</h2>
      <form action={invite} className="surface form-card">
        <input type="hidden" name="projectId" value={project.id} />
        <label><span className="field-label">{t("login.email")}</span><input type="email" name="email" required className="field" /></label>
        <label><span className="field-label">{t("members.role")}</span><select name="role" defaultValue="member" className="field">{roleOptions}</select></label>
        <button type="submit" className="btn btn-primary">{t("members.send")}</button>
      </form>
    </main>
  );
}
