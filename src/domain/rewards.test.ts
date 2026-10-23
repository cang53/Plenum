import { describe, expect, it } from "vitest";
import { rewardsOn, switchList } from "./rewards";

describe("rewardsOn", () => {
  it("is on with no switches", () => expect(rewardsOn([], "North")).toBe(true));
  it("is off for a listed site only", () => {
    expect(rewardsOn(["North"], "North")).toBe(false);
    expect(rewardsOn(["North"], "South")).toBe(true);
  });
  it("is off everywhere for the empty site", () => expect(rewardsOn([""], "South")).toBe(false));
});

describe("switchList", () => {
  it("trims, drops blanks and duplicates", () => expect(switchList(false, " North\n\nNorth\nSouth ")).toEqual(["North", "South"]));
  it("adds the everywhere switch", () => expect(switchList(true, "")).toEqual([""]));
  it("drops names over 80 characters", () => expect(switchList(false, "x".repeat(81))).toEqual([]));
});
