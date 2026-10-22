import { getT } from "@/lib/locale";

// Every signed-in page gets one way back to the project list.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <>
      <nav className="topbar" aria-label={t("app.home")}>
        <a href="/app">{t("app.home")}</a>
      </nav>
      {children}
    </>
  );
}
