import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportForm } from "./ImportForm";

const labels = { file: "Schedule file", preview: "Preview", apply: "Apply", created: "Create", refreshed: "Refresh", unchanged: "Same", done: "Done" };

describe("ImportForm", () => {
  it("offers a labelled file field and a preview button, and no apply until a preview exists", () => {
    const html = renderToStaticMarkup(<ImportForm projectId="p1" labels={labels} errors={{}} />);
    expect(html).toMatch(/<label>Schedule file <input[^>]*type="file"[^>]*name="plan"/);
    expect(html).toMatch(/type="submit"[^>]*>Preview/);
    expect(html).not.toContain("Apply");
  });
});
