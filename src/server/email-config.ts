import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { outboxSender, sesSender, type EmailSender } from "./email";

// Chooses the sender from EMAIL_PROVIDER. "fake" (the default) writes to the outbox table; "ses" sends
// through AWS SES (needs AWS credentials) and records each outcome in the outbox.
export function emailSender(): EmailSender {
  const provider = process.env.EMAIL_PROVIDER ?? "fake";
  if (provider !== "fake" && provider !== "ses") throw new Error("EMAIL_PROVIDER must be fake or ses");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to write the outbox");
  const insert = async (row: Record<string, unknown>) => {
    const response = await fetch(`${url}/rest/v1/outbox`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(row),
    });
    if (!response.ok) throw new Error(`outbox insert failed: ${response.status} ${await response.text()}`);
  };
  if (provider === "fake") return outboxSender(insert);
  const from = process.env.SES_FROM_ADDRESS;
  if (!from) throw new Error("SES_FROM_ADDRESS is needed for EMAIL_PROVIDER=ses");
  const client = new SESv2Client({ region: process.env.AWS_REGION ?? "eu-west-1" });
  return sesSender(
    client,
    from,
    ({ from, email }) =>
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: email.to },
        Content: { Simple: { Subject: { Data: email.subject }, Body: { Text: { Data: email.bodyText } } } },
      }),
    insert,
  );
}
