import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";
import type { RiskRow } from "@/data/risks";
import { RiskRegisterView } from "./RiskRegisterView";

const t = (k: string) => (messages.en as Record<string, string>)[k] ?? k;
const row = (o: Partial<RiskRow>): RiskRow => ({ id: "r1", kind: "risk", title: "Sample risk", details: "", status: "open", remediation: "none", linkedTaskId: null, linkDeclined: false, likelihood: 4, severity: 4, ownerId: null, dueDate: null, sourceMessageId: null, createdAt: "2026-01-01T00:00:00Z", ...o });
const render = (items: RiskRow[]) => renderToStaticMarkup(<RiskRegisterView t={t as never} project={{ id: "p", name: "P" }} items={items} codes={new Map(items.map((i) => [i.id, "R-1"]))} owner={() => "Owner"} kind="all" cell={null} href={() => "#"} add={() => {}} />);

describe("RiskRegisterView", () => {
  it("shows Open and Scored 15 or more, but Reviews due only when review dates exist", () => {
    const without = render([row({})]);
    expect(without).toContain("Scored 15 or more");
    expect(without).not.toContain("Reviews due");
    const withDates = render([row({ dueDate: "2020-01-01" })]);
    expect(withDates).toContain("Reviews due");
  });
  it("puts a band word on the score chip and links to the detail card", () => {
    const html = render([row({})]);
    expect(html).toContain("16 · High");
    expect(html).toContain("/app/risks/r1?project=p");
  });
});
