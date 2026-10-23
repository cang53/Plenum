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
    <main id="main" className="center-stage">
      <div className="surface state-card">
      <h1>{t("app.errorTitle", language)}</h1>
      <p role="alert">{t("app.error", language)}</p>
      <button type="button" className="btn btn-primary" onClick={reset}>{t("app.retry", language)}</button>
      </div>
    </main>
  );
}
