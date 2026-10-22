import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { securityHeaders } from "./security-headers";

describe("security headers", () => {
  it("applies the set to every route", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toEqual([{ source: "/(.*)", headers: securityHeaders }]);
  });

  it("forbids framing and content sniffing", () => {
    const map = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
  });
});
