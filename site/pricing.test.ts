import { describe, expect, it } from "vitest";
import { MIN_SEATS, formatEuro, teamPrice } from "./src/assets/pricing.mjs";
import { parsePage, render } from "./build.mjs";

describe("team price", () => {
  it("charges 15 euros per paid seat per month, billed yearly", () => {
    expect(teamPrice(10)).toEqual({ seats: 10, monthly: 150, yearly: 1800 });
  });

  it("never goes below the five-seat minimum", () => {
    expect(teamPrice(2).seats).toBe(MIN_SEATS);
    expect(teamPrice(0).monthly).toBe(75);
    expect(teamPrice("abc").seats).toBe(MIN_SEATS);
  });

  it("formats euros with thousands separators", () => {
    expect(formatEuro(1800)).toBe("€1,800");
    expect(formatEuro(75)).toBe("€75");
  });
});

describe("site build", () => {
  const partials = {
    layout: "<title>{{title}}</title>{{header}}{{main}}{{footer}}",
    header: '<a data-nav="pricing">Pricing</a>',
    footer: "<footer></footer>",
  };

  it("fills the layout and marks the current page in the nav", () => {
    const page = parsePage("---\ntitle: Pricing\ndescription: d\nnav: pricing\n---\n<h1>Hi</h1>");
    const html = render(page, partials);
    expect(html).toContain("<title>Pricing · Plenum</title>");
    expect(html).toContain('data-nav="pricing" aria-current="page"');
    expect(html).toContain("<h1>Hi</h1>");
  });

  it("rejects a page without front matter", () => {
    expect(() => parsePage("<h1>No meta</h1>")).toThrow();
  });
});
