import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { t } from "@/lib/messages";
import { RiskAnalysisPanel } from "./RiskAnalysisPanel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("./analysis-actions", () => ({ askAnalysis: vi.fn(), refreshAnalysis: vi.fn() }));

const labels = { title: t("analysis.title"), hint: t("analysis.hint"), updated: t("analysis.updated"), weekly: t("analysis.weekly"), manual: t("analysis.manual"), none: t("analysis.none"), refresh: t("analysis.refresh"), working: t("analysis.working"), flags: t("analysis.flags"), hints: t("analysis.hints"), lessons: t("analysis.lessons"), fromLibrary: t("analysis.fromLibrary"), ask: t("analysis.ask"), send: t("analysis.send"), error: t("analysis.error"), noLessons: t("analysis.noLessons"), empty: "", high: t("analysis.level.high"), medium: t("analysis.level.medium"), info: t("analysis.level.info") };
const items = { a: { code: "R1", title: "Conveyor delivery may slip", href: "/app/risks/a" } };
const analysis = { source: "weekly" as const, createdAt: "2026-11-02T06:00:00Z", summary: "4 open (2 risks, 2 issues), 2 high.", flags: [{ riskId: "a", level: "high" as const, text: "R1 scores 20 (high)." }], hints: ["Give every open risk an owner."], lessons: [{ riskId: "a", docId: "d", docTitle: "Late supplier delivery", text: "Order long-lead items before the design freeze." }] };
const render = (a: typeof analysis | null, canManage = true) => renderToStaticMarkup(<RiskAnalysisPanel projectId="p" analysis={a} items={items} labels={labels} canManage={canManage} locale="en-GB" />);

describe("RiskAnalysisPanel", () => {
  it("shows the findings as messages, with a lesson that names its Library source", () => {
    const html = render(analysis);
    expect(html).toContain("4 open");
    expect(html).toContain("R1 scores 20 (high).");
    expect(html).toContain("Order long-lead items");
    expect(html).toContain("Source: Library · Late supplier delivery");
    expect(html).toContain('href="/app/risks/a"');
    expect(html).toContain("Updated 2 Nov · weekly refresh");
    if (process.env.PLAN_STUDIO_HTML) writeFileSync(process.env.PLAN_STUDIO_HTML, html);
  });
  it("tells a new project there is no analysis yet, and hides Refresh from non-managers", () => {
    expect(render(null)).toContain(t("analysis.hint"));
    expect(render(analysis, false)).not.toContain(t("analysis.refresh"));
  });
});
