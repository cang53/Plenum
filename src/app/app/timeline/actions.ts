"use server";

import { supabaseServer } from "@/auth/supabase";
import { acceptSuggestion, dismissSuggestion } from "@/data/live";
import type { ItemDraft } from "@/domain/linking";
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
