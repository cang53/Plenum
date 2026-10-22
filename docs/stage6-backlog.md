# Stage 6 backlog: real accounts ready, deployable, usable

Goal: Plenum can be deployed and used by a real team. Everything is built and tested with mocks, so going live needs only keys and a settings change. No UI redesign (a Figma design is in preparation). One PR per row, about 400 lines or fewer.

| # | Task | Done when |
|---|------|-----------|
| S6-1 | SES sender | `EMAIL_PROVIDER=ses` sends through AWS SES (EU region) from `SES_FROM_ADDRESS`; AWS client mocked in tests; failures retry and are recorded in the outbox; `emailSender()` no longer throws |
| S6-2 | Entra ID sign-in | `AUTH_PROVIDER=entra` signs in through the Auth.js Microsoft Entra ID provider, mapped to the same user and project membership rows; provider mocked in tests; email link still works when off |
| S6-3 | Bedrock hardening | Timeouts, bounded retries, malformed-output handling, EU-region guard and a per-workspace daily call cap; falls back to rules when Bedrock fails; tested with a mocked client |
| S6-4 | Deploy readiness | Vercel config, `docs/deploy.md` with every env variable and secret, security headers, `/api/health` wired as the deploy check, `check:switches` run in CI |
| S6-5 | Pilot dry run on a local stack | Run `pilot-dry-run` and the e2e flow against the local Supabase stack; fix what breaks; list remaining gaps in `pilot-day.md` |
| S6-6 | Attachment text | Text from PDF, DOCX and plain-text attachments is read (server side, size-capped) and passed to triage; every suggestion still links to its source message |
| S6-7 | Spec gap sweep | Compare the spec with the built app; list unbuilt items in `docs/spec-gaps.md`, then fix the small ones and queue the rest as S6-12... |
| S6-8 | Empty, error and loading states | Every main screen has a plain-English empty, error and loading state; strings in both languages |
| S6-9 | Notification preferences | Each person can switch the daily digest and other emails on or off; per-person settings only, no per-person analytics |
| S6-10 | Security and RLS audit | Review every table's row-level security against the trust rules; add missing tests; check the audit log, rate limits and session expiry |
| S6-12 | Reply from the timeline | A person replies to a message from the app; it goes out by email with the linked item as a link, warns when the audience is wider, and is audited |
| S6-13 | Message translation | A message can be shown in the reader's language with the original one click away; display only |
| S6-14 | Task plan editing | Owner, phase, subtasks and finish-to-start dependencies can be set on the items screen; audited |
| S6-15 | Search and timeline filters | Search also by date range and linked task; timeline filters by sender, date and item kind |
| S6-16 | Site on tasks | Tasks carry a site and the board filters by it |
| S6-17 | Project templates | A manager creates a project from a past one (phases and tasks, no messages) |
| S6-18 | Schedule import | MS Project XML and P6 XER/XML create or refresh phases, tasks and dates; links people added are kept |
| S6-19 | Weekly status report | Draft report from the week's timeline, tasks and risks, each claim linked to its source; sent only after a click |

## Order
Accounts-independent first: S6-5, S6-7, S6-4. Then the three provider tasks (S6-1, S6-2, S6-3), then S6-6, S6-8, S6-9, and S6-10 before any pilot with real data.
