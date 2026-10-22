// Triage one stored message and save the suggestion. Runs offline by default (rule-based fake);
// AI_PROVIDER=bedrock switches to the model. Never creates an item: a person still decides.
import { logError } from "@/lib/log";
import { bedrockAsk, suggestFor, type Ask } from "./triage";
import { ruleBasedAsk } from "./triage-fake";
import type { TimelineMessage } from "@/domain/timeline";
import type { Suggestion } from "@/domain/triage";

export function aiAsk(env: Record<string, string | undefined> = process.env): Ask {
  if (env.AI_PROVIDER !== "bedrock") return ruleBasedAsk;
  try {
    return bedrockAsk(env);
  } catch (error) {
    logError("Bedrock not usable, using rules", error);
    return ruleBasedAsk;
  }
}

export type TriageIo = {
  load: (messageId: string) => Promise<{ projectId: string; message: TimelineMessage } | null>;
  // False when the workspace has used up today's model calls.
  takeCall: (projectId: string) => Promise<boolean>;
  save: (row: { project_id: string; message_id: string } & Suggestion) => Promise<void>;
};

// attachmentText is added to what triage reads, not to the stored message.
// Returns true when a suggestion was saved. A message that already has one is left alone.
// When Bedrock is over the daily cap, slow, down or answers badly, the offline rules answer instead.
export async function triageMessage(messageId: string, io: TriageIo, ask: Ask, attachmentText = ""): Promise<boolean> {
  const found = await io.load(messageId);
  if (!found) return false;
  const message = attachmentText ? { ...found.message, bodyText: `${found.message.bodyText}\n\n${attachmentText}` } : found.message;
  let suggestion;
  if (ask === ruleBasedAsk || !(await io.takeCall(found.projectId))) {
    suggestion = await suggestFor(message, ruleBasedAsk);
  } else {
    try {
      suggestion = await suggestFor(message, ask);
    } catch (error) {
      logError("Bedrock failed, using rules", error);
      suggestion = await suggestFor(message, ruleBasedAsk);
    }
  }
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
    async takeCall(projectId) {
      const res = await fetch(`${url}/rest/v1/rpc/take_ai_call`, {
        method: "POST",
        headers,
        body: JSON.stringify({ p: projectId, cap: Number(process.env.AI_DAILY_CALL_CAP ?? 200) }),
      });
      if (!res.ok) throw new Error(`call cap check failed: ${res.status}`);
      return (await res.json()) === true;
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
