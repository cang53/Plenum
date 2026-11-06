import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SourceFilter } from "./SourceFilter";

describe("SourceFilter", () => {
  it("renders All first, then each source, with no counts", () => {
    const html = renderToStaticMarkup(<SourceFilter label="Filter by source" allLabel="All" options={[{ value: "email", label: "Email" }, { value: "app", label: "Plenum" }]} />);
    expect(html).toMatch(/All.*Email.*Plenum/);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toMatch(/\d/);
  });
});
