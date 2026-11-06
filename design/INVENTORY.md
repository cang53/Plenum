# Design inventory

Source: `design/screens/*.dc.html` + `plenum.css` (canvas AZQiN8epZGmP664bYRvezD). Reading order, top to bottom, left to right.
"Existing" = file/component already in `src`. "New" = no counterpart. Mockup text and numbers are sample data and are not copied; copy goes through `src/lib/messages`.
Gap ids (G-n) point to `GAPS.md`.

Status: Part 1 (Shell, Overview) signed off. Part 2 (all other screens) below.

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


## 3. Stream (`/app/stream`: `page.tsx`, `StreamView`, `LiveStream`, `Composer`, `SuggestionCarousel`)

| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| T1 | H1 + sub | `StreamView` heading | Restyle `.h1` / `.sub` |
| T2 | Source pills All/Teams/Email/Site app with counts | none found | New (G-22) |
| T3 | Conversation panel header: title, sub (people, channels), 3 avatars | `StreamView` head | Member count from data; avatars are decoration (G-23) |
| T4 | Day divider | `LiveStream` day group | Restyle |
| T5 | Message row: avatar, name, source chip, time, bubble | `LiveStream` message | Restyle; source chip uses existing source label |
| T6 | Email message card: subject, body, attachment button, "Open full email" | message with attachment | Restyle `.cell` |
| T7 | CobIA message with Suggestion chip, Apply change / Edit first / Dismiss, diff cells, "Based on" source links | `SuggestionCarousel` | Restyle only; behaviour, source links and click-to-apply kept |
| T8 | Own message (right) + "read by 4" | own message | Read line dropped (G-23) |
| T9 | Composer: label, textarea, attach, project-members note, Send | `Composer`, `Attach`, `SendButton` | Restyle; note text from real behaviour (G-24) |
| T10 | Linked work: title, sub, Filter button | none | New panel from existing source links (G-25) |
| T11 | Linked task card: title, key, owner, chip, progress, 3 counts | task + links | New, aggregate counts only |
| T12 | Linked decision / risk cards | decisions, risks | New, link to the item |
| T13 | Empty / loading / error | `AgentWait`, states | Restyle with `states.css` |

## 4. Risks (`/app/risks`: `RiskRegisterView`, `RiskMatrix`, `RiskDetailView`, `RiskTabs`, `PlanStudio`, `RiskAnalysisPanel`)

| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| R1 | H1 + sub | `RiskRegisterView` head | Sub copy keyed on counts, no sample numbers |
| R2 | Status pills Open / Closed with counts | existing status filter | Restyle |
| R3 | Owner select, "Mine" | existing owner filter | "Mine" toggle per G-7 |
| R4 | Add risk | existing add action | Restyle `.btn` |
| R5 | Summary tiles: open, scored 15+, rising, reviews due | counts from register | First two exist; last two new (G-26) |
| R6 | Register panel: title, sub, Export CSV | register head | Export only if it exists (G-27) |
| R7 | Table: risk+id+owner, score chip with band, trend, mitigation bar, review date, View | `RiskRegisterView` rows | Trend and mitigation have no data (G-26) |
| R8 | Selected row state | row selection | New style |
| R9 | Matrix 5x5 with band colours, risk buttons, legend | `RiskMatrix` | Restyle; band colours new tokens |
| R10 | Selected-risk panel: title, chip, text, mitigation bar and list, L/I/delta, review date, Rescore, Edit | `RiskDetailView` | Mitigation list and delta have no data (G-26) |
| R11 | none | `RiskTabs`, `PlanStudio`, `RiskAnalysisPanel` | No place in mockup (G-27) |

## 5. Plan (`/app/gantt` + `/app/timelines`: `Gantt`, `GanttHead`, `TimelineEditor`)

| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| P1 | H1 + sub (dates, today) | `GanttHead` | Dates from data |
| P2 | Pills Gantt / Timelines in header (decided) | new pill group | Links the two routes |
| P3 | Zoom Week/Month/Quarter, Filter, Add task | existing zoom/filter if present | Keep what exists (G-28) |
| P4 | Summary tiles | counts | Complete %, tasks done exist; "behind", "float" derived (G-29) |
| P5 | Timeline panel: legend, month header, rows, bars (planned outline, done, forecast), milestone diamond, today line, forecast chips | `Gantt` | Restyle with `gantt.css`; forecast needs data (G-29) |
| P6 | Upcoming milestones list with status chip | `listMilestones` | New list |
| P7 | Critical path panel | float/critical code in `Gantt` | Only if computed today (G-29) |

## 6. Board (`/app/board`)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| B1 | H1 + sub | board head | |
| B2 | Phase pills, Owner select, "Mine" toggle (decided), Add task | existing filters | Restyle |
| B3 | CobIA bar: count of suggestions for this board + Review | `listPendingSuggestions` | New bar, links to review page |
| B4 | Columns To do / In progress / Waiting / Done with count and "+" | board columns | Waiting = blocked label (decided) |
| B5 | Card: title, note, priority/status chip, key, progress, messages, date, avatar | board card | Reuse; only fields the query returns |
| B6 | Done: dimmed cards, "Show more" | done column | New collapse (G-30) |

