# Stage 14 backlog: final UI redesign

Goal: the app looks exactly like the target design, [Plenum Industry Benchmark Designs](https://claude.ai/artifact/4C3h6A56Ey3v4H8Ey1t2UZ), in a slate and cobalt palette (no green). This replaces the Liquid Glass look in `ui-redesign-backlog.md`: the target is flat, plain and dense (IBM Plex Sans, 1px lines, no blur, no gradients, no shadows except menus and dialogs). One PR per row, about 400 changed lines or fewer. Tasks marked "DB" add a migration (use the next free number above the highest on main at build time) and need row-level security tests.

## Palette (from the target; light / dark)
Page `#f4f5f7` / `#0e1116`, surface `#ffffff` / `#151921`, text `#12161c` / `#eceff4`, text 2 `#454e5b` / `#b8c1ce`, text 3 `#586272` / `#9aa5b6`, line `#d8dce3` / `#2b323e`, accent `#2b4fd0` / `#8fa8ff`, selected `#e1e7fa` / `#222d4f`, warn `#8a4b00` / `#e8b878`, bad `#b3261e` / `#f5a8a2`, ok `#17694a` / `#8fd3b0` (status only). All text pairs are at least 4.5:1.

## Rules for every row
- Match the target screen: layout, spacing, type sizes, status words, copy. When unsure, open the artifact section named in the row.
- Trust rules stay: project-only reading, no per-person analytics, every AI change needs a human click and links to its source. All strings go through `messages.*` (EN and NL).
- Keep existing behaviour, routes and tests green; restyle rows touch CSS and markup only.
- A row that will not fit in about 400 changed lines is split by its builder into a and b rows in this file first (suggested: S14-3, S14-10, S14-12, S14-15, S14-18), never merged over the limit.
- Migration numbers: 137 is free for a hotfix; DB rows take the next free number above the highest on main at build time, and the security audit allowlist is updated for any new definer function.
- Every redesigned screen keeps its existing e2e and axe tests passing in light and dark; update selectors in the same PR.
- Each PR description says which target section it matches and how to try it.

## Tasks

| # | DB | Task | Done when |
|---|----|------|-----------|
| S14-1 | no | Tokens | `tokens.css` holds the palette above for light and dark with the old names mapped; glass, blur, ambient and sage values removed; IBM Plex Sans through `next/font`; contrast test over every text pair |
| S14-2 | no | Flat primitives | Button (primary, plain), chip, status dot and word, initials avatar, key hint, field, tabs, filter row, dialog and menu restyled to the target; `/demo/ui` shows every state in EN and NL |
| S14-3 | no | Shell | 172 px sidebar (brand, project switcher, Inbox and My work, grouped nav with unread count badges, Views, Admin), top bar with search field and New task, tab bar on phones. Target: Shell and search |
| S14-4 | no | Command menu | Cmd+K opens a menu that finds tasks and project messages and runs actions (create task); keyboard and screen-reader tested; reuses existing search. Target: Shell and search |
| S14-5 | no | Stream page | `/app/stream` lists project messages with day rules, grouped senders, source tags (letter plus word), read-only "Project only" composer line. Target: Stream |
| S14-6 | no | Stream: New line and message actions | "New" line from last-read time; hover toolbar with Create task and Link to task keeping the message as source |
| S14-7 | DB | Stream: pinned decisions | Pin a message as a decision; pinned block on top and a Decisions tab; who pinned and when is shown |
| S14-8 | no | Stream: agent card | Existing AI suggestions appear in the stream with before and after rows, "Based on" links, Apply, Edit, Dismiss; reuses the current accept action; no auto-apply |
| S14-9 | DB | Overview | Health word (On track, At risk, Off track) with a written update by a person; figures row (progress, due this week, blocked, schedule); progress by phase; milestone list. No per-person charts. Target: Overview |
| S14-10 | no | Board | Four columns as flat lists, cards with ID, priority word, phase chip, due date, initials; column count and WIP count; add in place; segmented Board, Timeline, Items switch. Target: Board |
| S14-11 | no | Board: group-by and display | Group by phase, owner or due week; Display menu to show or hide card fields; Blocked cards name the message they wait on |
| S14-12 | no | Timeline | Split layout: task table (name, start, end) and bars; collapsible phase summary bars, diamond milestones, today line, week, month and quarter zoom. Target: Timeline |
| S14-13 | no | Timeline: baseline | Baselines already exist (S8, migrations 106 and 113); restyle only: save a baseline from the screen; pale baseline bar under the live bar and a "+N d" slip label |
| S14-14 | no | Timeline: critical path | Critical path outline toggle and dependency arrows for the selected task, from the existing schedule logic |
| S14-15 | no | Items table | Groups by status with counts and collapse, row select, column chooser, quick filter row (All, Mine, At risk, Blocked, Due this week). Target: Items |
| S14-16 | DB | Task detail | Side sheet and page section: description, checklist (new table), properties column, depends on and blocks, activity history with linked messages and who clicked Apply |
| S14-16b |  | Task side sheet | Same content as the task page in a side sheet opened from a Board card or an Items row; Escape or Close returns to the list. Split from S14-16. Target: Task detail |
| S14-17 | DB | Inbox | Two-pane inbox of suggestions: tabs (Needs your click, Mentions, History), keys J K A D H, snooze, History records who did what. Replaces the notifications list. Target: Inbox |
| S14-18 | no | Site log | Day view with sections: weather, people on site by company (counts), deliveries, notes with photos, day stepper, Submit day that locks. Uses existing data; gaps listed in the PR. Target: Site log |
| S14-19 | no | Site log on phone | Phone layout with one large Add entry button, offline and waiting-to-send states, bottom tab bar |
| S14-20 | no | Timesheet week | Week grid with row and day totals, target colouring, timer bar, Copy last week, Submit week. Target: Timesheets |
| S14-21 | no | Timesheet approvals | Approvals list with bulk approve, Review, rejection note; approvers only; others see a count. Target: Timesheets |
| S14-22 | no | People and roles | People table with role select (member, admin; project roles) and invite resend, and a read-only permission matrix from `permissions.ts`. Target: People and settings |
| S14-22b | no | Integrations and audit | Integration rows with what each reads and last read time (from the switches and the inbound log), audit log with filters and CSV (reuses the existing export). Target: People and settings |
| S14-23 | no | Login, welcome, errors, loading | Flat versions of the entry, welcome, error and loading states |
| S14-24 | no | Polish and audit | Axe pass in light and dark and in EN and NL for every redesigned screen; remove dead glass CSS and tokens; bundle check |

S14-24 counts S14-22b as well. Order: S14-1 to S14-3 first (everything depends on them), then S14-5 and S14-10 to S14-12 (the signature screens), then the rest in table order. S14-4 and S14-24 can move freely; S14-24 is last.

## Process
Builder per task, then the Stage 3 reviewer checks code, tests and spec fit, fixes and merges.
