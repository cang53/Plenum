# Backup and restore

Data lives in the Supabase project (EU region). Mail bodies are also in the SES-to-S3 bucket if raw storage is on.

- **Backups:** turn on daily backups in Supabase (Project settings, Backups). Pro plans keep 7 days; add point-in-time recovery before a paying pilot.
- **Extra copy (weekly):** `pg_dump "$DATABASE_URL" --format=custom --no-owner -f plenum-$(date +%F).dump` from a trusted machine, stored encrypted in EU storage. Never commit dumps.
- **Restore test (monthly):** restore the latest dump into a new throwaway Supabase project or local Postgres (`pg_restore --no-owner -d <url> file.dump`), then sign in and open one project to confirm the data is there. Delete the throwaway afterwards.
- **Restore drill (weekly, automatic):** `scripts/restore-drill.sh` backs up the local Supabase stack, wipes the public schema, restores, and checks row counts, row-level security and who can see a project. It runs every Monday in CI (`.github/workflows/restore-drill.yml`) and refuses to run against anything but the local database container. To try it: `supabase start && bash scripts/restore-drill.sh`.
- **Real restore:** pause inbound email (remove the SNS subscription), restore from the Supabase dashboard or `pg_restore`, check the newest message date against the SES log, resubscribe SNS, and resend any mail missing in between from SES.
- **Secrets** are not in backups: keep `.env.local` values in the hosting provider's secret settings and a password manager.
- **Limits:** `platform_limits.max_workspaces` caps new workspaces from onboarding; raise it with `update platform_limits set value = 50 where key = 'max_workspaces';`. The inbound endpoint allows 120 requests a minute per address per server instance.
