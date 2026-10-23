import { afterEach, describe, expect, it } from "vitest";
import { buildCsp, cspHeaderName } from "./csp";

afterEach(() => {
  delete process.env.CSP_MODE;
});

describe("csp", () => {
  it("allows scripts only with the nonce and blocks plugins and framing", () => {
    const csp = buildCsp("abc");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("allows eval only in dev", () => {
    expect(buildCsp("n")).not.toContain("unsafe-eval");
    expect(buildCsp("n", true)).toContain("unsafe-eval");
  });

  it("is report-only until enforce is set", () => {
    expect(cspHeaderName()).toBe("Content-Security-Policy-Report-Only");
    process.env.CSP_MODE = "enforce";
    expect(cspHeaderName()).toBe("Content-Security-Policy");
  });
});
