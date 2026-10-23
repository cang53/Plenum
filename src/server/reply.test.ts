import { describe, expect, it, vi } from "vitest";
import { emailAdapter, type ChannelAdapter } from "@/domain/channel";
import { replyToMessage } from "./reply";

const setup = (from: string) => {
  const send = vi.fn(async () => {});
  const audit = vi.fn(async () => {});
  const base = {
    adapter: emailAdapter("mail.test", send) as unknown as ChannelAdapter<unknown>,
    message: { id: "m1", fromAddress: from, projectSlug: "line4" },
    memberEmails: ["ann@site.com"],
    link: { title: "Fix gearbox", url: "https://x/items" },
    text: "On it",
    confirmWider: false,
    audit,
  };
  return { send, audit, base };
};

describe("replyToMessage", () => {
  it("sends with the link and audits", async () => {
    const { send, audit, base } = setup("ann@site.com");
    expect(await replyToMessage(base)).toBe("sent");
    expect(send).toHaveBeenCalledWith("line4", "On it\n\nFix gearbox: https://x/items", "m1");
    expect(audit).toHaveBeenCalledOnce();
  });
  it("holds a reply to someone outside the project until confirmed", async () => {
    const { send, audit, base } = setup("sup@vendor.com");
    expect(await replyToMessage(base)).toBe("wider");
    expect(send).not.toHaveBeenCalled();
    expect(await replyToMessage({ ...base, confirmWider: true })).toBe("sent");
    expect(audit).toHaveBeenCalledOnce();
  });
  it("refuses empty text and does not audit a failed send", async () => {
    const { audit, base } = setup("ann@site.com");
    await expect(replyToMessage({ ...base, text: "  " })).rejects.toThrow();
    const failing = { ...base, adapter: { ...base.adapter, reply: async () => { throw new Error("x"); } } };
    await expect(replyToMessage(failing)).rejects.toThrow();
    expect(audit).not.toHaveBeenCalled();
  });
});
