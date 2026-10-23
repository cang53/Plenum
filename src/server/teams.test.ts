import { afterEach, describe, expect, it } from "vitest";
import { fakeTeamsPoster, teamsPoster, type TeamsPoster } from "./teams";

// Any poster (fake now, live later) must pass this.
function posterContract(name: string, make: () => TeamsPoster) {
  describe(`${name} poster contract`, () => {
    it("accepts a celebration and a channel message", async () => {
      const p = make();
      await p.post({ projectSlug: "line4", kind: "celebration", text: "Milestone reached" });
      await p.post({ projectSlug: "line4", kind: "message", text: "Thanks", inReplyTo: "m1" });
    });

    it("refuses a post with no project or no text", async () => {
      await expect(make().post({ projectSlug: " ", kind: "message", text: "Hi" })).rejects.toThrow();
      await expect(make().post({ projectSlug: "line4", kind: "message", text: "" })).rejects.toThrow();
    });
  });
}

posterContract("fake", fakeTeamsPoster);

describe("fake Teams poster", () => {
  it("keeps what was posted, in order", async () => {
    const p = fakeTeamsPoster();
    await p.post({ projectSlug: "a", kind: "celebration", text: "One" });
    await p.post({ projectSlug: "a", kind: "message", text: "Two" });
    expect(p.posted.map((x) => x.text)).toEqual(["One", "Two"]);
  });
});

describe("teamsPoster", () => {
  afterEach(() => delete process.env.TEAMS_PROVIDER);

  it("is the fake by default", () => {
    expect(teamsPoster()).toHaveProperty("posted");
  });

  it("rejects a mistyped flag and the unbuilt live mode", () => {
    process.env.TEAMS_PROVIDER = "lve";
    expect(() => teamsPoster()).toThrow("fake or live");
    process.env.TEAMS_PROVIDER = "live";
    expect(() => teamsPoster()).toThrow("not built");
  });
});
