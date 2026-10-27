# Plenum: App flow

Version 1.0 · 2026-10-27 · Companion to [PRD.md](PRD.md) (French) and [TRD.md](TRD.md). Describes the app on `main` after stage 13: screens, navigation, and the main user journeys. Routes are taken from `src/app`.

---

## 1. Screen map

```
/                      → redirects to /app
/login                 email link (or Microsoft button when AUTH_PROVIDER=entra)
/auth/callback         completes email sign-in, accepts pending invitations
/auth/entra            completes Microsoft sign-in
/auth/signout          signs out, back to /login
/offline               shown by the PWA when there is no network

/app                   Overview (project cards, attention list, AI review entry, health, rewards)
/app/welcome           First-run wizard: workspace + project, then invite people
/app/stream            Timeline of messages (the home feed)
/app/board             Board: To do, In progress, Blocked, Done
/app/gantt             Timeline (Gantt) with dependencies, milestones, baselines
/app/items             Items: tasks, decisions, risks, change requests (list + create)
/app/tasks/[id]        Task inspector (side sheet or full page)
/app/sitelog           Site log
/app/timesheet         My weekly timesheet
/app/timesheets        Team timesheets: approve or return (project managers)
/app/reports           Weekly status report drafts (project managers)
/app/search            Search results
/app/notifications     Inbox
/app/import            Plan import (P6 XER/XML, MS Project XML); /app/import/resources
/app/members           People and invitations
/app/roles             Role matrix (admins)
/app/audit             Audit log + CSV (project managers, admins)
/app/privacy           Export, retention, deletion
/app/settings          Project and workspace settings, reward switches, templates

/demo/*                Static clickable demos (board, gantt, messages, timeline, ui)
```

Every `/app/*` page except the wizard shows the shell: left navigation, top bar (project switcher, search, bell, user menu), and the segmented switch **Board / Timeline / Items** on the three plan views. Pages carry the project in `?project=<id>`.

## 2. Global navigation

| Group | Entries (role needed) |
|---|---|
| Project | Stream, Overview, Board, Timeline (Gantt), Items |
| Site | Site log, My timesheet, Team timesheets |
| Admin | Members, Audit (PM, admin), Reports (PM, admin), Roles (admin), Privacy, Settings |

Role-based entries come from `src/lib/nav.ts`. The interface only hides what a role cannot use; the database (RLS) decides what data comes back.

Shortcuts: `/` open command menu and search, `c` new item, `j` / `k` next / previous row, `?` shortcut help. Shortcuts are off while typing. The **command menu** jumps to any page, project or task.

## 3. Journeys

### 3.1 First run: sign in and create a project
1. Visitor opens the site → `/login`.
2. Enters work email → "check your email" notice (`?sent=1`). Entra mode shows a Microsoft button instead. Errors return to `/login?error=1`.
3. Clicks the link → `/auth/callback` signs in, runs `accept_my_invitations`, then goes to the page asked (`next`) or `/app`.
4. `/app` sees no projects → `/app/welcome` step 1: workspace name, project name, optional "add demo data" → project created.
5. Step 2 (same page, `?project=`): shows the project's email address, invite people by email and role. "Finish" sets a cookie and goes to `/app`. The step is skipped for anyone who is not alone in a single project.
6. Invited people skip the wizard: they land on `/app` with the projects they were invited to.

### 3.2 Messages to tasks (the core loop)
1. An email CC'd to the project address arrives (SES → webhook) and shows on **Stream** within a minute, with attachments and extracted text.
2. Triage creates at most one suggestion under the message: kind (task, decision, risk, change request), title, details, and the reason it was made.
3. A person with the right role chooses **Accept** (optionally edit first), **Dismiss**, or **Snooze**. Accept creates the item with a link back to the message; the audit log records who did it.
4. Alternatively the person creates the item by hand from the message (two clicks) or from **Items**.
5. The new item appears on Board, Timeline and Items, and its inspector shows the source message.
6. The Overview "AI review" entry lists all pending suggestions for the project and the accepted/dismissed counts.

