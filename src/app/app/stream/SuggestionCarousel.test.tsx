import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SuggestionCarousel } from "./SuggestionCarousel";

describe("SuggestionCarousel", () => {
  const html = renderToStaticMarkup(<SuggestionCarousel prev="Prev" next="Next">{[<p key="a">A</p>, <p key="b">B</p>, <p key="c">C</p>]}</SuggestionCarousel>);
  it("starts on the first suggestion and counts them", () => {
    expect(html).toContain("1 / 3");
    expect(html.match(/data-pos="after"/g)).toHaveLength(2);
  });
  it("disables the left arrow on the first one", () => {
    expect(html).toMatch(/aria-label="Prev" disabled=""/);
  });
});
