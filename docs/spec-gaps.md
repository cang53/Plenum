# Spec gaps (S6-7)

The v1 spec compared with the app on main. "Fixed" items went in with S6-7; "Queued" items are rows S6-12 and up in `stage6-backlog.md`. Stages 4 to 6 of the spec (Gantt, timesheets, rewards) are later stages, not gaps in the pilot bar, but are listed so nothing is lost.

## Fixed in S6-7
- Search finds a message by sender (name or address), not only by word (migration 27).
- Task create and edit on the items screen now set start date and cost code (spec: "start and due dates ... optional cost code").

## Queued
| Spec item | State | Row |
|---|---|---|
| Reply from the timeline through the original channel, with a wider-audience warning | Not built (`message.reply` is only a permission) | S6-12 |
| Translate a message, original one click away | Not built | S6-13 |
| Task owner, phase and subtasks editable in the UI; finish-to-start dependencies in the UI | Columns exist, no screen | S6-14 |
| Search by date and by linked task; timeline filters | Word and sender only | S6-15 |
| Board filter by site | No site on tasks | S6-16 |
| Project templates; create a project from a past one | Not built | S6-17 |
| P6 XER/XML and MS Project import | Not built | S6-18 |
| Weekly status report agent | Not built | S6-19 |
| Teams channel messages | Needs the Teams app and admin approval | later |
| Gantt, timesheets, team rewards (admin switch per site) | Stages 4 to 6 of the spec | later |
| Admin role as its own role and per-site reward switch | Admin is a workspace flag today | with rewards |

## Sweep S10-5
Spec re-read against main after stages 6 to 10. Closed since S6-7: reply, translation, task plan and site, search and timeline filters, templates, XER/XML import with dependencies and resources, weekly report (with risks and site logs), baselines, attachment tags and text, export and deletion, offline PWA. Every row S6-12 to S6-19 above is built.

| Spec item | State | Row |
|---|---|---|
| Milestones on the Gantt; milestone celebration reward | No milestone flag on tasks | S10-7 |
| "Rejected suggestions are logged so accuracy can be measured per project" | Dismissed status is stored; no per-project count anywhere | S10-8 |
| Reply drafting agent (draft in the sender's language, person approves) | Not built; replies are typed by hand | S10-9 |
| Timesheets: grid, AI draft, approval, CSV export | Not built (only `hours.log` permission) | later (spec stage 5) |
| Team rewards and per-site switch | Not built | later (spec stage 6) |
| Teams channel messages | Needs the Teams app and admin approval | later |
| Live Entra ID, SES and Bedrock | Built behind switches; waiting on accounts | later (accounts) |
| Admin as its own role | Still a workspace flag | later, with rewards |
| Critical path highlight | Built in S8-3 though the spec lists it out of v1; kept | none |

## Sweep S11-8
Spec re-read against main after stage 11. Closed since S10-5: milestones (S10-7), accepted and dismissed counts per project (S10-8), reply drafting (S10-9), and timesheets: grid, approval and lock, CSV export, AI draft with source links (S11-3 to S11-6). The timesheet table row in the S10-5 sweep above is now built. Admin as its own role is S11-7.

| Spec item | State | Row |
|---|---|---|
| Team rewards and per-site switch | Not built; waits for live accounts and the pilot | later (spec stage 6) |
| Teams channel messages | Needs the Teams app and admin approval | later |
| Live Entra ID, SES and Bedrock | Built behind switches; waiting on accounts | later (accounts) |
