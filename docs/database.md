# Database

Plenum runs on one Supabase project, **Plenum** (ref `uwimagjkbwourvepvtns`), in AWS `eu-west-1` (Ireland). Postgres 17.

## Migrations
- The files in `supabase/migrations/` are the source of truth. Add a new file for every change; never edit one that has been applied.
- File names are `YYYYMMDDNNNNNN_name.sql`. The hosted project records its own timestamps, so the names there differ but the order and content match.
- Applied to the hosted project so far: 1 workspaces and projects, 2 phases and tasks, 3 messages, 4 helper function lock-down, 5 message links, 6 suggestions, 7 audit log, 8 audit of task edits, 9 demo seed (7 to 9 not yet applied).

## Checking a change
1. `npm run test:db` runs every migration and the access-rule tests on a throwaway local Postgres (CI does the same).
2. Apply the migration to the hosted project (Supabase dashboard SQL editor, or the CLI: `supabase link --project-ref uwimagjkbwourvepvtns` then `supabase db push`).
3. Check the hosted project's Security Advisor shows no new warnings.

The access-rule tests can also be run against the hosted project inside a transaction that ends in `rollback`, so no test data is kept. This was done when the first four migrations were applied, and all checks passed. Migrations 5 and 6 were applied without that live run (the Supabase connector timed out); their rules are covered by `npm run test:db`.

## Settings
See `.env.example`. The service-role key and database password are secrets: keep them in `.env.local` and the hosting provider's secret settings only.

## Types
Run `npx supabase gen types typescript --project-id uwimagjkbwourvepvtns > src/lib/database.types.ts` when the app starts reading tables through the Supabase client.

## Staging and production
There is one hosted project today. Before launch, add a second project for staging and apply each migration there first. Do not use Supabase branching on the free plan (it is billed per branch).

## Suggestions (migration 6)

`public.suggestions` holds at most one AI suggestion per message. Only the server (service role) writes
them. A project manager can edit the wording and set the status to `accepted` or `dismissed`; the
database stamps `resolved_by` and `resolved_at`, and a decided suggestion cannot change again.
Accepting creates the item through the same path as manual linking, so it keeps `source_message_id`.

## Audit log (migration 7)

`public.audit_log` is written only by database triggers: accepting or dismissing a suggestion, and
creating a decision, risk, change request or message-linked task. Each row has the actor, the item
and its source message. Rows cannot be changed or removed. Project managers read their project's rows;
workspace admins read the workspace's. `auditCsv` (`src/domain/audit.ts`) turns rows into the export
file; the download button waits for sign-in (task 3). Email sends will log through `write_audit`.

## Audit of task edits and the demo seed (migrations 8 and 9)

Changes to a task's status, dates or owner are written to the audit log by the database, under the person who made them. `public.seed_demo_project(workspace, manager)` (service role only) adds the example project; see `docs/pilot-onboarding.md`.
