"use client";
import { t } from "@/lib/messages";

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="page">
      <p role="alert">{t("app.error")}</p>
      <button type="button" className="button" onClick={reset}>{t("app.retry")}</button>
    </main>
  );
}
