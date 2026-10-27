# Stream: one project inbox and chat

## Problem
Project talk is scattered over email, Teams and chat. Today's Stream was a flat list of email cards with a dead composer. Reading meant scrolling, and replying was impossible.

## What other tools teach
- **Slack, Teams:** conversations and threads, a composer that never leaves the screen, unread markers, jump to latest.
- **Front, Missive:** one shared inbox over email and chat, with states (open, waiting, done), assignment and shared drafts. Sources are a badge, not a separate place.
- **Linear, Basecamp:** talk is attached to the work. Every message can become an issue, and the issue links back to the message.
- **Procore:** project records (RFIs, decisions) are the output of talk, with an audit trail.

## Concept
The Stream is **the project's conversation list plus a chat**. A conversation is a subject; email, Teams and Plenum messages on that subject sit in one thread, whichever platform they came from.

### Information architecture
- **Left, conversation list:** search, filter chips (All, Unread, Needs reply, Decisions) and a source filter (Email, Plenum, Teams). Each row shows subject, last line, source badges, an unread count and linked-item chips. Newest activity first.
- **Centre, conversation:** messages in reading order, day rules, a "New" line, a catch-up line on top, and a composer pinned at the bottom. A new conversation is started from the same composer by typing a subject.
- **Right, context:** linked tasks, risks and decisions of this conversation; pinned decisions.
- A flat feed is not offered: the conversation is the unit, because tasks, decisions and replies belong to a subject, not to a minute.

### States
- **Unread:** messages after the last visit on this device.
- **Needs reply:** the last message in the conversation came from outside Plenum.
- **Decision:** a manager pinned a message.
- Done/assigned states are left for later; the filters above cover the daily triage.

### Channels and sending
The composer sends into the conversation as a Plenum message, written by the database function `post_message`, which checks project access. A channel picker lists Plenum (live) and Email and Teams (disabled until their outbound connectors exist). The picker is built so enabling a channel is one option and one outbound queue.

### AI layer (always a human click, always linked to its source message)
- **Catch-up:** a one-line digest on top of the conversation: new messages, who wrote, how many AI suggestions wait. Today it is computed from the data; a model-written summary can replace the line later.
- **Suggestions:** tasks, decisions, risks and change requests appear under the message they came from, with Accept, Edit and Dismiss.
- **Quick actions on every message:** Create task (T), Pin as decision (D), Link to task.

### Linking
Each message shows the items it created or is linked to; the right column lists them for the whole conversation. Items link back to the source message.

### Search and filters
Search matches subject, sender and text of the loaded messages. Filters combine with search and are kept in the URL, so views can be shared.

### Notifications
Not built here. Rule for the later work: notify on a new message in a conversation you wrote in or were mentioned in, and send one daily digest for the rest. No per-person analytics.

### Mobile
Two screens: the conversation list, then the conversation with a back link. The composer is pinned above the bottom edge; actions stay as buttons of at least 30px.

### Keyboard
J/K move between messages, T creates a task, D pins as decision, C writes, End jumps to latest.

## Built now
Conversations (grouped by subject across sources), list with search and filters, unread and needs-reply states, catch-up line, pinned composer with a real send, channel picker, task/decision actions, mobile drill-in, `/demo/messages` with sample data.

## Not built
Teams and email outbound, assignment and done states, model-written summaries, notifications, mentions.

## Later ideas, not now
**Topic channels (SS, 27 Oct).** Each project keeps its default **General** chat, mapped to one Teams channel. Anyone can open a **topic channel** for a specific issue (for example "Gearbox delay"), also mapped to its own Teams channel, like the Topics rail in the Figma Messages frame. The Stream would show General by default, with topics one click away, and email could be filed into a topic.

Risks to weigh first:
- It can fragment the single chat that SS asked for. A rule is needed so topics stay the exception, for example an "All" view that mixes every channel in time order.
- Each topic needs a Teams channel and a mapping to keep in sync.
- Where an email goes (General or a topic) needs a rule or a person's click.

The database already has a `topics` table with `messages.topic_id` (migration 149), which could be the base. Not built, not scheduled.

## Files and pictures (built)
The paperclip, paste and drag-and-drop add up to 5 files (10 MB in total; pictures, PDF, text, Office, zip) to a message. Pictures show inline, other files as a link. Files sit in the private `message-files` bucket under `<project>/<message>/`; `add_message_file` records them on the sender's own new message. Needs migration 151 (`/mnt/project-files/db/apply-151.sql`).
