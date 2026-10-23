"use client";
import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client";
import { t } from "@/lib/messages";

// Last resort when the root layout itself fails; it replaces <html>, so it brings its own.
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportClientError(error), [error]);
  return (
    <html lang="en">
      <body className="flat-error">
        <p role="alert">{t("app.error", "en")}</p>
        <button type="button" onClick={reset}>{t("app.retry", "en")}</button>
      </body>
    </html>
  );
}
