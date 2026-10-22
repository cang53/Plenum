# Runbook: first checks when something breaks

Logs never contain message or task text, only the kind of failure (for example `triage failed: TypeError code=23505`). Do not paste email contents into tickets.

1. **Is the app up?** Open `/api/health`. `200 {"ok":true}` means the app reaches the database. `503` with `"database":"down"` means check step 2; `"not configured"` means `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing in the host's secret settings.
2. **Is the database up?** Check the Supabase project status page and project health. If paused or over quota, restore it (see `backup-restore.md`).
3. **Pages show "Something went wrong"?** Search host logs for `page failed:`. The name and `code=` tell the kind (`23505` duplicate, `42501` access denied by row-level security).
4. **Emails not arriving as messages?** `/api/inbound/email` returns 503 if inbound settings are missing, 403 for a bad topic or signature, 429 when rate limited. See `inbound-email.md`. Log lines: `inbound email … skipped:`, `triage failed:`.
5. **Emails not leaving?** Look at the `outbox` table for rows that are not sent. The stub sender is used until SES is live.
6. **Sign-in loops?** Check `NEXT_PUBLIC_SUPABASE_URL` and the auth redirect URLs in Supabase.
7. **Still stuck?** Note the time, the log line and the `/api/health` answer, then roll back to the last good deploy.

## Daily email digest

People opt in on the Notifications page. A daily scheduler calls `POST /api/digest` with `Authorization: Bearer $DIGEST_SECRET`. Without `DIGEST_SECRET` the route returns 403. Emails go through the normal sender, so with `EMAIL_PROVIDER=fake` they appear in the outbox only.
