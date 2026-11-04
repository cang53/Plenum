import type { RiskRow } from "@/data/risks";
import { cellKey, riskBand, riskScore } from "@/domain/risk";
import type { MessageKey } from "@/lib/messages";
import { Choice } from "./Choice";
import { RiskMatrix } from "./RiskMatrix";

export type Kind = "all" | "risk" | "issue";
const KINDS: Kind[] = ["all", "risk", "issue"];
const LEVELS = [1, 2, 3, 4, 5];
const TONE = { low: "ok", medium: "warn", high: "bad" } as const;

type Props = { t: (key: MessageKey) => string; project: { id: string; name: string }; items: RiskRow[]; codes: Map<string, string>; owner: (id: string | null) => string; kind: Kind; cell: string | null; href: (kind: Kind, cell: string | null) => string; add: (form: FormData) => void | Promise<void>; analysis?: React.ReactNode };

// The register screen: matrix on the left, list on the right. Pure markup so it can be rendered without a database.
export function RiskRegisterView({ t, project, items, codes, owner, kind, cell, href, add, analysis }: Props) {
  const levels = LEVELS.map((n) => ({ value: String(n), label: String(n) }));
  const shown = items.filter((i) => (kind === "all" || i.kind === kind) && (!cell || cellKey(i) === cell));
  const forMatrix = items.filter((i) => i.status === "open" && (kind === "all" || i.kind === kind));
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
              <Choice name="kind" label={t("risk.kindLabel")} value="risk" options={[{ value: "risk", label: t("risks.kind.risk") }, { value: "issue", label: t("risks.kind.issue") }]} />
              <Choice name="likelihood" label={t("risks.likelihood")} value="3" options={levels} />
              <Choice name="severity" label={t("risks.severity")} value="3" options={levels} />
              <button type="submit" className="act act-primary">{t("risks.add")}</button>
            </form>
          </details>
        </div>
      </div>
      {analysis}
      <nav className="rk-seg" aria-label={t("risks.filter")}>
        {KINDS.map((k) => (
          <a key={k} href={href(k, null)} aria-current={kind === k ? "page" : undefined}>{t(`risks.filter.${k}` as MessageKey)} <span className="rk-count">{k === "all" ? items.length : items.filter((i) => i.kind === k).length}</span></a>
        ))}
        {cell && <a href={href(kind, null)} className="rk-clear">{t("risks.clearCell")} ✕</a>}
      </nav>
      <div className="rk-grid">
        <section className="surface rk-card" aria-labelledby="rk-m">
          <div className="rk-card-top"><h2 id="rk-m">{t("risks.matrix")}</h2><span className="rk-tag">{t("risks.matrixAxes")}</span></div>
          <RiskMatrix items={forMatrix} hrefFor={(c) => href(kind, c)} label={t("risks.matrix")} selected={cell} />
          <p className="meta">{t("risks.matrixHint")}</p>
        </section>
        <section className="surface rk-card" aria-labelledby="rk-l">
          <h2 id="rk-l">{t("risks.listTitle")}</h2>
          {shown.length === 0 ? <p>{t("risks.empty")}</p> : (
            <div className="rk-table">
              <table>
                <thead><tr><th scope="col">{t("risks.id")}</th><th scope="col">{t("risks.newTitle")}</th><th scope="col">{t("risk.kindLabel")}</th><th scope="col">{t("risks.score")}</th><th scope="col">{t("risks.owner")}</th><th scope="col">{t("risk.state")}</th></tr></thead>
                <tbody>
                  {shown.map((r) => {
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
