"use server";

import { supabaseServer } from "@/auth/supabase";
import { acceptSuggestion, dismissSuggestion } from "@/data/live";
import { headers } from "next/headers";
import { listMembers } from "@/data/projects";
import { emailAdapter, type ChannelAdapter } from "@/domain/channel";
import type { ItemDraft } from "@/domain/linking";
import { replySubject } from "@/domain/reply";
import { emailSender } from "@/server/email-config";
import { replyToMessage } from "@/server/reply";
import { isLocale } from "@/lib/messages";
import { inboundConfig } from "@/server/inbound-config";
import { translateMessage } from "@/server/translate";
import { aiAsk, supabaseTriageIo } from "@/server/triage-run";

export async function acceptSuggestionAction(id: string, draft: ItemDraft): Promise<void> {
  await acceptSuggestion(await supabaseServer(), id, draft);
}

export async function dismissSuggestionAction(id: string): Promise<void> {
  await dismissSuggestion(await supabaseServer(), id);
}

// Returns "wider" when the sender is outside the project and the person has not confirmed yet.
export async function replyAction(messageId: string, text: string, confirmWider: boolean): Promise<"sent" | "wider"> {
  const supabase = await supabaseServer();
  const { data: m } = await supabase
    .from("messages").select("id, project_id, from_address, subject, projects(workspace_id, email_slug)").eq("id", messageId).single();
  if (!m) throw new Error("message not found");
  const project = m.projects as unknown as { workspace_id: string; email_slug: string };
  const members = await listMembers(supabase, m.project_id);
  const { data: item } = await supabase.from("tasks").select("title").eq("source_message_id", messageId).limit(1);
  const origin = (await headers()).get("origin") ?? "";
  const sender = emailSender();
  const adapter = emailAdapter(process.env.INBOUND_EMAIL_DOMAIN ?? "", (_slug, body) =>
    sender.send({ workspaceId: project.workspace_id, projectId: m.project_id, to: [m.from_address], subject: replySubject(m.subject), bodyText: body }),
  );
  return replyToMessage({
    adapter: adapter as unknown as ChannelAdapter<unknown>,
    message: { id: m.id, fromAddress: m.from_address, projectSlug: project.email_slug },
    memberEmails: members.map((x) => x.email),
    link: item?.[0] ? { title: item[0].title, url: `${origin}/app/items?project=${m.project_id}` } : undefined,
    text,
    confirmWider,
    audit: async () => {
      const { error } = await supabase.rpc("audit_reply", { p_message: messageId });
      if (error) throw error;
    },
  });
}

// Display only: nothing is saved. Null means "keep showing the original".
export async function translateMessageAction(messageId: string, language: string): Promise<string | null> {
  const config = inboundConfig();
  if (!config || !isLocale(language)) return null;
  const supabase = await supabaseServer();
  return translateMessage(
    messageId,
    language,
    {
      async load(id) {
        const { data } = await supabase.from("messages").select("project_id, subject, body_text").eq("id", id).maybeSingle();
        return data ? { projectId: data.project_id, subject: data.subject ?? "", body: data.body_text ?? "" } : null;
      },
      takeCall: supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey).takeCall,
    },
    aiAsk(),
  );
}
