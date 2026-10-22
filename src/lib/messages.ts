// Interface copy lives here so it can be translated later; components never hard-code strings.
export const messages = {
  en: {
    "app.name": "Plenum",
    "app.tagline":
      "One project timeline for industrial teams. Teams messages and emails become tasks, decisions and reports, and a person approves every AI suggestion.",
    "home.status": "Under construction: stage 2, the core loop.",
  },
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof (typeof messages)["en"];

export function t(key: MessageKey, locale: Locale = "en"): string {
  return messages[locale][key] ?? messages.en[key];
}
