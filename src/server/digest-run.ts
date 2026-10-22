// Sends the daily digest through the email sender (the outbox stub until live SES exists).
import { buildDigest, type DigestRow } from "@/domain/digest";
import type { EmailSender } from "./email";

// Returns how many emails were sent. One failing email does not stop the others.
export async function sendDigests(
  load: () => Promise<DigestRow[]>,
  sender: EmailSender,
  onError: (e: unknown) => void = () => {},
): Promise<number> {
  let sent = 0;
  for (const row of await load()) {
    const mail = buildDigest(row);
    if (!mail) continue;
    try {
      await sender.send({ workspaceId: mail.workspaceId, projectId: mail.projectId, to: mail.to, subject: mail.subject, bodyText: mail.bodyText });
      sent++;
    } catch (e) {
      onError(e);
    }
  }
  return sent;
}

export function supabaseDigestRows(url: string, key: string): () => Promise<DigestRow[]> {
  return async () => {
    const res = await fetch(`${url}/rest/v1/rpc/daily_digests`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`digest query failed: ${res.status}`);
    return ((await res.json()) as Record<string, string>[]).map((r) => ({
      email: r.email, workspaceId: r.workspace_id, projectId: r.project_id, projectName: r.project_name,
      newSuggestions: r.new_suggestions as unknown as string[], dueTasks: r.due_tasks as unknown as string[],
    }));
  };
}
