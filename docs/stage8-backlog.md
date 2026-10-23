# Stage 8 backlog: daily use by an industrial PM team

Goal: close the spec gaps and add what a site and office team need every day. The UI redesign and chat live in `ui-redesign-backlog.md`. This stage takes over the unbuilt rows S6-12 to S6-19 of `stage6-backlog.md` (their ids are noted; build them here, not twice). One PR per row, about 400 lines or fewer; split a row if it grows past that.

| # | Task | Done when |
|---|------|-----------|
| S8-1 | Reply from the timeline (S6-12) | A person replies to a message from the app; it goes out by email with the linked item as a link, warns when the audience is wider than the project, and is audited |
| S8-2 | Task plan editing and site (S6-14, S6-16) | Owner, phase, subtasks, finish-to-start dependencies and site are editable on the items screen; board filters by site; changes audited; cycles refused |
| S8-3 | Gantt and dependency polish | A read-and-edit Gantt of phases and tasks: drag dates, dependency arrows, critical path highlight, today line, print to PDF; keyboard-usable; dependency rules shared with S8-2 |
| S8-4 | Plan import and templates (S6-17, S6-18) | MS Project XML and P6 XER/XML create or refresh phases, tasks and dates (people links kept, preview before apply); a manager creates a project from a past one (phases and tasks, no messages) |
| S8-5 | Search and timeline filters (S6-15) | Search also by date range and linked task; timeline filters by sender, date and item kind; filters survive in the URL |
| S8-6 | Bulk actions and keyboard shortcuts | Select many tasks or suggestions to set status, owner, date or dismiss in one audited action; shortcuts for search, new task, next and previous, with a help sheet; strings in EN/NL |
| S8-7 | In-app notifications | Bell with unread count and live updates (mentions, assignments, due soon, new suggestions); mark read; respects the email preferences from S6-9; no per-person analytics |
| S8-8 | Mobile PWA and offline | Installable app with manifest and service worker; read-only offline cache of the last project view; task status and notes queued offline and synced with conflict handling; tested with a mocked network |
| S8-9 | Message translation (S6-13) | A message can be shown in the reader's language with the original one click away; display only; Bedrock behind the existing AI switch, rules fallback shows the original |
| S8-10 | Weekly status report (S6-19) | Draft report from the week's timeline, tasks and risks, each claim linked to its source message; sent only after a click and audited |

## Order
S8-2 first (data the others use), then S8-3, S8-5, S8-6, S8-7, S8-1, S8-4, S8-8, S8-9, S8-10. S8-4 can be split into import and templates.
