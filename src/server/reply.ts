import type { ChannelAdapter } from "@/domain/channel";
import { isWiderAudience, replyBody } from "@/domain/reply";

type Deps = {
  adapter: ChannelAdapter<unknown>;
  message: { id: string; fromAddress: string; projectSlug: string };
  memberEmails: string[];
  link?: { title: string; url: string };
  text: string;
  confirmWider: boolean;
  audit: () => Promise<void>;
};

// Sends through the channel adapter, then audits. A reply to someone outside the project waits for a second click.
export async function replyToMessage(d: Deps): Promise<"sent" | "wider"> {
  if (!d.text.trim()) throw new Error("A reply needs some text");
  if (!d.adapter.canReply || !d.message.fromAddress) throw new Error("This message cannot be replied to");
  if (!d.confirmWider && isWiderAudience(d.message.fromAddress, d.memberEmails)) return "wider";
  await d.adapter.reply(d.message.projectSlug, replyBody(d.text, d.link), d.message.id);
  await d.audit();
  return "sent";
}
