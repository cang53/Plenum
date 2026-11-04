import { getT } from "@/lib/locale";

export default async function LibraryPage() {
  const t = await getT();
  return <main id="main" className="page"><h1>{t("app.library")}</h1><p className="intro">{t("risks.soon")}</p></main>;
}
