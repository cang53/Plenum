import { getT } from "@/lib/locale";
import { STATUSES } from "@/domain/board";
import type { MessageKey } from "@/lib/messages";
import { OfflineView } from "./OfflineView";

// Public page the service worker shows when the network is down. It holds no data itself.
export default async function OfflinePage() {
  const t = await getT();
  const statuses = Object.fromEntries(STATUSES.map((s) => [s, t(`status.${s}` as MessageKey)]));
  return (
    <main id="main" className="page">
      <h1>{t("offline.title")}</h1>
      <p className="intro">{t("offline.intro")}</p>
      <OfflineView labels={{ empty: t("offline.empty"), saved: t("offline.saved"), pending: t("offline.pending"), statuses }} />
    </main>
  );
}
