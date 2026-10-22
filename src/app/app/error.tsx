"use client";
import { useEffect, useState } from "react";
import { logError } from "@/lib/log";
import { reportClientError } from "@/lib/report-client";
import { isLocale, t, type Locale } from "@/lib/messages";

export default function ErrorState({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    logError("page failed", error);
    reportClientError(error);
  }, [error]);
  // The layout sets <html lang> from the person's language; read it after load to avoid a server mismatch.
  const [language, setLanguage] = useState<Locale>("en");
  useEffect(() => {
    // Read after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLocale(document.documentElement.lang)) setLanguage(document.documentElement.lang);
  }, []);
  return (
    <main id="main" className="page">
      <div className="surface" style={{ padding: "var(--s5)" }}>
      <p role="alert">{t("app.error", language)}</p>
      <button type="button" className="btn btn-secondary" onClick={reset}>{t("app.retry", language)}</button>
      </div>
    </main>
  );
}
