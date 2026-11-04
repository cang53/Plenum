import { supabaseServer } from "@/auth/supabase";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { listRisks } from "@/data/risks";
import { riskCodes } from "@/domain/risk";
import { getT } from "@/lib/locale";
import { addRisk } from "./actions";
import { latestAnalysis } from "@/server/risk-analysis";
import { getLocale } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import type { MessageKey } from "@/lib/messages";
import { RiskAnalysisPanel } from "./RiskAnalysisPanel";
import { RiskRegisterView } from "./RiskRegisterView";

export default async function RisksPage({ searchParams }: { searchParams: Promise<{ project?: string; kind?: string; cell?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [items, members, latest, canManage] = await Promise.all([listRisks(supabase, project.id), listMembers(supabase, project.id), latestAnalysis(supabase, project.id).catch(() => null), supabase.rpc("can_manage_project", { p: project.id })]);
  const owner = (id: string | null) => members.find((m) => m.userId === id)?.name || t("risks.noOwner");
  const kind = sp.kind === "risk" || sp.kind === "issue" ? sp.kind : "all";
  const cell = /^[1-5]:[1-5]$/.test(sp.cell ?? "") ? (sp.cell as string) : null;
  const href = (k: string, c: string | null) => `/app/risks?${new URLSearchParams({ project: project.id, ...(k !== "all" ? { kind: k } : {}), ...(c ? { cell: c } : {}) })}`;
  const codes = riskCodes(items);
  const key = (k: string) => t(`analysis.${k}` as MessageKey);
  const labels = { title: key("title"), hint: key("hint"), updated: key("updated"), weekly: key("weekly"), manual: key("manual"), none: key("none"), refresh: key("refresh"), working: key("working"), flags: key("flags"), hints: key("hints"), lessons: key("lessons"), fromLibrary: key("fromLibrary"), ask: key("ask"), send: key("send"), error: key("error"), noLessons: key("noLessons"), empty: key("hint"), high: key("level.high"), medium: key("level.medium"), info: key("level.info") };
  const refs = Object.fromEntries(items.map((r) => [r.id, { code: codes.get(r.id) ?? "", title: r.title, href: `/app/risks/${r.id}?project=${project.id}` }]));
  const panel = <RiskAnalysisPanel projectId={project.id} analysis={latest} items={refs} labels={labels} canManage={Boolean(canManage.data)} locale={intlLocale[await getLocale()]} />;
  return <RiskRegisterView t={t} project={project} items={items} codes={codes} owner={owner} kind={kind} cell={cell} href={href} add={addRisk} analysis={panel} />;
}
