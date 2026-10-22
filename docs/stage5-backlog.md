# Stage 5 backlog: pilot-ready, still no new accounts

Goal: a first real team can run a project in Plenum without help from us, and we can tell when something breaks. Entra ID, live SES and Bedrock stay deferred until the accounts exist. One PR per row, about 400 lines or fewer.

| # | Task | Done when |
|---|------|-----------|
| S5-1 | Error and health page | `/api/health` checks the database; errors log without message content; a runbook lists the first checks |
| S5-2 | Persistent rate limits | Inbound and sign-in limits use a database counter, so they hold across server instances |
| S5-3 | Data export | A workspace admin downloads all project data as JSON and CSV; export is audited |
| S5-4 | Delete a project or person | Admin deletes a project or removes a person's data with a confirm step; audit entry kept |
| S5-5 | Roles screen | Admin sees and changes who is manager, member, client or guest; changes audited |
| S5-6 | Email digest | Optional daily summary of new suggestions and due tasks per person, sent through the outbox (stub sender until SES) |
| S5-7 | Accessibility and mobile pass | Keyboard use, contrast and phone widths checked on the main screens, with fixes |
| S5-8 | Translations | Strings in two languages (English plus one), language switch honoured everywhere |
| S5-9 | Pilot dry run | Seeded end-to-end script and a written checklist for the first pilot day; known gaps listed |
| S5-10 | Account-ready switches | Config checklist and feature flags for Entra ID, live SES and Bedrock so enabling them is a settings change |
