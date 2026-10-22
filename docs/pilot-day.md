# Pilot day

## Dry run (the day before, 10 min)

1. Start the local stack and app as in `local-run.md` (`supabase start`, `.env.local`, `npm run dev`).
2. Run `npm run pilot:dry-run -- you@example.test`. It seeds a demo project, sends three emails to the project address and checks the health page, the timeline and the AI suggestions. Any `FAIL` line stops the pilot until fixed (see `runbook.md`).
3. Run `npm run test:e2e` (see `e2e.md`) for the browser flow.
4. Sign in at `/login` with the emailed link and walk through: accept one suggestion, dismiss one, change a task status, open the audit log, switch language to Dutch, download the data export.

## Pilot day checklist

Before the team arrives:
- [ ] `/api/health` returns `{"ok":true}` on the live app.
- [ ] Database migrations are applied (Apply migrations workflow is green on main).
- [ ] Workspace and first admin exist; the admin has signed in once.
- [ ] Project created, project manager set, project address noted.
- [ ] Hosting secrets are set (`.env.example` lists them); no secrets in the repository.

During the day:
- [ ] Walk the team through `pilot-onboarding.md` (30 minutes).
- [ ] CC the project address on one real email; it shows on the timeline within a minute.
- [ ] Each person accepts or dismisses at least one suggestion.
- [ ] Say out loud the three rules: only messages sent to the project address are read, no per-person statistics, every AI suggestion needs a click.

End of day:
- [ ] Review the audit log with the project manager.
- [ ] Check the `outbox` table for unsent rows and host logs for `failed:` lines.
- [ ] Collect feedback and list it next to the gaps below.

## Known gaps

- Sign-in is by emailed link; Entra ID is not connected (waiting on the account).
- Email sending uses the stub sender, so people get no real emails or digests; live SES is waiting on the account. Inbound email from real senders needs SES set up (`inbound-email.md`).
- AI suggestions come from offline rules, not Bedrock, so they are plain-keyword and often miss nuance.
- Attachments are listed but their contents are not read.
- Translations cover English and Dutch only.
- The dry run script covers the server side; the browser flow is in the e2e test and the manual walk-through above.
