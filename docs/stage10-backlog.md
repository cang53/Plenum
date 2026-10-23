# Stage 10 backlog: close the stage 9 gaps, then pilot-check

Goal: finish what stage 9 left half-done (found in review) and check the whole app against the v1 spec once more. One PR per row, about 400 lines or fewer.

**Migrations:** each row owns one reserved number, S10-n = 109+n (S10-1 = 110 ... S10-6 = 115), named `supabase/migrations/<date>0000<number>_<name>.sql`; a row with no SQL leaves its number unused.

| # | Mig | Task | Done when |
|---|-----|------|-----------|
| S10-1 | 110 | Workspace export completeness | The JSON and per-table CSV export also carry baselines, baseline tasks, status reports and attachments with their document type, number and revision tags; still admin only and audited; a test fails if a listed table is missing from the export function |
| S10-2 | 111 | Site log entry from a message | A manager or member starts a daily site log from a message (site, date and work prefilled from it, edited before saving); the log links back to its source message; a human click saves, nothing is filed automatically; aggregate only |
| S10-3 | 112 | Site logs in the weekly report | The weekly status report adds a site line per site (days logged, total headcount-days, delay days) without per-person data; shown in the preview before sending |
| S10-4 | 113 | Choose a baseline | Baselines get a name and a list; the Gantt compares against the one picked, default the latest; counts per task only |
| S10-5 | none | Spec gap sweep | The v1 spec compared with main again; `spec-gaps.md` updated; every remaining gap is a row here or marked "later" |
| S10-6 | none | End-to-end for stage 9 screens | Playwright covers site log, risks and issues, baselines and document tags on the seeded project; runs in CI |

## Order
S10-1, S10-2 (known gaps), S10-3, S10-4, then S10-5, S10-6.
