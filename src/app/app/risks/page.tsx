import { getT } from "@/lib/locale";

// Placeholder until the risk and issue register is designed.
export default async function RisksPage() {
  const t = await getT();
  return (
    <main id="main" className="page">
      <h1>{t("app.risks")}</h1>
      <p className="intro">{t("risks.soon")}</p>
    </main>
  );
}
