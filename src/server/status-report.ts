// Sends a status report after a project manager's click. The database marks it sent (once) and audits it.
import type { EmailSender } from "./email";

export type SentReport = { workspace_id: string; project_id: string; project_name: string; body_text: string; to_addresses: string[] };

export async function sendStatusReport(
  claim: () => Promise<SentReport>,
  sender: EmailSender,
  subject: (projectName: string) => string,
): Promise<void> {
  const r = await claim();
  await sender.send({ workspaceId: r.workspace_id, projectId: r.project_id, to: r.to_addresses, subject: subject(r.project_name), bodyText: r.body_text });
}
