import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResourceForm } from "./ResourceForm";

const labels = { file: "Schedule file", preview: "Preview", apply: "Apply", assign: "Owners to set", unchanged: "Same", skipped: "Skipped", unmatched: "Not matched", skip: "Skip", done: "Done" };

describe("ResourceForm", () => {
  it("offers a labelled file field and a preview button, and no apply until a preview exists", () => {
    const html = renderToStaticMarkup(<ResourceForm projectId="p1" people={[]} labels={labels} errors={{}} />);
    expect(html).toMatch(/<label>Schedule file <input[^>]*type="file"[^>]*name="plan"/);
    expect(html).toMatch(/type="submit"[^>]*>Preview/);
    expect(html).not.toContain("Apply");
  });
});
