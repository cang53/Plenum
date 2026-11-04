import { getT } from "@/lib/locale";

export default async function CharterPage() {
  const t = await getT();
  return <main id="main" className="page"><h1>{t("app.charter")}</h1><p className="intro">{t("risks.soon")}</p></main>;
}
