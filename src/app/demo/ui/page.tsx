import { t, type Locale } from "@/lib/messages";

const languages: Locale[] = ["en", "nl"];

function Kit({ locale }: { locale: Locale }) {
  const l = (key: Parameters<typeof t>[0]) => t(key, locale);
  return (
    <section lang={locale} className="surface" style={{ padding: "var(--s6)", display: "grid", gap: "var(--s6)" }}>
      <h2>{l(`ui.lang.${locale}` as "ui.lang.en")}</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
        <button className="btn btn-primary">{l("ui.btn.primary")}</button>
        <button className="btn btn-secondary">{l("ui.btn.secondary")}</button>
        <button className="btn btn-plain">{l("ui.btn.plain")}</button>
        <button className="btn btn-danger">{l("ui.btn.danger")}</button>
        <button className="btn btn-primary" disabled>{l("ui.btn.disabled")}</button>
      </div>

      <div style={{ display: "grid", gap: "var(--s4)", maxWidth: "24rem" }}>
        <div>
          <label className="field-label" htmlFor={`name-${locale}`}>{l("ui.field.label")}</label>
          <input className="field" id={`name-${locale}`} placeholder={l("ui.field.placeholder")} />
        </div>
        <div>
          <label className="field-label" htmlFor={`bad-${locale}`}>{l("ui.field.label")}</label>
          <input className="field" id={`bad-${locale}`} aria-invalid="true" aria-describedby={`err-${locale}`} defaultValue="?" />
          <p className="field-error" id={`err-${locale}`}>{l("ui.field.error")}</p>
        </div>
        <input className="field" disabled aria-label={l("ui.field.disabled")} placeholder={l("ui.field.disabled")} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
        <span className="badge">{l("ui.badge.neutral")}</span>
        <span className="badge badge-success">{l("ui.badge.success")}</span>
        <span className="badge badge-warning">{l("ui.badge.warning")}</span>
        <span className="badge badge-danger">{l("ui.badge.danger")}</span>
        <span className="badge badge-info">{l("ui.badge.info")}</span>
      </div>

      <div className="segmented" role="group" aria-label={l("ui.segmented.label")} style={{ justifySelf: "start" }}>
        <button aria-pressed="true">{l("ui.segmented.board")}</button>
        <button aria-pressed="false">{l("ui.segmented.timeline")}</button>
        <button aria-pressed="false">{l("ui.segmented.items")}</button>
      </div>

      <div className="glass" style={{ padding: "var(--s5)" }}>
        <strong>{l("ui.glass.title")}</strong>
        <p style={{ margin: "var(--s1) 0 0", color: "var(--text-secondary)" }}>{l("ui.glass.body")}</p>
      </div>

      {/* Open dialog shown inline so every state is visible without script. */}
      <dialog open className="dialog" aria-labelledby={`dlg-${locale}`} style={{ position: "static", margin: 0 }}>
        <h2 id={`dlg-${locale}`}>{l("ui.dialog.title")}</h2>
        <p>{l("ui.dialog.body")}</p>
        <div className="dialog-actions">
          <button className="btn btn-plain">{l("ui.dialog.cancel")}</button>
          <button className="btn btn-danger">{l("ui.dialog.confirm")}</button>
        </div>
      </dialog>
    </section>
  );
}

export default function DemoUiPage() {
  return (
    <div className="ambient">
      <main id="main" className="page">
        <h1>{t("ui.title")}</h1>
        <p className="intro">{t("ui.intro")}</p>
        <div style={{ display: "grid", gap: "var(--s6)", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" }}>
          {languages.map((locale) => <Kit key={locale} locale={locale} />)}
        </div>
      </main>
    </div>
  );
}
