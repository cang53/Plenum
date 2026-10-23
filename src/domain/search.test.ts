import { describe, expect, it } from "vitest";
import { searchHref, snippetParts } from "@/domain/search";

describe("search helpers", () => {
  it("links to the items page of the project", () => {
    expect(searchHref("p1")).toBe("/app/items?project=p1");
    expect(searchHref("p1", "message")).toBe("/app/timeline?project=p1");
  });
  it("splits a snippet into plain and matched parts", () => {
    expect(snippetParts("the \u0002crane\u0003 arrives")).toEqual([
      { text: "the ", match: false },
      { text: "crane", match: true },
      { text: " arrives", match: false },
    ]);
    expect(snippetParts("<b>x</b>")).toEqual([{ text: "<b>x</b>", match: false }]);
  });
});