## 7. Items (`/app/items`: `ItemsHead`, `ItemsTable`, `KindSwitch`, inspector)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| I1 | H1 + sub, Export, New item | `ItemsHead` | Export only if it exists (G-27) |
| I2 | Four metrics | counts | Open tasks, decisions, change requests, overdue from existing tables |
| I3 | Panel: title, count, type pills (All/Tasks/Decisions/Change requests/Issues) | `KindSwitch` | Restyle; "Issues" only if it exists (G-31) |
| I4 | Table: item+key, type, From, owner, status chip, due, View | `ItemsTable` | Restyle |
| I5 | Pagination "Showing x of y" + arrows | existing paging | Keep what exists |
| I6 | none | inspector, `RowOptions`, quick filters, offline tasks | Keep, restyle |

## 8. Task (`/app/tasks/[id]`: `TaskDetail`, `TaskSheet`)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| K1 | Breadcrumb Board / phase / key | none | New |
| K2 | H1, status chips, origin line "created from message" | `TaskDetail` head | Source link kept |
| K3 | Link message, Mark done | existing actions | Restyle |
| K4 | CobIA proposal card with diff + Apply / Edit first / Dismiss | suggestion UI | Shown only when a pending suggestion exists |
| K5 | Details, checklist with progress | description; checklist | Checklist has no data (G-32) |
| K6 | Activity list + "Open in stream" | linked messages | New list from source links |
| K7 | Properties: owner, phase, start, duration, priority, critical path | `TaskSheet` fields | Critical path only if computed (G-29) |
| K8 | Linked risk / decision cards | links | New |
| K9 | Files list | attachments | Reuse library links |

## 9. Library (`/app/library`: `LibraryView`)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| L1 | H1 + sub, New folder, Upload | `LibraryView` head | Exists |
| L2 | Folder cards with counts | `library_folders` | Restyle; counts as available |
| L3 | Recent files: title, type pills, table (name, From, Linked to, size, added, Download) | `LibraryView` table | Type pills and "last 7 days" only if supported (G-33) |

## 10. Reports (`/app/reports`)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| E1 | H1 + sub, period pills, New report | `reports/page.tsx` | Exists in some form |
| E2 | Progress-against-plan chart | none | New chart, needs history (G-34) |
| E3 | Draft report panel: sections, Draft chip, Send / Edit / Download PDF | `status-report.ts` output | "Send to client" is outward-facing: keep the existing send step and its confirm (G-35) |
| E4 | Sent reports list | stored reports if any | G-35 |
| E5 | Hours this week totals | timesheets | Team totals only; keep "no hours per person" line |

## 11. Team (`/app/members`, `/app/roles`)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| M1 | H1 + sub, company pills, Invite | `members/page.tsx` | Company needs data (G-36) |
| M2 | Four tiles | counts | "On site today" dropped (G-20 logic) |
| M3 | People table: name+role, company, Today, access, Edit/Resend | members table | "Today" column dropped; role and access exist |
| M4 | Access levels panel with counts | role descriptions | Copy from messages |
| M5 | "No rankings" note | trust copy | Keep |

## 12. Notifications (`/app/notifications`)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| N1 | H1 + sub, filter pills, Mark all read | `notifications/page.tsx` | Pills only if types exist (G-37) |
| N2 | Day groups; rows with icon/avatar, title, sub, time | list | Restyle |
| N3 | Notify-me toggles (mentions, suggestions, deadlines, risk changes, digest) | existing preferences | Only those that exist (G-37) |

## 13. Settings (`/app/settings` + sub-nav)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| G1 | H1, Cancel / Save changes | `settings/page.tsx` | Per-section save kept if that is how it works (G-38) |
| G2 | Sub-nav: Project, Sources, CobIA, Notifications, People and access, Privacy and data | new nav | Decided: Charter -> Project, Roles -> People and access, Logs -> "Activity log" item, Privacy -> Privacy and data |
| G3 | Project form | settings + charter | Fields that exist |
| G4 | Sources list with connect/manage; project inbox row with copy address | Teams, inbound email | Email address moves here (decided) |
| G5 | CobIA toggles + "never applies on its own" | none stored | Toggles have no data (G-39); the line is kept |

## 14. SignIn (`/login`)
| # | Mockup element | Maps to | Notes |
|---|---|---|---|
| A1 | Top bar: brand + language pills | login layout, locale | Pills switch locale |
| A2 | Panel: H1, sub, email field, button | `login/page.tsx` | Restyle |
| A3 | Invite-only note | existing copy | |
| A4 | Footer: tagline, Privacy, Help | none | Help link has no target (G-40) |
