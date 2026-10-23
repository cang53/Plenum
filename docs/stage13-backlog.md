# Stage 13 backlog: CI health and account-ready polish

Goal: the spec has no open item that needs no outside account (see `spec-gaps.md`, sweep S12-7), so stage 13 keeps main fast and green and finishes everything that can be built before the live accounts arrive. One PR per row, about 400 lines or fewer.

**Migrations:** S13-n = 136+n (S13-2 = 138 ... S13-6 = 142), named `supabase/migrations/<date>0000<number>_<name>.sql`; a row with no SQL leaves its number unused. Highest on main today: 136 (team goal, S12-6); 137 is left free for a hotfix.

| # | Mig | Task | Done when |
|---|-----|------|-----------|
| S13-1 | none | E2E job back to 3-4 min | Cause found and fixed: on #132 the 14 min came from one stalled `playwright install --with-deps` (11 min; normally 25 s), not from slow specs or retries (specs ran 56 s). The browser is cached and the install is cut off and retried after 3 min |
| S13-2 | none | Teams channel adapter, offline | Teams post for celebrations and channel messages behind a switch, with an offline fake like email and AI; contract test; live Teams stays "later" |
| S13-3 | 138 | Reward and challenge history | Past months of the team challenge and earned badges shown per project, team level only; row-level security tested |
| S13-4 | none | Translation string audit | Script in `check:switches` style fails CI on a hard-coded UI string in components; existing ones moved to the message file |
| S13-5 | none | Accessibility pass on stage 9 to 12 screens | `a11y.spec.ts` covers risks, site log, timesheet, rewards; violations fixed |
| S13-6 | none | Account-ready dry run | Checklist in `account-ready.md` run end to end against the local stack; gaps found are fixed or queued; `spec-gaps.md` swept |

## Order
S13-1 first (every later PR waits on CI), then S13-2 to S13-5 in any order, then S13-6.

## Still later
Live Teams, Entra ID, SES and Bedrock (need accounts and admin approval).
