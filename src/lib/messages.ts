// Interface copy lives in one file per language so it can be translated; components never hard-code strings.
import { en } from "./messages.en";
import { nl } from "./messages.nl";

export const messages = { en, nl } as const;

export type Locale = keyof typeof messages;

// The locale used for dates, times and numbers.
export const intlLocale: Record<Locale, string> = { en: "en-GB", nl: "nl-NL" };
export type MessageKey = keyof typeof en;

export function isLocale(value: string): value is Locale {
  return value in messages;
}

export function t(key: MessageKey, locale: Locale = "en"): string {
  return (messages[locale] as Record<string, string>)[key] ?? en[key];
}
