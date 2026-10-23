# Stage 12 backlog: team rewards (spec stage 6)

Goal: build the spec's team rewards, the last v1 feature that needs no outside account. Team level only: no individual points, scores or leaderboards, nothing based on one person's punctuality, and rewards never touch pay or rating (spec Feature 4). Every reward is computed from data the app already records, with no new tracking. One PR per row, about 400 lines or fewer.

**Migrations:** S12-n = 131+n (S12-1 = 132 ... S12-6 = 137), named `supabase/migrations/<date>0000<number>_<name>.sql`; a row with no SQL leaves its number unused. Highest on main today: 130; 131 is reserved by S11-9 (last-admin guard).

**Site:** tasks carry a free-text `site` (S8-2). A reward belongs to a project; it is hidden when its project's sites are switched off (see S12-1). Site `''` in the switch table means every site.

| # | Mig | Task | Done when |
|---|-----|------|-----------|
| S12-1 | 132 | Rewards switch per site | Admin only can turn rewards off per site or for the whole workspace, in settings; a member reads the switch; change is audited; row-level security tested; a pure helper `rewardsOn(switches, site)` is the single check every later row uses |
| S12-2 | none | Streak | Project page shows a flame counter: weeks in a row with no task overdue without an update, computed from tasks and audit rows; no per-person split; hidden when switched off; tests for the week count |
| S12-3 | 133 | Early warning badge | A risk raised at least 2 weeks before its due date gets a badge on the risk and a team count; computed from risk created and due dates; hidden when switched off |
| S12-4 | 134 | Knowledge badge | A decision or lesson written up and linked to its source message gives a team badge; counts per project only; hidden when switched off |
| S12-5 | 135 | Milestone celebration | A milestone done on or before its date shows a banner for the whole team; Teams channel post waits for live Teams (marked later); hidden when switched off |
| S12-6 | 136 | Team challenge | A project manager sets a monthly goal (for now: all timesheets in by Friday); progress bar for the team from submitted week counts, never per person; hidden when switched off |
| S12-7 | none | Spec gap sweep and e2e | Spec compared with main; `spec-gaps.md` updated; Playwright covers switch off and one reward; runs in CI |

## Order
S12-1 first (every reward checks it), then S12-2 to S12-6 in any order, then S12-7.

## Still later
Teams channel messages and the Teams post for celebrations (need the Teams app and admin approval); live Entra ID, SES and Bedrock (need accounts).
