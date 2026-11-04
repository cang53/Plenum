import type { RiskRow } from "@/data/risks";
import { riskBand, riskScore } from "@/domain/risk";
import type { MessageKey } from "@/lib/messages";
import { RiskMatrix } from "./RiskMatrix";

const LEVELS = [1, 2, 3, 4, 5];
const TONE = { low: "ok", medium: "warn", high: "bad" } as const;

type Props = { t: (key: MessageKey) => string; project: { id: string; name: string }; items: RiskRow[]; codes: Map<string, string>; owner: (id: string | null) => string; add: (form: FormData) => void | Promise<void> };

// The register screen: matrix on the left, list on the right. Pure markup so it can be rendered without a database.
export function RiskRegisterView({ t, project, items, codes, owner, add }: Props) {
  const level = (name: string, label: MessageKey) => (
    <label className="rk-lab">{t(label)}<select name={name} className="rk-in" defaultValue="3">{LEVELS.map((n) => <option key={n}>{n}</option>)}</select></label>
  );
  return (
    <main id="main" className="page">
      <div className="rk-head">
        <div><p className="eyebrow">{project.name}</p><h1>{t("app.risks")}</h1><p className="sub">{t("risks.subtitle")}</p></div>
        <div className="rk-actions">
          <details className="rk-add">
            <summary className="act act-primary">+ {t("risks.addNew")}</summary>
            <form action={add} className="rk-pop">
              <input type="hidden" name="projectId" value={project.id} />
              <label className="rk-lab">{t("risks.newTitle")}<input name="title" className="rk-in" required maxLength={200} /></label>
              <label className="rk-lab">{t("risk.kindLabel")}<select name="kind" className="rk-in"><option value="risk">{t("risks.kind.risk")}</option><option value="issue">{t("risks.kind.issue")}</option></select></label>
              <div className="rk-two">{level("likelihood", "risks.likelihood")}{level("severity", "risks.severity")}</div>
              <button type="submit" className="act act-primary">{t("risks.add")}</button>
            </form>
          </details>
        </div>
      </div>
      <div className="rk-grid">
        <section className="surface rk-card" aria-labelledby="rk-m">
          <div className="rk-card-top"><h2 id="rk-m">{t("risks.matrix")}</h2><span className="rk-tag">{t("risks.matrixAxes")}</span></div>
          <RiskMatrix items={items.filter((i) => i.status === "open")} codes={codes} projectId={project.id} label={t("risks.matrix")} likelihood={t("risks.likelihood")} severity={t("risks.severityShort")} />
          <p className="meta">{t("risks.matrixHint")}</p>
        </section>
        <section className="surface rk-card" aria-labelledby="rk-l">
          <h2 id="rk-l">{t("risks.listTitle")}</h2>
          {items.length === 0 ? <p>{t("risks.empty")}</p> : (
            <div className="rk-table">
              <table>
                <thead><tr><th scope="col">{t("risks.id")}</th><th scope="col">{t("risks.newTitle")}</th><th scope="col">{t("risk.kindLabel")}</th><th scope="col">{t("risks.score")}</th><th scope="col">{t("risks.owner")}</th><th scope="col">{t("risk.state")}</th></tr></thead>
                <tbody>
                  {items.map((r) => {
                    const score = riskScore(r.likelihood, r.severity, r.kind);
                    const band = riskBand(score);
                    return (
                      <tr key={r.id}>
                        <td className="rk-id">{codes.get(r.id)}</td>
                        <td><a href={`/app/risks/${r.id}?project=${project.id}`}>{r.title}</a></td>
                        <td>{t(`risks.kind.${r.kind}` as MessageKey)}</td>
                        <td><span className={`st st-${TONE[band]}`}>{score} · {t(`risks.band.${band}` as MessageKey)}</span></td>
                        <td>{owner(r.ownerId)}</td>
                        <td><span className={`st st-${r.status === "open" ? "warn" : "ok"}`}>{t(`risk.${r.status}` as MessageKey)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
