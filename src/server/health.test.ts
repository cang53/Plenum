import { afterEach, describe, expect, it, vi } from "vitest";
import { checkHealth } from "@/server/health";

const env = { url: "https://db.example", key: "k" };
const answer = (status: number) => (async () => new Response(null, { status })) as typeof fetch;

describe("checkHealth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is up when the database answers", async () => {
    expect(await checkHealth(env, answer(200))).toMatchObject({ ok: true, database: "up" });
  });

  it("shows the last run of each background job", async () => {
    const rows = [{ job: "digest", last_run_at: "2026-10-22T06:00:00Z", ok: true }];
    const doFetch = (async () => Response.json(rows)) as typeof fetch;
    expect((await checkHealth(env, doFetch)).jobs).toEqual({ digest: { lastRun: "2026-10-22T06:00:00Z", ok: true } });
  });

  it("shows the last inbound time and the age of the oldest failed send", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00Z") });
    const doFetch = (async (url: string) =>
      Response.json(url.includes("messages?") ? [{ received_at: "2026-10-22T11:00:00Z" }] : url.includes("outbox?") ? [{ created_at: "2026-10-22T11:30:00Z" }] : [])) as typeof fetch;
    expect(await checkHealth(env, doFetch)).toMatchObject({ lastInboundAt: "2026-10-22T11:00:00Z", failedSendAgeMinutes: 30 });
    vi.useRealTimers();
  });

  it("is down on a server error, logging only the kind", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await checkHealth(env, answer(503))).toEqual({ ok: false, database: "down" });
    expect(spy).toHaveBeenCalledWith("health check failed: HttpStatus status=503");
  });

  it("is down when the request fails, without logging the message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = (async () => { throw new TypeError("secret host"); }) as typeof fetch;
    expect(await checkHealth(env, failing)).toEqual({ ok: false, database: "down" });
    expect(spy).toHaveBeenCalledWith("health check failed: TypeError");
  });

  it("says so when settings are missing", async () => {
    expect(await checkHealth({}, answer(200))).toEqual({ ok: false, database: "not configured" });
  });
});
