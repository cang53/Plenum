import { cookies } from "next/headers";
import { isLocale, t, type Locale, type MessageKey } from "@/lib/messages";

export const LOCALE_COOKIE = "plenum-locale";

// The language the person chose in settings; English until they choose.
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value ?? "";
  return isLocale(value) ? value : "en";
}

export async function getT(): Promise<(key: MessageKey) => string> {
  const locale = await getLocale();
  return (key) => t(key, locale);
}
