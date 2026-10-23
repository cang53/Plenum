import { getT } from "@/lib/locale";

export default async function Loading() {
  const t = await getT();
  return (
    <main id="main" className="center-stage" aria-busy="true">
      <div className="surface state-card">
        <p role="status" className="sr-only">{t("app.loading")}</p>
        <div className="skeleton" aria-hidden="true">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    </main>
  );
}
