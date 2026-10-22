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
