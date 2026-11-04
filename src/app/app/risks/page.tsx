import { supabaseServer } from "@/auth/supabase";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { listRisks } from "@/data/risks";
import { riskCodes } from "@/domain/risk";
import { getT } from "@/lib/locale";
import { addRisk } from "./actions";
import { RiskRegisterView } from "./RiskRegisterView";

export default async function RisksPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [items, members] = await Promise.all([listRisks(supabase, project.id), listMembers(supabase, project.id)]);
  const owner = (id: string | null) => members.find((m) => m.userId === id)?.name || t("risks.noOwner");
  return <RiskRegisterView t={t} project={project} items={items} codes={riskCodes(items)} owner={owner} add={addRisk} />;
}
