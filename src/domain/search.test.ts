import { describe, expect, it } from "vitest";
import { plainSnippet, searchHref } from "@/domain/search";

describe("search helpers", () => {
  it("links to the items page of the project", () => {
    expect(searchHref("p1")).toBe("/app/items?project=p1");
  });
  it("removes match markers from snippets", () => {
    expect(plainSnippet("the <b>crane</b> arrives")).toBe("the crane arrives");
  });
});
