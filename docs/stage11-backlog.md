# Stage 11 backlog: deploy-ready, then timesheets

Goal: make the app ready to deploy with no action beyond connecting the accounts, then start the spec's stage 5 (timesheets). One PR per row, about 400 lines or fewer.

**Carried over:** S10-7 (milestones, migration 116), S10-8 and S10-9 are not built yet and stay in `stage10-backlog.md`; they run first if still open.

**Migrations:** S11-n = 119+n (S11-1 = 120 ... S11-8 = 127), named `supabase/migrations/<date>0000<number>_<name>.sql`; a row with no SQL leaves its number unused. Highest on main today: 113 (116 reserved by S10-7).

| # | Mig | Task | Done when |
|---|-----|------|-----------|
| S11-1 | none | Deploy readiness | `npm run deploy:check` fails on a missing or malformed always-needed variable (names from `deploy.md`) and, given a site URL, on a failing `/api/health`; an hourly GitHub Actions workflow posts to `/api/jobs` and skips cleanly while its secrets are unset; `deploy.md` says how to use both; no secret in the repo |
| S11-2 | none | Content security policy | Per-request nonce CSP from middleware, report-only first then enforced; app pages, PWA and e2e still pass |
| S11-3 | 122 | Timesheet grid | A member enters hours per task per day in a week grid; needs `hours.log`; row-level security tested; own hours only |
| S11-4 | 123 | Timesheet approval | A manager approves or sends back a week; locked once approved; audited |
| S11-5 | none | Timesheet CSV export | Approved weeks export as CSV per project and period for payroll; manager only |
| S11-6 | 125 | AI timesheet draft | A draft week from the person's own task activity, with each line linked to its source message; nothing saved without a click; behind the AI switch with rules fallback |
| S11-7 | 126 | Admin as its own role | Admin becomes a role rather than a workspace flag; existing admins migrated; permission tests updated |
| S11-8 | none | Spec gap sweep and e2e | Spec compared with main; `spec-gaps.md` updated; Playwright covers the timesheet flow |
| S11-9 | 131 | Last admin protection | A workspace cannot lose its last admin by removal or demotion; the database refuses it, the settings page says why; DB test |

Team rewards (spec stage 6) stay "later" until accounts are live and the pilot asks.

## Order
S11-1, S11-2, S11-3 to S11-6, S11-7, S11-8.
