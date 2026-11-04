export type RiskBand = "low" | "medium" | "high";

export const clampLevel = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
};

// Score is likelihood × severity (1 to 25). Issues have already happened, so only their impact counts.
export const riskScore = (likelihood: number, severity: number, kind: "risk" | "issue" = "risk"): number =>
  kind === "issue" ? severity * 5 : likelihood * severity;

export const riskBand = (score: number): RiskBand => (score >= 15 ? "high" : score >= 8 ? "medium" : "low");

type Cell = { id: string; kind: "risk" | "issue"; likelihood: number; severity: number };

// Groups items by matrix cell; an issue sits in the top row (likelihood 5) of its impact column.
export function matrixCells<T extends Cell>(items: T[]): Map<string, T[]> {
  const cells = new Map<string, T[]>();
  for (const i of items) {
    const key = `${i.kind === "issue" ? 5 : i.likelihood}:${i.severity}`;
    cells.set(key, [...(cells.get(key) ?? []), i]);
  }
  return cells;
}

// Short codes by order of creation: R1, R2 for risks and I1, I2 for issues.
export function riskCodes(items: { id: string; kind: "risk" | "issue"; createdAt: string }[]): Map<string, string> {
  const n = { risk: 0, issue: 0 };
  return new Map([...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((i) => [i.id, `${i.kind === "issue" ? "I" : "R"}${++n[i.kind]}`]));
}
