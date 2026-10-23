import { describe, expect, it } from "vitest";
import { isWiderAudience, replyBody, replySubject } from "./reply";

describe("reply", () => {
  it("flags a sender outside the project, ignoring case", () => {
    expect(isWiderAudience("Ann@Site.com", ["ann@site.com"])).toBe(false);
    expect(isWiderAudience("sup@vendor.com", ["ann@site.com"])).toBe(true);
  });
  it("adds Re: once", () => {
    expect(replySubject("Gearbox")).toBe("Re: Gearbox");
    expect(replySubject("RE: Gearbox")).toBe("RE: Gearbox");
    expect(replySubject(null)).toBe("Re: (no subject)");
  });
  it("appends the linked item as a link", () => {
    expect(replyBody(" Ok ", { title: "Fix gearbox", url: "https://x/y" })).toBe("Ok\n\nFix gearbox: https://x/y");
    expect(replyBody("Ok")).toBe("Ok");
  });
});
