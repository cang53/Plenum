import { matrixCells, riskBand, riskScore } from "@/domain/risk";
import type { RiskRow } from "@/data/risks";

// Rows run from likelihood 5 (top) to 1; columns from severity 1 to 5. Each mark shows the item's code and links to it.
export function RiskMatrix({ items, codes, projectId, label, likelihood, severity }: { items: RiskRow[]; codes: Map<string, string>; projectId: string; label: string; likelihood: string; severity: string }) {
  const cells = matrixCells(items);
  const levels = [1, 2, 3, 4, 5];
  return (
    <div className="rk-matrix" role="group" aria-label={label}>
      <div className="rk-axis rk-ytitle">{likelihood} →</div>
      {[5, 4, 3, 2, 1].map((l) => (
        <div key={l} style={{ display: "contents" }}>
          <div className="rk-axis" aria-hidden="true">{l}</div>
          {levels.map((s) => (
            <div key={s} className={`rk-cell rk-${riskBand(l * s)}`}>
              {(cells.get(`${l}:${s}`) ?? []).map((r) => (
                <a key={r.id} className="rk-dot" data-kind={r.kind} href={`/app/risks/${r.id}?project=${projectId}`} title={`${r.title} (${riskScore(r.likelihood, r.severity, r.kind)})`} aria-label={`${codes.get(r.id)} ${r.title}`}>{codes.get(r.id)}</a>
              ))}
            </div>
          ))}
        </div>
      ))}
      <div style={{ gridColumn: "1 / 3" }} />
      {levels.map((s) => <div key={s} className="rk-axis" aria-hidden="true">{s}</div>)}
      <div style={{ gridColumn: "1 / 3" }} />
      <div className="rk-axis rk-xtitle">{severity} →</div>
    </div>
  );
}
