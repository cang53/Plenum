import { describe, expect, it } from "vitest";
import { inviteEmail, inviteExpiry, inviteFromForm, isExpired } from "./invitations";

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());

describe("inviteFromForm", () => {
  it("lowercases the address and defaults the role to member", () => {
    expect(inviteFromForm(form({ email: " Jan@Example.COM " }))).toEqual({ email: "jan@example.com", role: "member" });
  });
  it("refuses a bad address or unknown role", () => {
    expect(() => inviteFromForm(form({ email: "jan" }))).toThrow();
    expect(() => inviteFromForm(form({ email: "a@b.co", role: "owner" }))).toThrow();
  });
});

describe("inviteEmail", () => {
  it("names the project, role and sign-in link", () => {
    const e = inviteEmail("Line 4", "member", "https://x/login");
    expect(e.subject).toContain("Line 4");
    expect(e.bodyText).toContain("https://x/login");
  });
});

describe("expiry", () => {
  const now = new Date("2026-10-22T00:00:00Z");
  it("expires 14 days after sending", () => {
    expect(inviteExpiry(now)).toBe("2026-11-05T00:00:00.000Z");
  });
  it("tells open from expired invitations", () => {
    expect(isExpired("2026-10-21T00:00:00Z", now)).toBe(true);
    expect(isExpired("2026-10-23T00:00:00Z", now)).toBe(false);
  });
});
