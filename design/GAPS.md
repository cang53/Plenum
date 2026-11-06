# Gaps

DECIDED = a DESIGN rule or another screen answers it. NEEDS ANSWER = changes behaviour, has no place in the design, or screens disagree.

## Shell and Overview (answered by SS)
- G-1 DECIDED: keep the command menu; style its trigger as the search field.
- G-2 DECIDED: email and role label from existing layout data.
- G-3 DECIDED: `aria-label` and `title` on rail icons.
- G-4 DECIDED: rail = Overview, Stream, Plan, Board, Items, Risks, Library, Reports, gap, Team; each shown only to roles that can open it (keep `nav.ts` permissions, drop the hidden-on-purpose flags). Plan = Gantt with pills Gantt / Timelines. Charter -> Settings "Project", Roles -> "People and access", Logs -> new "Activity log", Privacy -> "Privacy and data".
- G-5 DECIDED: phone drawer becomes the horizontal rail.
- G-6 DECIDED: project switcher as a soft pill right of the brand (name + chevron); one project = plain text.
- G-7 DECIDED: "Mine" toggle pill on Items and Board.
- G-8 DECIDED: group headings and collapse toggle removed.
- G-9 DECIDED: one muted 13px footer line on every app page: trust copy + link to Settings > Privacy and data.
- G-10 DECIDED: light is default; dark tokens kept and mapped to new names; toggle in account menu. FOLLOW-UP: dark mode is not designed; no dark polish in these PRs.
- G-11 DECIDED: headline from latest health label + project name.
- G-12 DECIDED: Day/Week/Month left out; header keeps only "New task".
- G-13, G-14 DECIDED as before.
- G-15 DECIDED: phase name, status chip, progress (tasks in phase), finish = latest due date. "Against plan" only if phases store a planned end; owner only if phases have a lead field.
- G-16 DECIDED: Waiting = blocked, existing status label kept, mockup styling.
- G-17 DECIDED as before.
- G-18 DECIDED: read-only month grid, milestones and task due dates, month arrows, no "Add event".
- G-19 DECIDED: one full-width black "Review" button; Apply stays on the review page with the source link.
- G-20 DECIDED: members with role only in a neutral chip; sub line = member count.
- G-21 DECIDED placement: health form -> soft "Update status" button next to "New task"; Needs attention -> merged into "Waiting on you"; work summary/overdue -> metrics row (only when it is the same number); Upcoming removed (calendar covers it); Recent activity -> panel under "This week"; project email -> Settings > Sources; cheer, streak, knowledge, goal, history kept as panels in a second block.
- REVIEW LATER: cheer, streak, knowledge, goal, history. SS may drop streak and cheer under the no-per-person-stats rule.

## Part 2 (new)
- G-22 NEEDS ANSWER: Stream source pills with counts do not exist. Proposal: client-side filter over loaded messages by source, counts of loaded messages; no data change.
- G-23 NEEDS ANSWER: "read by 4" is a read receipt (per-person data) and has no source. Proposal: drop it; header avatars are decoration only, no per-person data.
- G-24 NEEDS ANSWER: composer note says "posts to Teams". Proposal: use the real behaviour's copy from the existing composer; I will not claim Teams posting unless it does.
- G-25 NEEDS ANSWER: "Linked work" panel is new. Proposal: build it read-only from existing source-message links (tasks, decisions, risks); omit the Filter button.
- G-26 NEEDS ANSWER: Risks has no stored trend, score history, mitigation steps, or review date logic for "rising" and "reviews due". Proposal: drop Trend column, "Rising" tile, "Since Monday", and the mitigation bar and list; keep score, band, owner, review date if stored; tiles = open, scored 15 or more, reviews due only if a review date exists.
- G-27 NEEDS ANSWER: existing Risks tabs, Plan Studio and analysis panel have no place; Export CSV (Risks) and Export (Items) may not exist. Proposal: keep tabs/panels as a second block below; show export buttons only where the feature exists.
- G-28 NEEDS ANSWER: Plan zoom (Week/Month/Quarter) and Filter. Proposal: keep only controls the Gantt already has.
- G-29 NEEDS ANSWER: Plan "behind by", float, "+1 d" forecast chips, forecast bars, and Critical path panel need forecast data. Proposal: show only what `Gantt.tsx` already computes (it has critical/float code); drop the rest, and keep the legend entries that have data.
- G-30 DECIDED: Board Done column "Show more" is presentation only; show the latest 3 and expand.
- G-31 NEEDS ANSWER: Items type "Issues" has no table. Proposal: pills = All, Tasks, Decisions, Change requests (existing kinds).
- G-32 NEEDS ANSWER: Task checklist with progress has no data. Proposal: omit the checklist; keep description and activity.
- G-33 NEEDS ANSWER: Library type pills and "last 7 days" recent list. Proposal: keep folders and the file table; add type filter only if file type is stored.
- G-34 NEEDS ANSWER: Reports "progress against plan" chart needs planned vs actual history. Proposal: omit chart.
- G-35 NEEDS ANSWER: "Send to client" and "Sent reports" are outward-facing. Proposal: restyle only; keep whatever send/confirm flow exists; sent list only if stored.
- G-36 NEEDS ANSWER: Team company column and company pills need an organisation field. Proposal: drop both unless profiles store one.
- G-37 NEEDS ANSWER: Notifications filter pills (Mentions, Suggestions, Deadlines) and some toggles (risk changes) may not exist. Proposal: show only types and preferences that exist.
- G-38 NEEDS ANSWER: Settings single Save/Cancel vs per-section forms. Proposal: keep per-section save buttons (behaviour unchanged).
- G-39 NEEDS ANSWER: CobIA settings toggles (suggest, weekly draft, read attachments) have no stored settings. Proposal: show the "never applies a change on its own" line only; no toggles.
- G-40 NEEDS ANSWER: SignIn footer "Help" has no target. Proposal: omit Help; keep Privacy.
