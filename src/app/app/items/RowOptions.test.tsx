import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RowOptions } from "./RowOptions";

const t = (k: string) => k;

describe("RowOptions", () => {
  it("always offers Open and offers Edit only with an edit link", () => {
    const manager = renderToStaticMarkup(<RowOptions t={t} title="Pour slab" openHref="/o" editHref="/e" />);
    expect(manager).toContain('href="/o"');
    expect(manager).toContain('href="/e"');
    const reader = renderToStaticMarkup(<RowOptions t={t} title="Pour slab" openHref="/o" />);
    expect(reader).toContain('href="/o"');
    expect(reader).not.toContain("items.rowEdit");
  });
});
