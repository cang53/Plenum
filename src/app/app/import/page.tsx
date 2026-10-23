import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { ImportForm } from "./ImportForm";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { data: role } = await supabase.rpc("project_role_of", { p: project.id });
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("import.title")}</h1>
      <p className="intro">{t("import.intro")}</p>
      {role === "project_manager" && <p><a href={`/app/import/resources?project=${project.id}`}>{t("resources.link")}</a></p>}
      {role !== "project_manager" ? <p>{t("settings.managerOnly")}</p> : (
        <ImportForm
          projectId={project.id}
          labels={{ file: t("import.file"), preview: t("import.preview"), apply: t("import.apply"), created: t("import.created"), refreshed: t("import.refreshed"), unchanged: t("import.unchanged"), done: t("import.done") }}
          errors={{ "import.noFile": t("import.noFile"), "import.unknownFormat": t("import.unknownFormat"), "import.empty": t("import.empty"), "import.tooBig": t("import.tooBig"), "import.invalid": t("import.invalid"), "settings.saveError": t("settings.saveError") }}
        />
      )}
    </main>
  );
}
