import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("starts hidden and keeps the project and source in the form", () => {
    const html = renderToStaticMarkup(<SearchBar action="/app/stream" projectId="p1" source="email" q="plan" label="Search messages" />);
    expect(html).toContain("hidden");
    expect(html).toContain('name="project" value="p1"');
    expect(html).toContain('name="source" value="email"');
    expect(html).toContain('name="q"');
  });
});
