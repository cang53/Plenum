import { supabaseServer } from "@/auth/supabase";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { listRisks } from "@/data/risks";
import { riskCodes } from "@/domain/risk";
import { getT } from "@/lib/locale";
import { addRisk } from "./actions";
import { RiskRegisterView } from "./RiskRegisterView";

export default async function RisksPage({ searchParams }: { searchParams: Promise<{ project?: string; kind?: string; cell?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [items, members] = await Promise.all([listRisks(supabase, project.id), listMembers(supabase, project.id)]);
  const owner = (id: string | null) => members.find((m) => m.userId === id)?.name || t("risks.noOwner");
  const kind = sp.kind === "risk" || sp.kind === "issue" ? sp.kind : "all";
  const cell = /^[1-5]:[1-5]$/.test(sp.cell ?? "") ? (sp.cell as string) : null;
  const href = (k: string, c: string | null) => `/app/risks?${new URLSearchParams({ project: project.id, ...(k !== "all" ? { kind: k } : {}), ...(c ? { cell: c } : {}) })}`;
  return <RiskRegisterView t={t} project={project} items={items} codes={riskCodes(items)} owner={owner} kind={kind} cell={cell} href={href} add={addRisk} />;
}
