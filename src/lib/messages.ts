// Interface copy lives here so it can be translated later; components never hard-code strings.
export const messages = {
  en: {
    "app.name": "Plenum",
    "app.tagline":
      "One project timeline for industrial teams. Teams messages and emails become tasks, decisions and reports, and a person approves every AI suggestion.",
    "home.status": "Under construction: stage 2, the core loop.",
    "home.demoLink": "Open the demo board",
    "home.demoTimeline": "Open the demo timeline",
    "home.signIn": "Sign in",
    "login.title": "Sign in",
    "login.intro": "Enter your work email. We send you a link that signs you in; there is no password.",
    "login.email": "Work email",
    "login.submit": "Send me a link",
    "login.sent": "Check your email for the sign-in link. You can close this page.",
    "login.error": "We could not send the link. Check the address and try again.",
    "login.entraSoon": "Sign-in with your company account is coming soon.",
    "app.signedIn": "You are signed in",
    "app.signOut": "Sign out",
    "board.title": "Board",
    "board.intro": "The same tasks as the Gantt view. Drag a card, or use its status menu, to change its status.",
    "board.filterPhase": "Phase",
    "board.filterOwner": "Owner",
    "board.all": "All",
    "board.empty": "No tasks",
    "board.due": "Due",
    "board.statusLabel": "Status",
    "board.demoNotice": "Demo data: changes are not saved yet.",
    "timeline.title": "Project timeline",
    "timeline.intro": "Every email sent to this project's address, newest first.",
    "timeline.search": "Search",
    "timeline.searchPlaceholder": "Words, sender or file name",
    "timeline.date": "Date",
    "timeline.clear": "Clear",
    "timeline.shown": "Messages shown:",
    "timeline.empty": "No messages yet. Email sent to the project address appears here within a minute.",
    "timeline.noResults": "No messages match your search.",
    "timeline.today": "Today",
    "timeline.yesterday": "Yesterday",
    "timeline.noSubject": "(no subject)",
    "timeline.attachments": "Attachments",
    "timeline.showMore": "Show the whole message",
    "timeline.showLess": "Show less",
    "timeline.demoNotice": "Demo data: these emails are examples, and attachments cannot be opened yet.",
    "link.action": "Create from this message",
    "link.kind": "Create a",
    "link.title": "Title",
    "link.details": "Details",
    "link.save": "Create",
    "link.cancel": "Cancel",
    "link.linked": "Linked items",
    "link.fromMessage": "Made from this message",
    "triage.title": "Suggested by AI",
    "triage.accept": "Accept",
    "triage.edit": "Edit",
    "triage.dismiss": "Dismiss",
    "triage.demoNotice": "Demo data: these suggestions are examples, not live AI output.",
    "kind.task": "Task",
    "kind.decision": "Decision",
    "kind.risk": "Risk",
    "kind.change_request": "Change request",
    "source.email": "Email",
    "status.todo": "To do",
    "status.in_progress": "In progress",
    "status.blocked": "Blocked",
    "status.done": "Done",
  },
} as const;

export type Locale = keyof typeof messages;

// The locale used for dates, times and numbers.
export const intlLocale: Record<Locale, string> = { en: "en-GB" };
export type MessageKey = keyof (typeof messages)["en"];

export function t(key: MessageKey, locale: Locale = "en"): string {
  return messages[locale][key] ?? messages.en[key];
}
