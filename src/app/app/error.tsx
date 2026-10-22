"use client";
import { useEffect } from "react";
import { logError } from "@/lib/log";
import { t } from "@/lib/messages";

export default function ErrorState({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => logError("page failed", error), [error]);
  return (
    <main id="main" className="page">
      <p role="alert">{t("app.error")}</p>
      <button type="button" className="button" onClick={reset}>{t("app.retry")}</button>
    </main>
  );
}
