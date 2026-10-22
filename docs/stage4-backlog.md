# Stage 4 backlog: a usable pilot product, still no new accounts

Goal: a pilot team can use Plenum daily without hand-holding. One PR per row, about 400 lines or fewer. Entra ID, live SES and Bedrock stay deferred until the accounts exist.

| # | Task | Done when |
|---|------|-----------|
| S4-1 | Invitation expiry and resend | Old invitations stop working; a manager can resend or revoke |
| S4-2 | Task details field and comments-free notes | Tasks keep a description, edits are audited |
| S4-3 | In-app notifications | Assigned tasks, new suggestions and accepted invitations show in a bell list, per person, no analytics |
| S4-4 | Search | One box finds tasks, messages and decisions in the current project (Postgres full text, row-level security) |
| S4-5 | Settings | Display name, language, project name and email address slug |
| S4-6 | Onboarding wizard | First sign-in creates a workspace and project, with an optional demo project |
| S4-7 | Real-error handling | Failed saves and sends show a plain message and a retry; errors logged without message contents |
| S4-8 | Accessibility and translation pass | Second language file added, no hard-coded strings, axe checks still pass |
| S4-9 | Pilot hardening | Rate limits on inbound endpoints, backup and restore notes, row-level security tests for every new table |
