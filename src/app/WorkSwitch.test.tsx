import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { WorkSwitch } from "./WorkSwitch";

describe("WorkSwitch", () => {
  const html = renderToStaticMarkup(<WorkSwitch current="board" projectId="p1" t={(k) => t(k, "en")} />);
  it("links the work views for the project and marks the current one", () => {
    expect(html).toContain('href="/app/timeline?project=p1"');
    expect(html).toContain('href="/app/items?project=p1"');
    expect(html).toMatch(/href="\/app\/board\?project=p1" aria-current="page"/);
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });
  it("is a labelled navigation landmark", () => {
    expect(html).toMatch(/<nav[^>]*aria-label=/);
  });
});
