// Email sending behind one small interface. Only the local fake exists so far: it writes to the
// outbox table instead of delivering; sesSender delivers through AWS SES.
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

type SesLike = { send: (command: unknown) => Promise<unknown> };

// Sends through AWS SES. Retries a failed send, then records the outcome (sent or failed) in the outbox.
export function sesSender(
  client: SesLike,
  from: string,
  makeCommand: (input: { from: string; email: OutgoingEmail }) => unknown,
  insertRow: (row: Record<string, unknown>) => Promise<void>,
  { attempts = 3, wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = {},
): EmailSender {
  return {
    async send(email) {
      if (email.to.length === 0) throw new Error("An email needs at least one recipient");
      let error: unknown;
      for (let i = 0; i < attempts; i++) {
        if (i > 0) await wait(500 * 2 ** (i - 1));
        try {
          await client.send(makeCommand({ from, email }));
          error = undefined;
          break;
        } catch (e) {
          error = e;
        }
      }
      await insertRow({
        workspace_id: email.workspaceId,
        project_id: email.projectId ?? null,
        to_addresses: email.to,
        subject: email.subject,
        body_text: email.bodyText,
        status: error ? "failed" : "sent",
        error: error ? String(error instanceof Error ? error.message : error) : null,
      });
      if (error) throw error;
    },
  };
}
