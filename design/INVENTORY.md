# Design inventory

Source: `design/screens/*.dc.html` + `plenum.css` (canvas AZQiN8epZGmP664bYRvezD). Reading order, top to bottom, left to right.
"Existing" = file/component already in `src`. "New" = no counterpart. Mockup text and numbers are sample data and are not copied; copy goes through `src/lib/messages`.
Gap ids (G-n) point to `GAPS.md`.

Status: Part 1 (Shell, Overview) written. Other screens follow after sign-off.

## 1. Shell (all screens)

| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| S1 | `.app` grid: 52px rail + content, gap 26/28, ambient radial ground | `.shell` in `shell.css` | Restyle; the sidebar column shrinks from `--sidebar-w` to 52px |
| S2 | Top bar `.top`, one row, no divider | `.shell-top` | Restyle; sticky stays |
| S3 | Brand: black 34px "P" mark + "Plenum" 23px | `.shell-brand`, `.shell-logo` | Mark becomes the "P" path; text from `labels.brand` |
| S4 | Search field 560px, 56px high, icon cell, placeholder | `CommandMenu` trigger (`.shell-find`) | Restyle trigger as the field; still opens the menu (G-1). Placeholder from `labels.menu` |
| S5 | User block: avatar 44px, name, role line | `.shell-avatar` + `details.shell-account` | Avatar exists. Name/role lines new (G-2). Sign out stays in the account menu |
| S6 | Bell tile 52px with red dot | `Bell` (`icon`) | Restyle; unread count stays in the accessible name |
| S7 | Settings tile (gear) | `/app/settings` (today in the "admin" group) | New tile in top bar |
| S8 | Icon rail: Overview, Stream, Plan, Board, Items, Risks, Library, Reports, gap, Team | `nav` list from `navItems` | Text sidebar becomes icons with `aria-label` + `title`; 9 icons are new SVGs (G-3, G-4) |
| S9 | Rail tile states: default `--tile`, hover, current (white + shadow), Stream dot | `.shell-link`, `aria-current`, `.shell-badge` | Dot replaces the number badge; number stays in the accessible name |
| S10 | Focus ring 2px black, offset 2px | `:focus-visible` in tokens | Token change |
| S11 | Mobile ≤760px: top wraps, search on its own row, rail becomes a horizontal scroll row | `.shell-toggle`, `.shell-scrim`, drawer | Drawer is replaced by the scroll row (G-5) |
| S12 | Sign-in has no rail; language pills in top bar | `src/app/login` | See SignIn part later |

Existing shell parts with no place in the mockup: project crumb and switcher (G-6), "My work" quick link (G-7), group headings Project/Site/Admin and collapse toggle (G-8), privacy capsule (G-9), theme toggle (G-10), menu entries Timelines, Charter, Roles, Logs, Privacy (G-4).

## 2. Overview (`Main` → `/app`, `page.tsx` + `OverviewView.tsx`)

| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| O1 | H1 status sentence + sub line | `h1` "Overview" + `.sub` | New copy keyed on latest health (G-11) |
| O2 | Period pills Day/Week/Month | none | New, filters data (G-12) |
| O3 | "New task" button | `AddMenu` / `labels.newTask` | Restyle `.btn` |
| O4 | Metric 1: percent complete | `data.percent` | Existing number, new tile |
| O5 | Metric 2: days to next milestone | `listMilestones` | New tile from existing data (G-13) |
| O6 | Metric 3: waiting on you | pending suggestions count | New tile, project-wide count (G-14) |
| O7 | Metric 4: open risks, high | risks table | New read query (G-13) |
| O8 | Phases panel: title, sub, "Open plan" | none on Overview | New section, links to `/app/gantt` |
| O9 | Phases table: phase+owner, status chip, progress bar, against plan, finish, View | `phases` + tasks | New (G-15) |
| O10 | This week: title, sub, "Add task" | none | New section |
| O11 | Stage columns To do / In progress / Waiting, count, "+" | `listBoardTasks` | Waiting = blocked (G-16) |
| O12 | Task card: title, note, priority chip, messages, date, avatar | Board card | Reuse board card markup (G-17) |
| O13 | Calendar: title, "Add event", month nav, grid, today, markers, legend | none | New, read-only (G-18) |
| O14 | Waiting on you: title, "View all" | pending suggestions | Existing `ov-ai` card |
| O15 | Suggestion card: title, source line, Suggestion chip, before/proposed/holds, Apply, Review | `data.suggestion`, `reviewHref` | Apply not added (G-19). Source link kept |
| O16 | Team: title, sub, "Invite" | `/app/members` | New section (G-20) |
| O17 | Team rows: avatar, name, role, presence chip; "4 more", "See everyone" | `project_members` | Presence dropped (G-20) |

Existing Overview parts with no place in the mockup: health card with write-update form, Needs attention, Work summary counts and overdue, Upcoming, Recent activity, project email address, cheer, streak, knowledge, goal, history (G-21).

## Later parts (not yet written)
Stream, Risks, Plan, Board, Items, Task, Library, Reports, Team, Notifications, Settings, SignIn.
