# Project email addresses

Each project has an address `<email_slug>@<INBOUND_EMAIL_DOMAIN>`. Anyone can CC it.

How an email gets in:

1. Amazon SES (EU region) receives mail for the inbound domain.
2. A receipt rule saves the raw email to an S3 bucket and notifies an SNS topic.
3. SNS posts the notification to `POST /api/inbound/email`.
4. The webhook checks the SNS signature and topic, reads the raw email from S3, and stores it
   once per project address it was sent to, through the `ingest_email` database function.
   Attachments are listed with the message; their contents stay in the raw email in S3.

Mail to addresses with no open project, or that fails the SES virus scan, is dropped.

## Setting it up (needs AWS and Supabase accounts)

1. In SES, verify the inbound domain and add its MX record (`inbound-smtp.<region>.amazonaws.com`).
2. Create a private S3 bucket in the same region, an SNS topic, and a receipt rule for the domain
   with one action: "Deliver to S3 bucket", with the SNS topic set on that action.
3. Subscribe the topic to `https://<app host>/api/inbound/email` (HTTPS). The webhook confirms the
   subscription itself.
4. Set the values listed in `.env.example`. The app's AWS credentials need only `s3:GetObject` on the bucket.
