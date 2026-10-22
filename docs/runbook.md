# Runbook: first checks when something breaks

Logs never contain message or task text, only the kind of failure (for example `triage failed: TypeError code=23505`). Do not paste email contents into tickets.

1. **Is the app up?** Open `/api/health`. `200 {"ok":true}` means the app reaches the database. `503` with `"database":"down"` means check step 2; `"not configured"` means `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing in the host's secret settings.
2. **Is the database up?** Check the Supabase project status page and project health. If paused or over quota, restore it (see `backup-restore.md`).
3. **Pages show "Something went wrong"?** Search host logs for `page failed:`. The name and `code=` tell the kind (`23505` duplicate, `42501` access denied by row-level security).
4. **Emails not arriving as messages?** `/api/inbound/email` returns 503 if inbound settings are missing, 403 for a bad topic or signature, 429 when rate limited. See `inbound-email.md`. Log lines: `inbound email … skipped:`, `triage failed:`.
5. **Emails not leaving?** Look at the `outbox` table for rows that are not sent. The stub sender is used until SES is live.
6. **Sign-in loops?** Check `NEXT_PUBLIC_SUPABASE_URL` and the auth redirect URLs in Supabase.
7. **Still stuck?** Note the time, the log line and the `/api/health` answer, then roll back to the last good deploy.

## Logs, counters and alerts

Every line from the inbound route is JSON with a `requestId` (also returned as the `x-request-id` header). Counters are log lines `{"event":"count","name":"inbound|triage|send_failure"}`: sum them per hour in the host's log search. They carry no person, address or text.

`/api/health` also returns `lastInboundAt` and `failedSendAgeMinutes` (oldest failed send still waiting for a retry). Suggested alerts:

- `/api/health` not 200 for 2 checks in a row.
- `failedSendAgeMinutes` above 120, or `send_failure` above 5 in an hour.
- `lastInboundAt` older than 24 hours on a working day, or `triage` far below `inbound`.
- A job's `lastRun` older than 2 hours (`/api/jobs` runs hourly).

## Daily email digest

People opt in on the Notifications page. A scheduler calls `POST /api/jobs` hourly with `Authorization: Bearer $JOBS_SECRET`; it runs the digest (at most once a day) and retries failed sends (3 attempts in all). `/api/health` shows each job's last run. Without `JOBS_SECRET` the route returns 403. Emails go through the normal sender, so with `EMAIL_PROVIDER=fake` they appear in the outbox only.
