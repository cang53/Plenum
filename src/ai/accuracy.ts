// Scores triage answers against the test set: a case is right when the suggested kind matches.

import type { Suggestion } from "@/domain/triage";
import type { Expected } from "./testset";

export type Report = { correct: number; total: number; byKind: Record<string, { correct: number; total: number }> };

export function score(expected: Expected[], got: (Suggestion | null)[]): Report {
  const report: Report = { correct: 0, total: expected.length, byKind: {} };
  expected.forEach((kind, i) => {
    const entry = (report.byKind[kind] ??= { correct: 0, total: 0 });
    entry.total++;
    if ((got[i]?.kind ?? "none") === kind) {
      entry.correct++;
      report.correct++;
    }
  });
  return report;
}

export function formatReport(report: Report): string {
  const pct = (a: number, b: number) => `${Math.round((100 * a) / b)}%`;
  const lines = Object.entries(report.byKind).map(([kind, r]) => `| ${kind} | ${r.correct}/${r.total} | ${pct(r.correct, r.total)} |`);
  return [
    `AI triage accuracy: ${report.correct}/${report.total} (${pct(report.correct, report.total)})`,
    "", "| Kind | Right | Accuracy |", "| --- | --- | --- |", ...lines,
  ].join("\n");
}
