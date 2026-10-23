import { supabaseServer } from "@/auth/supabase";
import { currentProject, listInvitations, listProjects } from "@/data/projects";
import { ROLES } from "@/domain/invitations";
import { projectAddress } from "@/domain/onboarding";
import { getT } from "@/lib/locale";
import { invite } from "../members/actions";
import { finish, onboard } from "./actions";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string; project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const projects = await listProjects(supabase);
  const sp = await searchParams;
  if (projects.length === 0) {
    return (
      <main id="main" className="center-stage">
        <div className="surface state-card">
        <p className="eyebrow">{t("welcome.step1")}</p>
        <h1>{t("welcome.title")}</h1>
        <p className="intro">{t("welcome.intro")}</p>
        {sp.error && <p role="alert">{t("welcome.error")}</p>}
        <form action={onboard}>
          <p>
            <label><span className="field-label">{t("welcome.workspace")}</span><input className="field" name="workspace" required /></label>
          </p>
          <p>
            <label><span className="field-label">{t("welcome.project")}</span><input className="field" name="project" required /></label>
          </p>
          <p>
            <label className="check"><input type="checkbox" name="demo" /> {t("welcome.demo")}</label>
          </p>
          <button className="btn btn-primary" type="submit">{t("welcome.submit")}</button>
        </form>
        </div>
      </main>
    );
  }
  const project = currentProject(projects, sp.project)!;
  const invitations = await listInvitations(supabase, project.id);
  return (
    <main id="main" className="center-stage">
      <div className="surface state-card">
      <h1>{t("welcome.ready")}</h1>
      <section>
        <h2>{t("welcome.addressTitle")}</h2>
        <p><code>{projectAddress(project.email_slug, process.env.INBOUND_EMAIL_DOMAIN)}</code></p>
        <p className="intro">{t("welcome.addressHelp")}</p>
      </section>
      <section>
        <h2>{t("members.invite")}</h2>
        {invitations.length > 0 && (
          <ul>{invitations.map((i) => <li key={i.id}>{i.email} ({t(`role.${i.role as (typeof ROLES)[number]}`)})</li>)}</ul>
        )}
        <form action={invite}>
          <input type="hidden" name="projectId" value={project.id} />
          <label>{t("login.email")} <input className="field" type="email" name="email" required /></label>
          <label>{t("members.role")} <select name="role" defaultValue="member">
            {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
          </select></label>
          <button className="btn btn-secondary" type="submit">{t("members.send")}</button>
        </form>
      </section>
      <form action={finish}>
        <button className="btn btn-primary" type="submit">{t("welcome.finish")}</button>
      </form>
      </div>
    </main>
  );
}
