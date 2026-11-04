import { describe, expect, it } from "vitest";
import { findSimilar } from "./riskSimilar";

const subject = { title: "Supplier lead time slips past install date", details: "Panel supplier quoted 6 weeks" };

describe("findSimilar", () => {
  it("ranks items that share words and drops unrelated ones", () => {
    const out = findSimilar(subject, [
      { id: "a", title: "Panel supplier delivery delayed 5 weeks", details: "" },
      { id: "b", title: "Supplier lead time too long for install", details: "" },
      { id: "c", title: "Budget overrun on cabling", details: "" },
    ]);
    expect(out.map((o) => o.id)).toEqual(["b", "a"]);
  });
  it("returns nothing when nothing matches or the subject has no words", () => {
    expect(findSimilar(subject, [{ id: "c", title: "Budget overrun on cabling", details: "" }])).toEqual([]);
    expect(findSimilar({ title: "a b", details: "" }, [{ id: "x", title: "a b", details: "" }])).toEqual([]);
  });
});
