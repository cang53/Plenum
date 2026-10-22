// Email sending behind one small interface. Only the local fake exists so far: it writes to the
// outbox table instead of delivering. Live SES (backlog task 12) will be a second implementation.
export type OutgoingEmail = {
  workspaceId: string;
  projectId?: string;
  to: string[];
  subject: string;
  bodyText: string;
};

export type EmailSender = { send: (email: OutgoingEmail) => Promise<void> };

export function outboxSender(insertRow: (row: Record<string, unknown>) => Promise<void>): EmailSender {
  return {
    async send(email) {
      if (email.to.length === 0) throw new Error("An email needs at least one recipient");
      await insertRow({
        workspace_id: email.workspaceId,
        project_id: email.projectId ?? null,
        to_addresses: email.to,
        subject: email.subject,
        body_text: email.bodyText,
      });
    },
  };
}
