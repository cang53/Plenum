import { outboxSender, type EmailSender } from "./email";

// Chooses the sender from EMAIL_PROVIDER. "fake" (the default) writes to the outbox table.
export function emailSender(): EmailSender {
  if ((process.env.EMAIL_PROVIDER ?? "fake") !== "fake") throw new Error("Only EMAIL_PROVIDER=fake exists so far");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to write the outbox");
  return outboxSender(async (row) => {
    const response = await fetch(`${url}/rest/v1/outbox`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(row),
    });
    if (!response.ok) throw new Error(`outbox insert failed: ${response.status} ${await response.text()}`);
  });
}
