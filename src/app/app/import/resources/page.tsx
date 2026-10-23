import { supabaseServer } from "@/auth/supabase";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { ResourceForm } from "./ResourceForm";

export default async function ResourceImportPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { data: role } = await supabase.rpc("project_role_of", { p: project.id });
  const people = (await listMembers(supabase, project.id)).map((m) => ({ userId: m.userId, name: m.name || m.email }));
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("resources.title")}</h1>
      <p className="intro">{t("resources.intro")}</p>
      {role !== "project_manager" ? <p>{t("settings.managerOnly")}</p> : (
        <ResourceForm
          projectId={project.id}
          people={people}
          labels={{ file: t("import.file"), preview: t("import.preview"), apply: t("import.apply"), assign: t("resources.assign"), unchanged: t("resources.unchanged"), skipped: t("resources.skipped"), unmatched: t("resources.unmatched"), skip: t("resources.skip"), done: t("resources.done") }}
          errors={{ "import.noFile": t("import.noFile"), "import.unknownFormat": t("import.unknownFormat"), "resources.empty": t("resources.empty"), "import.tooBig": t("import.tooBig"), "import.invalid": t("import.invalid"), "settings.saveError": t("settings.saveError") }}
        />
      )}
    </main>
  );
}
