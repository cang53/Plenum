import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, logError } from "@/lib/log";

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
