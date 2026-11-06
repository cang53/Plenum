import type { RiskRow } from "@/data/risks";
import { cellKey, riskBand, riskScore } from "@/domain/risk";
import type { MessageKey } from "@/lib/messages";
import { Choice } from "./Choice";
import { RiskMatrix } from "./RiskMatrix";

export type Kind = "all" | "risk" | "issue";
export const EXTRA_COLS = ["likelihood", "severity", "remediation", "activity", "due", "created"] as const;
export type ExtraCol = (typeof EXTRA_COLS)[number];
const KINDS: Kind[] = ["all", "risk", "issue"];
const LEVELS = [1, 2, 3, 4, 5];
const TONE = { low: "c-green", medium: "c-amber", high: "c-red" } as const;

type Props = { t: (key: MessageKey) => string; project: { id: string; name: string }; items: RiskRow[]; codes: Map<string, string>; owner: (id: string | null) => string; kind: Kind; cell: string | null; href: (kind: Kind, cell: string | null) => string; add: (form: FormData) => void | Promise<void>; analysis?: React.ReactNode; cols?: ExtraCol[]; activity?: (id: string | null) => string };

// The register screen: matrix on the left, list on the right. Pure markup so it can be rendered without a database.
export function RiskRegisterView({ t, project, items, codes, owner, kind, cell, href, add, analysis, cols = [], activity = () => "" }: Props) {
  const levels = LEVELS.map((n) => ({ value: String(n), label: String(n) }));
  const shown = items.filter((i) => (kind === "all" || i.kind === kind) && (!cell || cellKey(i) === cell));
  const head: Record<ExtraCol, MessageKey> = { likelihood: "risks.likelihood", severity: "risks.severity", remediation: "risks.remediation", activity: "risks.linkedTask", due: "risks.due", created: "risks.col.created" };
  const cell_ = (r: RiskRow, c: ExtraCol) => ({ likelihood: r.likelihood, severity: r.severity, remediation: t(`risks.remediation.${r.remediation}` as MessageKey), activity: activity(r.linkedTaskId), due: r.dueDate ?? "", created: r.createdAt.slice(0, 10) })[c];
  const open = items.filter((i) => i.status === "open");
  const today = new Date().toISOString().slice(0, 10);
  const metrics = [
    { value: String(open.length), label: t("risks.metric.open") },
    { value: String(open.filter((i) => riskScore(i.likelihood, i.severity, i.kind) >= 15).length), label: t("risks.metric.high") },
    ...(items.some((i) => i.dueDate) ? [{ value: String(open.filter((i) => i.dueDate && i.dueDate <= today).length), label: t("risks.metric.due") }] : []),
  ];
  const forMatrix = items.filter((i) => i.status === "open" && (kind === "all" || i.kind === kind));
  return (
    <main id="main" className="page">
      <div className="rk-head">
        <div><h1 className="h1">{t("app.risks")}</h1><p className="subline">{t("risks.subtitle")}</p></div>
        <div className="rk-actions">
          <details className="rk-add">
            <summary className="btn btn-primary">{t("risks.addNew")}</summary>
            <form action={add} className="rk-pop">
              <input type="hidden" name="projectId" value={project.id} />
              <label className="rk-lab">{t("risks.newTitle")}<input name="title" className="rk-in" required maxLength={200} /></label>
              <label className="rk-lab">{t("risks.details")}<textarea name="details" className="rk-in" rows={3} maxLength={4000} /></label>
              <Choice name="kind" label={t("risk.kindLabel")} value="risk" options={[{ value: "risk", label: t("risks.kind.risk") }, { value: "issue", label: t("risks.kind.issue") }]} />
              <Choice name="likelihood" label={t("risks.likelihood")} value="3" options={levels} />
              <Choice name="severity" label={t("risks.severity")} value="3" options={levels} />
              <button type="submit" className="btn btn-primary">{t("risks.add")}</button>
            </form>
          </details>
        </div>
      </div>
      <div className="metrics">
        {metrics.map((m) => <div key={m.label} className="metric"><b>{m.value}</b><span className="muted">{m.label}</span></div>)}
      </div>
      <nav className="fpills rk-seg" aria-label={t("risks.filter")}>
        {KINDS.map((k) => (
          <a key={k} className="fpill" href={href(k, null)} aria-current={kind === k ? "page" : undefined}>{t(`risks.filter.${k}` as MessageKey)} <span className="rk-count">{k === "all" ? items.length : items.filter((i) => i.kind === k).length}</span></a>
        ))}
        {cell && <a href={href(kind, null)} className="fpill rk-clear">{t("risks.clearCell")} ✕</a>}
      </nav>
      <div className="rk-grid">
        <section className="panel rk-card" aria-labelledby="rk-m">
          <div className="rk-card-top"><h2 id="rk-m">{t("risks.matrix")}</h2><span className="rk-tag">{t("risks.matrixAxes")}</span></div>
          <RiskMatrix items={forMatrix} hrefFor={(c) => href(kind, c)} label={t("risks.matrix")} selected={cell} />
          <p className="meta">{t("risks.matrixHint")}</p>
        </section>
        <section className="panel rk-card" aria-labelledby="rk-l">
          <div className="rk-card-top">
            <h2 id="rk-l">{t("risks.listTitle")}</h2>
            <details className="rk-add rk-cols">
              <summary className="btn btn-soft btn-sm">{t("items.cols")}</summary>
              <form method="get" className="rk-pop">
                <input type="hidden" name="project" value={project.id} />
                {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
                {cell && <input type="hidden" name="cell" value={cell} />}
                {EXTRA_COLS.map((c) => <label key={c}><input type="checkbox" name="cols" value={c} defaultChecked={cols.includes(c)} />{t(head[c])}</label>)}
                <button type="submit" className="btn btn-primary btn-sm">{t("items.cols.apply")}</button>
              </form>
            </details>
          </div>
          {shown.length === 0 ? <p>{t("risks.empty")}</p> : (
            <div className="rk-table tablewrap">
              <table className="dt">
                <thead><tr><th scope="col">{t("risks.id")}</th><th scope="col">{t("risks.newTitle")}</th><th scope="col">{t("risks.score")}</th><th scope="col">{t("risks.due")}</th>{cols.map((c) => <th key={c} scope="col">{t(head[c])}</th>)}<th scope="col"><span className="sr-only">{t("risks.view")}</span></th></tr></thead>
                <tbody>
                  {shown.map((r) => {
                    const score = riskScore(r.likelihood, r.severity, r.kind);
                    const band = riskBand(score);
                    const to = `/app/risks/${r.id}?project=${project.id}`;
                    return (
                      <tr key={r.id}>
                        <td className="rk-id">{codes.get(r.id)}</td>
                        <td><a href={to}>{r.title}</a><span className="rk-sub">{t(`risks.kind.${r.kind}` as MessageKey)} · {owner(r.ownerId)}{r.status === "closed" ? ` · ${t("risk.closed")}` : ""}</span></td>
                        <td><span className={`chip ${TONE[band]}`}>{score} · {t(`risks.band.${band}` as MessageKey)}</span></td>
                        <td>{r.dueDate ?? ""}</td>
                        {cols.map((c) => <td key={c}>{cell_(r, c)}</td>)}
                        <td><a className="btn btn-soft btn-sm" href={to}>{t("risks.view")}</a></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {analysis}
    </main>
  );
}
