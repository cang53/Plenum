import { matrixCells, riskBand } from "@/domain/risk";
import type { RiskRow } from "@/data/risks";

// Rows run from likelihood 5 (top) to 1; columns from severity 1 to 5. A cell shows how many items sit in it and links to them.
export function RiskMatrix({ items, hrefFor, label, selected }: { items: RiskRow[]; hrefFor: (cell: string) => string; label: string; selected: string | null }) {
  const cells = matrixCells(items);
  const levels = [1, 2, 3, 4, 5];
  return (
    <div className="rk-matrix" role="group" aria-label={label}>
      {[5, 4, 3, 2, 1].map((l) => (
        <div key={l} style={{ display: "contents" }}>
          <div className="rk-axis" aria-hidden="true">{l}</div>
          {levels.map((s) => {
            const key = `${l}:${s}`;
            const here = cells.get(key) ?? [];
            return here.length ? (
              <a key={s} className={`rk-cell rk-${riskBand(l * s)} rk-n`} href={hrefFor(key)} aria-current={selected === key ? "true" : undefined} title={here.map((r) => r.title).join("\n")}>{here.length}</a>
            ) : (
              <div key={s} className={`rk-cell rk-${riskBand(l * s)}`} />
            );
          })}
        </div>
      ))}
      <div />
      {levels.map((s) => <div key={s} className="rk-axis" aria-hidden="true">{s}</div>)}
    </div>
  );
}
