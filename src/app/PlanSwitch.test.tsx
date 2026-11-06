import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { PlanSwitch } from "./PlanSwitch";

describe("PlanSwitch", () => {
  it("links Gantt and Timelines and marks the current one", () => {
    const html = renderToStaticMarkup(<PlanSwitch current="timelines" projectId="p1" t={(k) => t(k, "en")} />);
    expect(html).toContain('href="/app/gantt?project=p1"');
    expect(html).toMatch(/href="\/app\/timelines\?project=p1" aria-current="page"/);
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });
});
