import { matrixCells, riskBand, riskScore } from "@/domain/risk";
import type { RiskRow } from "@/data/risks";

// Rows run from likelihood 5 (top) to 1; columns from severity 1 to 5. Each mark links to its detail page.
export function RiskMatrix({ items, projectId, label }: { items: RiskRow[]; projectId: string; label: string }) {
  const cells = matrixCells(items);
  const rows = [5, 4, 3, 2, 1];
  return (
    <div className="rk-matrix" role="group" aria-label={label}>
      {rows.map((l) => (
        <div key={l} style={{ display: "contents" }}>
          <div className="rk-axis" aria-hidden="true">{l}</div>
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`rk-cell rk-${riskBand(l * s)}`}>
              {(cells.get(`${l}:${s}`) ?? []).map((r, n) => (
                <a key={r.id} className="rk-dot" data-kind={r.kind} href={`/app/risks/${r.id}?project=${projectId}`} title={`${r.title} (${riskScore(r.likelihood, r.severity, r.kind)})`} aria-label={r.title}>{n + 1}</a>
              ))}
            </div>
          ))}
        </div>
      ))}
      <div />
      {[1, 2, 3, 4, 5].map((s) => <div key={s} className="rk-axis" aria-hidden="true">{s}</div>)}
    </div>
  );
}
