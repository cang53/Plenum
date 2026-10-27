"use client";
import { useEffect, useState } from "react";
import { logError } from "@/lib/log";
import { reportClientError } from "@/lib/report-client";
import { isLocale, t, type Locale } from "@/lib/messages";
import { EmptyState } from "./Notice";

// A failed load keeps the shell: say what happened, that nothing changed, and offer Retry.
export default function ItemsError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    logError("items failed", error);
    reportClientError(error);
  }, [error]);
  const [language, setLanguage] = useState<Locale>("en");
  useEffect(() => {
    // Read after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLocale(document.documentElement.lang)) setLanguage(document.documentElement.lang);
  }, []);
  return (
    <main id="main" className="page items-page" role="alert">
      <EmptyState title={t("items.loadError", language)} body={t("items.loadErrorHelp", language)}>
        <button type="button" className="btn btn-primary" onClick={reset}>{t("app.retry", language)}</button>
      </EmptyState>
    </main>
  );
}
