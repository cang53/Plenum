// Triage one stored message and save the suggestion. Runs offline by default (rule-based fake);
// AI_PROVIDER=bedrock switches to the model. Never creates an item: a person still decides.
import { bedrockAsk, suggestFor, type Ask } from "./triage";
import { ruleBasedAsk } from "./triage-fake";
import type { TimelineMessage } from "@/domain/timeline";
import type { Suggestion } from "@/domain/triage";

export function aiAsk(env: Record<string, string | undefined> = process.env): Ask {
  return env.AI_PROVIDER === "bedrock" ? bedrockAsk(env) : ruleBasedAsk;
}

export type TriageIo = {
  load: (messageId: string) => Promise<{ projectId: string; message: TimelineMessage } | null>;
  save: (row: { project_id: string; message_id: string } & Suggestion) => Promise<void>;
};

// Returns true when a suggestion was saved. A message that already has one is left alone.
export async function triageMessage(messageId: string, io: TriageIo, ask: Ask): Promise<boolean> {
  const found = await io.load(messageId);
  if (!found) return false;
  const suggestion = await suggestFor(found.message, ask);
  if (!suggestion) return false;
  await io.save({ project_id: found.projectId, message_id: messageId, ...suggestion });
  return true;
}

export function supabaseTriageIo(url: string, serviceRoleKey: string): TriageIo {
  const headers = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" };
  return {
    async load(messageId) {
      const res = await fetch(
        `${url}/rest/v1/messages?id=eq.${encodeURIComponent(messageId)}&select=id,project_id,from_name,from_address,subject,body_text,received_at`,
        { headers },
      );
      if (!res.ok) throw new Error(`load message failed: ${res.status}`);
      const [row] = (await res.json()) as Record<string, string>[];
      if (!row) return null;
      return {
        projectId: row.project_id,
        message: {
          id: row.id, source: "email", fromName: row.from_name, fromAddress: row.from_address,
          subject: row.subject, bodyText: row.body_text, receivedAt: row.received_at, attachments: [],
        },
      };
    },
    async save(row) {
      const res = await fetch(`${url}/rest/v1/suggestions?on_conflict=message_id`, {
        method: "POST",
        headers: { ...headers, prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`save suggestion failed: ${res.status}`);
    },
  };
}
