# Database

Plenum runs on one Supabase project, **Plenum** (ref `uwimagjkbwourvepvtns`), in AWS `eu-west-1` (Ireland). Postgres 17.

## Migrations
- The files in `supabase/migrations/` are the source of truth. Add a new file for every change; never edit one that has been applied.
- File names are `YYYYMMDDNNNNNN_name.sql`. The hosted project records its own timestamps, so the names there differ but the order and content match.
- Applied to the hosted project so far: 1 workspaces and projects, 2 phases and tasks, 3 messages, 4 helper function lock-down.

## Checking a change
1. `npm run test:db` runs every migration and the access-rule tests on a throwaway local Postgres (CI does the same).
2. Apply the migration to the hosted project (Supabase dashboard SQL editor, or the CLI: `supabase link --project-ref uwimagjkbwourvepvtns` then `supabase db push`).
3. Check the hosted project's Security Advisor shows no new warnings.

The access-rule tests can also be run against the hosted project inside a transaction that ends in `rollback`, so no test data is kept. This was done when the first four migrations were applied, and all checks passed.

## Settings
See `.env.example`. The service-role key and database password are secrets: keep them in `.env.local` and the hosting provider's secret settings only.

## Types
Run `npx supabase gen types typescript --project-id uwimagjkbwourvepvtns > src/lib/database.types.ts` when the app starts reading tables through the Supabase client.

## Staging and production
There is one hosted project today. Before launch, add a second project for staging and apply each migration there first. Do not use Supabase branching on the free plan (it is billed per branch).
