# Gaps

DECIDED = a DESIGN rule or another screen answers it. NEEDS ANSWER = changes behaviour, has no place in the design, or screens disagree.

## Shell and Overview
- G-1 DECIDED: search is a field in the mockup, a command menu in the app. Keep the menu (code decides behaviour); style its trigger as the field.
- G-2 DECIDED: name and role under the avatar. Show the signed-in email and role label from data the layout already has. No new profile field.
- G-3 DECIDED: icon rail needs a text label. Use `aria-label` and `title` from existing nav labels.
- G-4 NEEDS ANSWER: the mockup rail has Board, Items, Reports, Team; `nav.ts` hides those on purpose (routes still work). Charter, Roles, Logs, Privacy, Timelines have no icon. Proposal: show Board, Items, Reports, Team (Members) in the rail; Plan covers Gantt and Timelines; Charter, Roles, Logs, Privacy move into Settings as a list.
- G-5 DECIDED: phone drawer becomes the horizontal rail from the mockup; scrim and toggle removed.
- G-6 NEEDS ANSWER: project crumb and switcher are not in the mockup. Proposal: keep the switcher as a small control in the top bar next to the brand when there is more than one project.
- G-7 NEEDS ANSWER: "My work" quick link is not in the mockup. Proposal: keep as a pill on Items ("Mine").
- G-8 DECIDED: group headings and collapse toggle removed (a rail has no groups).
- G-9 NEEDS ANSWER: privacy capsule (trust rule, always visible) has no place. Proposal: footer line under the page content on every screen, linking to Privacy.
- G-10 NEEDS ANSWER: mockup is light only; the app has a theme toggle. Proposal: keep the toggle in the account menu and keep dark tokens.
- G-11 DECIDED: headline sentence is derived copy. Use the latest health label with the project name; sub line stays project and date. No invented schedule numbers.
- G-12 NEEDS ANSWER: Day/Week/Month filter would change what data shows. Proposal: leave out.
- G-13 DECIDED: milestone and risk numbers come from existing read queries under row-level security. No migration.
- G-14 DECIDED: "Waiting on you" is the project-wide count of pending suggestions, no per-person figure.
- G-15 NEEDS ANSWER: phases table needs owner, progress and plan variance per phase. Proposal: name, status and progress from tasks in the phase, finish from the latest due date; owner and "against plan" left out unless the phases table has them.
- G-16 NEEDS ANSWER: mockup columns To do / In progress / Waiting / Done vs app statuses todo / in_progress / blocked / done. Proposal: Waiting = blocked.
- G-17 DECIDED: card message count and avatar only where the board query already returns them; otherwise omit the field.
- G-18 NEEDS ANSWER: calendar and "Add event" have no data source for events. Proposal: read-only month grid with milestone and task due dates; no Add event.
- G-19 NEEDS ANSWER: mockup has an Apply button on the Overview card. Applying skips the review screen. Proposal: Review only; Apply stays on the review page behind a click, with the source link.
- G-20 NEEDS ANSWER: Team panel presence chips (On site, Office, Away) are per-person status with no data. Proposal: list members with role only, no presence.
- G-21 NEEDS ANSWER: existing Overview parts (health write form, attention, work summary, upcoming, activity, project address, rewards) are not in the mockup. Proposal: keep all, restyled, in a second block below the mockup layout.
