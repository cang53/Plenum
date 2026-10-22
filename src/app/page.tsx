import Link from "next/link";
import { t } from "@/lib/messages";

export default function Home() {
  return (
    <main className="home">
      <h1>{t("app.name")}</h1>
      <p>{t("app.tagline")}</p>
      <p className="status">{t("home.status")}</p>
      <p>
        <Link href="/login">{t("home.signIn")}</Link>
      </p>
      <p>
        <Link href="/demo/board">{t("home.demoLink")}</Link>
      </p>
      <p>
        <Link href="/demo/timeline">{t("home.demoTimeline")}</Link>
      </p>
    </main>
  );
}
