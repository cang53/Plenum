import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then refuses until the window ends", () => {
    let t = 0;
    const allow = createRateLimiter(2, 1000, () => t);
    expect([allow("a"), allow("a"), allow("a")]).toEqual([true, true, false]);
    expect(allow("b")).toBe(true);
    t = 1000;
    expect(allow("a")).toBe(true);
  });
});

describe("clientKey", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientKey(request)).toBe("1.2.3.4");
    expect(clientKey(new Request("http://x"))).toBe("unknown");
  });
});
