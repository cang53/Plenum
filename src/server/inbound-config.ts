import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { InboundDeps, StoredEmail } from "./inbound-email";

// Settings for the inbound email webhook. Values come from .env.local or the host's secret settings.
export function inboundConfig() {
  const env = {
    inboundDomain: process.env.INBOUND_EMAIL_DOMAIN,
    topicArn: process.env.SES_INBOUND_TOPIC_ARN,
    awsRegion: process.env.AWS_REGION,
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  return Object.values(env).every(Boolean) ? (env as { [K in keyof typeof env]: string }) : null;
}

export function inboundDeps(config: NonNullable<ReturnType<typeof inboundConfig>>): InboundDeps {
  const s3 = new S3Client({ region: config.awsRegion });
  return {
    inboundDomain: config.inboundDomain,
    async loadRawEmail(bucket, key) {
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!object.Body) throw new Error(`empty raw email at s3://${bucket}/${key}`);
      return Buffer.from(await object.Body.transformToByteArray());
    },
    async storeEmail(email: StoredEmail) {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/ingest_email`, {
        method: "POST",
        headers: {
          apikey: config.serviceRoleKey,
          authorization: `Bearer ${config.serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          p_email_slug: email.emailSlug,
          p_external_id: email.externalId,
          p_from_name: email.fromName,
          p_from_address: email.fromAddress,
          p_to: email.to,
          p_cc: email.cc,
          p_subject: email.subject,
          p_body_text: email.bodyText,
          p_sent_at: email.sentAt,
          p_raw_location: email.rawLocation,
          p_attachments: email.attachments.map((a) => ({
            part_index: a.partIndex,
            filename: a.filename,
            content_type: a.contentType,
            size_bytes: a.sizeBytes,
          })),
        }),
      });
      if (!response.ok) throw new Error(`ingest_email failed: ${response.status} ${await response.text()}`);
      return (await response.json()) as string | null;
    },
  };
}
