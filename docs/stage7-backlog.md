# Stage 7 backlog: fit for daily use

Goal: stay fast and trustworthy with real volumes, and make problems visible. The UI redesign and unified chat live in `ui-redesign-backlog.md`; spec gaps S6-12 to S6-19 stay in `stage6-backlog.md`. All tasks are built with mocks, so going live needs only keys. One PR per row, about 400 lines or fewer.

| # | Task | Done when |
|---|------|-----------|
| S7-1 | Pagination and indexes | Timeline, items, search, audit and notifications page by cursor (50 per page); indexes for the slow queries; test with 10k seeded messages |
| S7-2 | Search quality | Ranked results with highlighted matches, Dutch and English stemming, the date and linked-task filters from S6-15 left to that row; relevance tested |
| S7-3 | Error tracking | Pluggable `ERROR_SINK` (off, log, Sentry-compatible) that scrubs message content; unhandled server and client errors reported; mocked in tests |
| S7-4 | Observability | Structured JSON logs with a request id, aggregate counters (inbound, triage, send failures; never per person), `/api/health` extended with queue age and last inbound time, alert thresholds in the runbook |
| S7-5 | Onboarding flow | First sign-in walks a new workspace through naming it, creating a project, getting the project address and inviting people; resumable; strings in EN/NL |
| S7-6 | Restore drill | `backup-restore.md` turned into a scripted drill: back up the local stack, wipe, restore, verify counts and row-level security; run in CI weekly |
| S7-7 | E2E coverage of key flows | Playwright tests for inbound email to suggestion to apply, invite and role change, export, delete, and the digest preference; run in CI |
| S7-8 | Teams adapter interface | `ChannelAdapter` interface (receive, project-only check, reply) with email as the first implementation and a mocked Teams adapter proving the contract; no Teams account needed |
| S7-9 | Background jobs | Digest, retention and retry-send run from one scheduled endpoint protected by a secret, idempotent, with a last-run record on the health page |
| S7-10 | Data retention and privacy | Configurable retention for raw messages and attachments, a purge job (audited), and a data-handling page in plain English |

## Order
S7-1, S7-9, S7-3 and S7-4 first (volume and visibility), then S7-5 and S7-7, then S7-2, S7-6, S7-8 and S7-10.
