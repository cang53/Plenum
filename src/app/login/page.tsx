import { authProvider } from "@/auth/provider";
import { t } from "@/lib/messages";
import { sendLink } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const { next, sent, error } = await searchParams;
  return (
    <main className="home">
      <h1>{t("login.title")}</h1>
      {authProvider() === "entra" ? (
        <p>{t("login.entraSoon")}</p>
      ) : sent ? (
        <p role="status">{t("login.sent")}</p>
      ) : (
        <form action={sendLink}>
          <p>{t("login.intro")}</p>
          {error && <p role="alert">{t("login.error")}</p>}
          <input type="hidden" name="next" value={next ?? ""} />
          <label>
            {t("login.email")}
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <button type="submit">{t("login.submit")}</button>
        </form>
      )}
    </main>
  );
}
