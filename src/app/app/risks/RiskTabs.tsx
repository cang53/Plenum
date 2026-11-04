import type { MessageKey } from "@/lib/messages";

// Sub tabs of one risk: its details and its remediation plan.
export function RiskTabs({ t, id, projectParam, current }: { t: (key: MessageKey) => string; id: string; projectParam: string; current: "details" | "plan" }) {
  const q = projectParam ? `?project=${projectParam}` : "";
  return (
    <nav className="rk-seg" aria-label={t("risks.tabs")}>
      <a href={`/app/risks/${id}${q}`} aria-current={current === "details" ? "page" : undefined}>{t("risks.tab.details")}</a>
      <a href={`/app/risks/${id}/plan${q}`} aria-current={current === "plan" ? "page" : undefined}>{t("risks.tab.plan")}</a>
    </nav>
  );
}
