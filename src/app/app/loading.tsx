import { t } from "@/lib/messages";

export default function Loading() {
  return <main id="main" className="page" aria-busy="true"><p role="status" className="intro">{t("app.loading")}</p></main>;
}
