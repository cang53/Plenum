import { describe, expect, it } from "vitest";
import { MAX_PAGES, PAGE_SIZE, afterFilter, decodeCursor, encodeCursor, pagesParam, toPage } from "./paging";

const c = { at: "2026-10-22T10:00:00.123456+00:00", id: "7" };

describe("paging", () => {
  it("round-trips a cursor and rejects junk", () => {
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify(["x", "1"])).toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify([c.at, "1),id.gt.0"])).toString("base64url"))).toBeNull();
  });
  it("builds a keyset filter", () => {
    expect(afterFilter("created_at", c)).toBe(`created_at.lt."${c.at}",and(created_at.eq."${c.at}",id.lt.7)`);
  });
  it("gives a next cursor only when more rows exist", () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({ at: c.at, id: String(i) }));
    const full = toPage(rows, (r) => r);
    expect(full.rows).toHaveLength(PAGE_SIZE);
    expect(decodeCursor(full.next!)?.id).toBe(String(PAGE_SIZE - 1));
    expect(toPage(rows.slice(0, PAGE_SIZE), (r) => r).next).toBeNull();
  });
});

describe("paging in place", () => {
  it("shows several pages at once and says whether there is more", () => {
    const rows = Array.from({ length: 101 }, (_, i) => ({ at: "2026-01-01T00:00:00Z", id: String(i) }));
    const page = toPage(rows, (r) => r, PAGE_SIZE * 2);
    expect(page.rows).toHaveLength(100);
    expect(page.next).not.toBeNull();
    expect(toPage(rows.slice(0, 100), (r) => r, PAGE_SIZE * 2).next).toBeNull();
  });
  it("reads the pages parameter safely", () => {
    expect([pagesParam(undefined), pagesParam("3"), pagesParam("0"), pagesParam("x"), pagesParam("999")]).toEqual([1, 3, 1, 1, MAX_PAGES]);
  });
});
