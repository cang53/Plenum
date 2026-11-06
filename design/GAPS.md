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

## Part 2 (answered by SS)
- G-22 DECIDED: Stream source pills filter client-side; no counts (loaded counts would look like totals).
- G-23 DECIDED: no "read by"; header avatars = project members from existing data, decoration only.
- G-24 DECIDED: existing composer copy; never claim Teams posting unless code does it.
- G-25 DECIDED: Linked work read-only from source-message links, no Filter. Empty state (via messages): "Messages linked to tasks, decisions or risks appear here".
- G-26 DECIDED: Register = Risk (+owner), Score chip with band word, Review date (if stored), View. Detail = score tile, likelihood, impact, description, review date, Edit risk. No trend, mitigation, "Since Monday". Metrics: Open, Scored 15+, Reviews due only if review dates exist. 5x5 matrix as designed.
- G-27 DECIDED: tabs, Plan Studio, analysis in a second block as panels. Export only where it exists.
- G-28 DECIDED: only existing Gantt controls, as pills.
- G-29 DECIDED: show only what Gantt.tsx computes. Critical rows get neutral "Critical" chip, Critical path panel with float if computed. Without forecast: done (black) and planned (outline) bars; legend shows only those.
- G-30 DECIDED. G-31 DECIDED: pills All, Tasks, Decisions, Change requests.
- G-32 DECIDED: no checklist; main column = suggestion card, Details, Activity.
- G-33 DECIDED: Folders + "Files" table; type filter only if type stored.
- G-34 DECIDED: no chart; metrics row (percent complete, tasks done, open risks) instead.
- G-35 DECIDED: restyle only; never auto-send; keep confirm; sent list only if stored; "Draft" chip only if truly a draft.
- G-36 DECIDED: drop company column/pills unless stored; Overview Team sub = "N people".
- G-37 DECIDED: existing types and preferences only.
- G-38 DECIDED: per-section black "Save" bottom-right; no page-level Save/Cancel.
- G-39 DECIDED: only the "never applies a change on its own" line plus existing AI settings.
- G-40 DECIDED: omit Help, keep Privacy.
- Backlog of unsupported design features: see `BACKLOG.md`.
