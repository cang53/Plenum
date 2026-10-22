"use server";

import { supabaseServer } from "@/auth/supabase";
import { acceptSuggestion, dismissSuggestion } from "@/data/live";
import type { ItemDraft } from "@/domain/linking";

export async function acceptSuggestionAction(id: string, draft: ItemDraft): Promise<void> {
  await acceptSuggestion(await supabaseServer(), id, draft);
}

export async function dismissSuggestionAction(id: string): Promise<void> {
  await dismissSuggestion(await supabaseServer(), id);
}
