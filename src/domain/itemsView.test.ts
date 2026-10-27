import { describe, expect, it } from "vitest";
import { matchesQuick, parseColumns, parseQuick, quickCounts } from "./itemsView";

const today = "2026-10-23"; // a Friday; the week is 19 to 25 October
const r = (status: string, dueDate: string | null, ownerId: string | null = null) => ({ status, dueDate, ownerId });

describe("matchesQuick", () => {
  it("all keeps everything", () => expect(matchesQuick(r("done", null), "all", null, today)).toBe(true));
  it("mine needs a signed-in owner match", () => {
    expect(matchesQuick(r("todo", null, "u1"), "mine", "u1", today)).toBe(true);
    expect(matchesQuick(r("todo", null, "u2"), "mine", "u1", today)).toBe(false);
    expect(matchesQuick(r("todo", null, null), "mine", null, today)).toBe(false);
  });
  it("at risk is blocked or open and late, never done", () => {
    expect(matchesQuick(r("blocked", null), "at_risk", null, today)).toBe(true);
    expect(matchesQuick(r("todo", "2026-10-22"), "at_risk", null, today)).toBe(true);
    expect(matchesQuick(r("done", "2026-10-22"), "at_risk", null, today)).toBe(false);
    expect(matchesQuick(r("todo", "2026-10-23"), "at_risk", null, today)).toBe(false);
  });
  it("blocked matches blocked only", () => {
    expect(matchesQuick(r("blocked", null), "blocked", null, today)).toBe(true);
    expect(matchesQuick(r("todo", "2026-01-01"), "blocked", null, today)).toBe(false);
  });
  it("week is Monday to Sunday and open only", () => {
    for (const [d, ok] of [["2026-10-19", true], ["2026-10-25", true], ["2026-10-18", false], ["2026-10-26", false]] as const) expect(matchesQuick(r("todo", d), "week", null, today)).toBe(ok);
    expect(matchesQuick(r("done", "2026-10-20"), "week", null, today)).toBe(false);
    expect(matchesQuick(r("todo", null), "week", null, today)).toBe(false);
  });
});

describe("params", () => {
  it("falls back to all on unknown filters", () => expect(parseQuick("x")).toBe("all"));
  it("columns default, then follow the list and ignore unknown names", () => {
    expect(parseColumns(undefined)).toEqual(["phase", "owner", "priority", "due"]);
    expect(parseColumns(["site", "bogus", "priority"])).toEqual(["priority", "site"]);
    expect(parseColumns("-")).toEqual([]);
  });
});

describe("quickCounts", () => {
  it("counts every task per filter", () => {
    const c = quickCounts([r("blocked", "2026-10-30", "u1"), r("todo", "2026-10-20", "u1"), r("done", "2026-10-20")], "u1", today);
    expect(c).toEqual({ all: 3, mine: 2, at_risk: 2, blocked: 1, week: 1 });
  });
});
