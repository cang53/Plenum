import { authProvider, passwordLoginEnabled } from "@/auth/provider";
import { getT } from "@/lib/locale";
import { DEMO_ROLES, demoRolePickerEnabled } from "@/auth/demo-roles";
import { pickRole, sendLink, signInWithEntra, signInWithPassword } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const { next, sent, error } = await searchParams;
  const t = await getT();
  return (
    <main id="main" className="center-stage">
      <div className="surface state-card">
      <h1>{t(demoRolePickerEnabled() ? "login.pickTitle" : "login.title")}</h1>
      {demoRolePickerEnabled() ? (
        <form action={pickRole}>
          <p className="intro">{t("login.pickIntro")}</p>
          {error && <p role="alert">{t("login.pickError")}</p>}
          {DEMO_ROLES.map((r) => (
            <button key={r.key} type="submit" name="role" value={r.key} className="btn btn-primary">
              {t(`login.role.${r.key}`)}
            </button>
          ))}
        </form>
      ) : (
      <>
      {authProvider() === "entra" ? (
        <form action={signInWithEntra}>
          {error && <p role="alert">{t("login.entraError")}</p>}
          <input type="hidden" name="next" value={next ?? ""} />
          <button type="submit" className="btn btn-primary">{t("login.entra")}</button>
        </form>
      ) : sent ? (
        <p role="status" className="intro">{t("login.sent")}</p>
      ) : (
        <form action={sendLink}>
          <p className="intro">{t("login.intro")}</p>
          {error && <p role="alert">{t("login.error")}</p>}
          <input type="hidden" name="next" value={next ?? ""} />
          <label>
            <span className="field-label">{t("login.email")}</span>
            <input className="field" type="email" name="email" required autoComplete="email" />
          </label>
          <button type="submit" className="btn btn-primary">{t("login.submit")}</button>
        </form>
      )}
      {passwordLoginEnabled() && (
        <form action={signInWithPassword}>
          <input type="hidden" name="next" value={next ?? ""} />
          <label>
            <span className="field-label">{t("login.email")}</span>
            <input className="field" type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            <span className="field-label">{t("login.password")}</span>
            <input className="field" type="password" name="password" required autoComplete="current-password" />
          </label>
          <button type="submit" className="btn btn-primary">{t("login.passwordSubmit")}</button>
        </form>
      )}
      </>
      )}
      </div>
    </main>
  );
}
