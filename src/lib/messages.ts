// Interface copy lives here so it can be translated later; components never hard-code strings.
export const messages = {
  en: {
    "app.name": "Plenum",
    "app.tagline":
      "One project timeline for industrial teams. Teams messages and emails become tasks, decisions and reports, and a person approves every AI suggestion.",
    "home.status": "Under construction: stage 2, the core loop.",
    "home.demoLink": "Open the demo board",
    "board.title": "Board",
    "board.intro": "The same tasks as the Gantt view. Drag a card, or use its status menu, to change its status.",
    "board.filterPhase": "Phase",
    "board.filterOwner": "Owner",
    "board.all": "All",
    "board.empty": "No tasks",
    "board.due": "Due",
    "board.statusLabel": "Status",
    "board.demoNotice": "Demo data: changes are not saved yet.",
    "status.todo": "To do",
    "status.in_progress": "In progress",
    "status.blocked": "Blocked",
    "status.done": "Done",
  },
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof (typeof messages)["en"];

export function t(key: MessageKey, locale: Locale = "en"): string {
  return messages[locale][key] ?? messages.en[key];
}
