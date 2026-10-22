import { supabaseServer } from "@/auth/supabase";
import { listProjects } from "@/data/projects";
import { t } from "@/lib/messages";
import { redirect } from "next/navigation";
import { onboard } from "./actions";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await supabaseServer();
  if ((await listProjects(supabase)).length > 0) redirect("/app");
  const sp = await searchParams;
  return (
    <main id="main" className="page">
      <h1>{t("welcome.title")}</h1>
      <p className="intro">{t("welcome.intro")}</p>
      {sp.error && <p role="alert">{t("welcome.error")}</p>}
      <form action={onboard}>
        <p>
          <label>{t("welcome.workspace")} <input name="workspace" required /></label>
        </p>
        <p>
          <label>{t("welcome.project")} <input name="project" required /></label>
        </p>
        <p>
          <label><input type="checkbox" name="demo" /> {t("welcome.demo")}</label>
        </p>
        <button type="submit">{t("welcome.submit")}</button>
      </form>
    </main>
  );
}
