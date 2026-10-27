import { getT } from "@/lib/locale";
import { ItemsSkeleton } from "./Notice";

export default async function Loading() {
  const t = await getT();
  return <main id="main" className="page items-page"><ItemsSkeleton label={t("items.loading")} /></main>;
}
