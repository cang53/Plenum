"use client";
import { useEffect, useState } from "react";
import { logError } from "@/lib/log";
import { isLocale, t, type Locale } from "@/lib/messages";

export default function ErrorState({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => logError("page failed", error), [error]);
  // The layout sets <html lang> from the person's language; read it after load to avoid a server mismatch.
  const [language, setLanguage] = useState<Locale>("en");
  useEffect(() => {
    // Read after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLocale(document.documentElement.lang)) setLanguage(document.documentElement.lang);
  }, []);
  return (
    <main id="main" className="page">
      <p role="alert">{t("app.error", language)}</p>
      <button type="button" className="button" onClick={reset}>{t("app.retry", language)}</button>
    </main>
  );
}
