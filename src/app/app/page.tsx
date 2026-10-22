import { supabaseServer } from "@/auth/supabase";
import { t } from "@/lib/messages";

export default async function AppHome() {
  const { data } = await (await supabaseServer()).auth.getUser();
  return (
    <main className="home">
      <h1>{t("app.signedIn")}</h1>
      <p>{data.user?.email}</p>
      <form action="/auth/signout" method="post">
        <button type="submit">{t("app.signOut")}</button>
      </form>
    </main>
  );
}
