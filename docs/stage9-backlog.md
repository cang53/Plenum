# Stage 9 backlog: harden stages 6 to 8, fill daily-use gaps

Goal: make what stages 6 to 8 added safe, fast and accessible, and close what an industrial PM team still lacks. The UI redesign and chat live in `ui-redesign-backlog.md`. One PR per row, about 400 lines or fewer.

**Migrations:** each row owns one reserved number, S9-n = 99+n (S9-1 = 100 ... S9-10 = 109). A row that needs SQL names its file `supabase/migrations/<date>0000<number>_<name>.sql` (e.g. `20261023000100_offline_queue.sql`) and uses no other number; a row with no SQL leaves its number unused.

| # | Mig | Task | Done when |
|---|-----|------|-----------|
| S9-1 | 100 | Offline queue encryption | Queued offline edits and the cached project view are encrypted at rest in the browser (Web Crypto, key kept non-extractable); wiped on sign-out; tested with a mocked store and key loss falls back to refetch |
| S9-2 | 101 | iOS icons and install polish | PNG app icons (180, 192, 512, maskable), `apple-touch-icon`, splash/theme colour, manifest checked by a test; install and offline checked on a phone width |
| S9-3 | 102 | Dependency import for MS Project / P6 | XML and XER links (FS, SS, FF, SF with lag) map to task dependencies; unsupported types are listed in the preview, not dropped silently; cycles refused; audited |
| S9-4 | 103 | Resource import | MS Project / P6 resources and assignments map to people (matched by email, else listed as unmatched for a click); no cost rates read; preview before apply |
| S9-5 | 104 | Performance budget | Budgets in CI for bundle size per route and server timing on timeline, board, Gantt and search with 10k messages; the build fails over budget; slow queries fixed or indexed |
| S9-6 | 105 | Accessibility audit of the glass UI | axe plus keyboard walk of every main screen in light, dark, reduced-transparency and high-contrast; contrast measured on the worst-case background; fixes and a regression test |
| S9-7 | 106 | Baselines and schedule slip | A manager saves a baseline of dates; the Gantt shows slip against it; counts per task only, no per-person view |
| S9-8 | 107 | Risks and issues register | Risks and issues as linked items with owner, due date and status; suggested from messages with a human click and source link; shown in the weekly report |
| S9-9 | 108 | Document and drawing links | Attachments tagged by document type and revision; newest revision flagged; superseded revisions marked; searchable |
| S9-10 | 109 | Daily site log | A structured log per site and day (weather, headcount total, work done, delays) filled from the site app or a message; aggregate only, never per person; exported with the project |

## Order
S9-1, S9-2 (shipped features, security first), S9-5, S9-6, then S9-3, S9-4, then S9-7 to S9-10.
