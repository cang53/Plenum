import { describe, expect, it, vi } from "vitest";
import { reportError, scrubError } from "@/lib/error-sink";

const secret = new Error("secret email body");

describe("scrubError", () => {
  it("keeps kind and frames, never the message", () => {
    const event = scrubError("triage failed", Object.assign(secret, { code: "23505" }));
    expect(JSON.stringify(event)).not.toContain("secret");
    expect(event.kind).toBe("Error code=23505");
    expect(event.frames.length).toBeGreaterThan(0);
  });
});

describe("reportError", () => {
  it("does nothing when off", async () => {
    const send = vi.fn();
    await reportError("x", secret, {}, send as never);
    expect(send).not.toHaveBeenCalled();
  });

  it("logs a scrubbed line", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await reportError("x", secret, { ERROR_SINK: "log" });
    expect(spy.mock.calls[0][0]).not.toContain("secret");
    spy.mockRestore();
  });

  it("posts a scrubbed envelope to a Sentry-compatible DSN", async () => {
    const send = vi.fn().mockResolvedValue(new Response());
    await reportError("x", secret, { ERROR_SINK: "sentry", ERROR_SINK_DSN: "https://abc@sentry.example/42" }, send);
    const [url, init] = send.mock.calls[0];
    expect(url).toBe("https://sentry.example/api/42/envelope/?sentry_key=abc&sentry_version=7");
    expect(init.body).not.toContain("secret");
  });

  it("swallows sink failures", async () => {
    const send = vi.fn().mockRejectedValue(new Error("down"));
    await expect(reportError("x", secret, { ERROR_SINK: "sentry", ERROR_SINK_DSN: "https://a@h/1" }, send)).resolves.toBeUndefined();
  });
});
