import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeTeamsPoster, personMessages, readTeamsChannels, teamsChannels, teamsPoster, teamsReaderFromEnv, webhookTeamsPoster, type TeamsPoster } from "./teams";

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

  it("rejects a mistyped flag", () => {
    process.env.TEAMS_PROVIDER = "lve";
    expect(() => teamsPoster()).toThrow("fake or live");
  });

  it("is the webhook poster when live", () => {
    process.env.TEAMS_PROVIDER = "live";
    expect(teamsPoster()).not.toHaveProperty("posted");
  });
});

describe("teamsChannels", () => {
  it("reads the map, and refuses bad JSON", () => {
    expect(teamsChannels('{"a":{"channel":"c"}}')).toEqual({ a: { channel: "c" } });
    expect(teamsChannels(undefined)).toEqual({});
    expect(() => teamsChannels("[1]")).toThrow("TEAMS_CHANNELS");
    expect(() => teamsChannels("nope")).toThrow("TEAMS_CHANNELS");
  });
});

describe("webhook poster", () => {
  const channels = { line4: { channel: "c", webhook: "https://hook.example/x" } };
  const ok = () => vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 202 }));

  it("posts a card to the project's webhook", async () => {
    const f = ok();
    await webhookTeamsPoster(channels, f as unknown as typeof fetch).post({ projectSlug: "line4", kind: "message", text: "Hi" });
    expect(f).toHaveBeenCalledOnce();
    expect(String(f.mock.calls[0]![1].body)).toContain('"text":"Hi"');
  });

  it("skips a project with no webhook, and fails on a webhook error", async () => {
    const f = ok();
    await webhookTeamsPoster(channels, f as unknown as typeof fetch).post({ projectSlug: "other", kind: "message", text: "Hi" });
    expect(f).not.toHaveBeenCalled();
    const bad = vi.fn(async () => new Response(null, { status: 400 }));
    await expect(webhookTeamsPoster(channels, bad).post({ projectSlug: "line4", kind: "message", text: "Hi" })).rejects.toThrow("400");
  });
});

describe("reading Teams", () => {
  const msg = (id: string, over = {}) => ({ id, messageType: "message", createdDateTime: "2026-10-27T10:00:00Z", body: { contentType: "html", content: "<p>Hi &amp; bye</p>" }, from: { user: { id: "u1", displayName: "Jan" } }, ...over });

  it("keeps only typed posts by people, as plain text", () => {
    const out = personMessages([msg("1"), msg("2", { from: { application: {}, user: null } }), msg("3", { messageType: "systemEventMessage" }), msg("4", { deletedDateTime: "x" }), msg("5", { body: { contentType: "text", content: " " } })]);
    expect(out).toEqual([{ externalId: "teams:1", fromName: "Jan", fromId: "u1", subject: "", bodyText: "Hi & bye", sentAt: "2026-10-27T10:00:00Z" }]);
  });

  it("reads each mapped channel and stores what people wrote", async () => {
    const calls: string[] = [];
    const f = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      calls.push(u);
      if (u.includes("oauth2")) return Response.json({ access_token: "t" });
      if (u.includes("graph.microsoft.com")) return Response.json({ value: [msg("1")] });
      return Response.json("id");
    }) as unknown as typeof fetch;
    const env = { teamId: "T", tenantId: "X", clientId: "a", clientSecret: "b", supabaseUrl: "https://db.example", serviceRoleKey: "k", channels: { line4: { channel: "19:c@thread.tacv2" } } };
    expect(await readTeamsChannels(env, f)).toBe(1);
    expect(calls.some((u) => u.includes("/teams/T/channels/19%3Ac%40thread.tacv2/messages"))).toBe(true);
    expect(calls.at(-1)).toBe("https://db.example/rest/v1/rpc/ingest_teams");
  });

  it("does nothing without mapped channels, and reports a failing channel without stopping", async () => {
    const f = vi.fn() as unknown as typeof fetch;
    expect(await readTeamsChannels({ teamId: "T", tenantId: "X", clientId: "a", clientSecret: "b", supabaseUrl: "u", serviceRoleKey: "k", channels: {} }, f)).toBe(0);
    expect(f).not.toHaveBeenCalled();
    const onError = vi.fn();
    const g = vi.fn(async (url: string | URL | Request) => (String(url).includes("oauth2") ? Response.json({ access_token: "t" }) : new Response(null, { status: 403 }))) as unknown as typeof fetch;
    expect(await readTeamsChannels({ teamId: "T", tenantId: "X", clientId: "a", clientSecret: "b", supabaseUrl: "u", serviceRoleKey: "k", channels: { a: { channel: "c" } } }, g, onError)).toBe(0);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("has a reader only when live and fully configured", () => {
    expect(teamsReaderFromEnv({})).toBeUndefined();
    expect(teamsReaderFromEnv({ TEAMS_PROVIDER: "live" })).toBeUndefined();
  });
});
