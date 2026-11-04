import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { listRisks } from "@/data/risks";
import { riskBand, riskScore } from "@/domain/risk";
import { getT } from "@/lib/locale";
import type { MessageKey } from "@/lib/messages";
import { addRisk } from "./actions";
import { RiskMatrix } from "./RiskMatrix";

const LEVELS = [1, 2, 3, 4, 5];
const TONE = { low: "ok", medium: "warn", high: "bad" } as const;

export default async function RisksPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const items = await listRisks(supabase, project.id);
  const open = items.filter((i) => i.status === "open");
  const level = (name: string, label: MessageKey) => (
    <label>{t(label)} <select name={name} className="field" defaultValue="3">{LEVELS.map((n) => <option key={n}>{n}</option>)}</select></label>
  );
  return (
    <main id="main" className="page">
      <div className="board-head"><div><p className="eyebrow">{project.name}</p><h1>{t("app.risks")}</h1></div></div>
      <form action={addRisk} className="rk-form">
        <input type="hidden" name="projectId" value={project.id} />
        <label>{t("risks.newTitle")} <input name="title" className="field" required maxLength={200} /></label>
        <label>{t("risk.kindLabel")} <select name="kind" className="field"><option value="risk">{t("risks.kind.risk")}</option><option value="issue">{t("risks.kind.issue")}</option></select></label>
        {level("likelihood", "risks.likelihood")}
        {level("severity", "risks.severity")}
        <button type="submit" className="btn">{t("risks.add")}</button>
      </form>
      <div className="rk-grid">
        <section className="surface" aria-labelledby="rk-m">
          <h2 id="rk-m">{t("risks.matrix")}</h2>
          <RiskMatrix items={open} projectId={project.id} label={t("risks.matrix")} />
          <p className="meta">{t("risks.matrixHint")}</p>
        </section>
        {items.length === 0 ? <p>{t("risks.empty")}</p> : (
          <div className="surface data-table">
            <table>
              <caption className="sr-only">{t("app.risks")}</caption>
              <thead><tr><th scope="col">{t("risks.newTitle")}</th><th scope="col">{t("risk.kindLabel")}</th><th scope="col">{t("risks.score")}</th><th scope="col">{t("risk.state")}</th></tr></thead>
              <tbody>
                {items.map((r) => {
                  const score = riskScore(r.likelihood, r.severity, r.kind);
                  return (
                    <tr key={r.id}>
                      <td><a href={`/app/risks/${r.id}?project=${project.id}`}>{r.title}</a></td>
                      <td>{t(`risks.kind.${r.kind}` as MessageKey)}</td>
                      <td><span className={`st st-${TONE[riskBand(score)]}`}>{score} · {t(`risks.band.${riskBand(score)}` as MessageKey)}</span></td>
                      <td>{t(`risk.${r.status}` as MessageKey)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
