import { t } from "@/lib/messages";

export default function Home() {
  return (
    <main className="home">
      <h1>{t("app.name")}</h1>
      <p>{t("app.tagline")}</p>
      <p className="status">{t("home.status")}</p>
    </main>
  );
}