### 3.3 Reply to a message
1. On Stream, open a message → **Reply**.
2. Optional **Draft reply** (AI, in the sender's language) fills the box; the person edits it.
3. If the sender is outside the project, a **wider audience** warning shows before sending.
4. **Send** goes out through the original channel with a link to the linked item; the send is audited. Failed sends are retried by the hourly job.
5. **Translate** on any message shows the reader's language, with the original one click away.

### 3.4 Plan the work
1. **Import** (PM): upload XER, XML or MS Project XML → preview → confirm; phases, tasks, dependencies and resources are created. On re-import the file wins on dates; owners and links added in Plenum stay.
2. Or start from **Settings → Create from template** (redirects to Items), or create tasks on **Items**.
3. **Items**: filter, create, edit; the inspector edits owner, phase, dates, cost code, site, subtasks and dependencies.
4. **Board**: drag a card between columns; filter by phase, owner, site. **Timeline**: drag or resize bars, see dependency arrows, today line, milestones, baselines and the critical path.
5. A change on one view shows on the others.

### 3.5 Task inspector
Open from any list, card or bar (`/app/tasks/[id]`; side sheet on wide screens). Sections: header (number, title, status, priority), plan (owner, dates, phase, site, cost code, milestone), subtasks and checklist, dependencies, linked messages and decisions, history. Keyboard: sheet keys move between tasks and close with Escape.

### 3.6 Weekly timesheet
1. Member or contributor opens **My timesheet** (current week).
2. Optional **AI draft** (from the week's activity) fills the grid with source links.
3. Person edits hours per task and day, adds notes, **Submits**. Nothing is submitted for them.
4. Project manager opens **Team timesheets**: reviews each person's week, **Approves** (week locks) or **Returns** with a comment; the person is notified and resubmits.
5. **Export CSV** by project, person, cost code and week.

### 3.7 Weekly status report
1. The hourly job drafts a report (timeline, task changes, risks, site logs), or the PM requests one on **Reports**.
2. PM reviews the draft; every line links to its source; edits as needed.
3. **Send** emails it (and later posts to Teams). The send is audited.

### 3.8 Site log
Site lead opens **Site log**, picks site and date, fills the entry, **Submits**. Submitted logs feed the weekly report.

### 3.9 Team rewards
On Overview, team-level cards show streak, early-warning and knowledge badges, milestone celebration and the team goal. A PM sets the monthly goal; an admin switches rewards on or off per site in **Settings**. When off, the cards disappear for that site. There are no per-person scores anywhere.

### 3.10 People, roles and access
1. PM or admin opens **Members** → invite by email with a role (member, contributor, project manager). The invitee gets an email link and is added on first sign-in.
2. Roles can be changed or removed on **Members**; the last admin cannot be removed. **Roles** shows what each role may do.
3. Contributors see only the projects they were invited to and only the screens their role allows.

### 3.11 Search and notifications
- Search from the top bar or `/`: by word, sender, date or linked task; results link to the message or item. Stream and Items also have filters.
- The bell shows unread count; **Notifications** lists assignments, replies, approvals and returned timesheets. Optional daily email digest is set per person in Settings.

### 3.12 Data control (admin)
**Privacy**: export all project data (JSON and CSV with attachments), set retention (30 to 3650 days), delete a project or a person permanently after a confirm dialog. **Audit**: browse and download the audit log.

### 3.13 Offline
The PWA installs from the browser. Offline, task edits are queued in an encrypted local store and sent on reconnect; navigating to an uncached page shows `/offline`.

## 4. State and edge cases

| Situation | What the person sees |
|---|---|
| Signed out on `/app/*` | Redirect to `/login?next=…` |
| No projects | Wizard at `/app/welcome` |
| Role lacks an action | Control hidden; if forced, the database refuses and a plain error shows |
| Loading | Route skeletons (`loading.tsx`) |
| Server error | Error page with retry (`error.tsx`, `global-error.tsx`); error is reported to the sink |
| Empty lists | Short plain explanation and the next step |
| No AI configured | Triage uses offline rules; suggestions still need a click |
| Destructive actions | Confirm dialog before delete, remove or lock |
| Rewards off for a site | Reward cards absent for that site |

## 5. Design rules the flow follows
- Every AI result is a suggestion with its reason and source link; nothing changes without a click.
- Plain English strings through `messages.en` / `messages.nl`; no hard-coded text in components.
- No per-person activity views anywhere in the navigation.
- Flat, dense, high-contrast visual style (stage 14), keyboard reachable, WCAG AA.
