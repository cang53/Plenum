# Chatrooms and threads backlog

Direction approved by Celal on 24 Nov 2026 (analysis: `chatroom-rework/analysis.md` in the project files). A project holds chatrooms (General always exists); a chatroom holds titled threads started from a message. Project tools become tabs in the project header. New colours from the mockup replace the current palette. Teams is removed; email comes in through the CC'd project address. No DMs. Every AI change keeps its human click and source link.

| # | Task | Done when |
|---|------|-----------|
| CR-1 | Database | `chatrooms`, `threads`, `messages.chatroom_id` and `thread_id`, General for every project, backfill (email grouped by subject into threads), `create_chatroom`, `start_thread`, `move_thread`, `post_message` with thread and chatroom, RLS tests. No UI. **Done in this PR** |
| CR-2 | Remove Teams. **Done in this PR** | Teams code, settings field, job, badge and docs removed; inbound email joins a thread by subject / In-Reply-To in General |
| CR-2b | Email into threads | Inbound email joins a thread by subject or In-Reply-To in General; a new subject starts a thread |
| CR-3 | Shell | Tree sidebar (project, chatrooms, threads), breadcrumb, project header tabs, new colour tokens |
| CR-4 | Chatroom feed | Header with pin and search, messages, thread chip, system lines, composer |
| CR-5 | Thread panel | Side panel with its own composer, deep links, thread entries in the sidebar |
| CR-6 | AI in threads | @cobia and triage scoped to the thread; suggestion and proposal cards in the panel; "Based on" deep links |
| CR-7 | Search, pins, My Chatroom | Search scoped to a chatroom, pins in the header, personal view of my threads and mentions |
| CR-8 | Mobile and accessibility | Drawer sidebar, full-screen thread, axe pass |
