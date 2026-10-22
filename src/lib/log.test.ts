import { afterEach, describe, expect, it, vi } from "vitest";
import { countEvent, describeError, logError, logEvent, requestId } from "@/lib/log";

describe("describeError", () => {
  it("keeps the kind and codes, never the message", () => {
    const error = Object.assign(new TypeError("secret email body"), { code: "23505", status: 500 });
    expect(describeError(error)).toBe("TypeError code=23505 status=500");
  });

  it("copes with values that are not errors", () => {
    expect(describeError("secret text")).toBe("string");
    expect(describeError(undefined)).toBe("undefined");
  });
});

describe("logError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one line without the message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("triage failed", new Error("secret email body"));
    expect(spy).toHaveBeenCalledWith("triage failed: Error");
  });
});

describe("logEvent and countEvent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one JSON line", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logEvent("inbound_skipped", { requestId: "r1", reason: "virus found" });
    expect(JSON.parse(spy.mock.calls[0][0])).toMatchObject({ event: "inbound_skipped", requestId: "r1", reason: "virus found" });
  });

  it("counts by name only", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    countEvent("send_failure", { attempt: 2 });
    expect(JSON.parse(spy.mock.calls[0][0])).toMatchObject({ event: "count", name: "send_failure", n: 1, attempt: 2 });
  });
});

describe("requestId", () => {
  it("reuses a sane header and otherwise makes an id", () => {
    expect(requestId(new Request("http://x", { headers: { "x-request-id": "abc-1" } }))).toBe("abc-1");
    expect(requestId(new Request("http://x", { headers: { "x-request-id": "bad id\n" } }))).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestId(new Request("http://x"))).toMatch(/^[0-9a-f-]{36}$/);
  });
});
