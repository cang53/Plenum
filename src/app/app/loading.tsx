import { getT } from "@/lib/locale";

export default async function Loading() {
  const t = await getT();
  return <main id="main" className="page" aria-busy="true"><p role="status" className="intro">{t("app.loading")}</p></main>;
}
