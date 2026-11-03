"use client";

import { useEffect } from "react";
import { browserVault } from "@/lib/offline-crypto";
import { flush, readQueue, saveSnapshot, type Snapshot } from "@/lib/offline-queue";
import { syncTaskChange } from "./actions";

// No visible UI: keeps the last view for the offline page and sends any changes still queued on this device.
export function OfflineTasks({ project, tasks }: { project: string; tasks: Snapshot["tasks"] }) {
  useEffect(() => {
    const sync = async () => {
      const v = await browserVault();
      if ((await readQueue(v)).length) await flush(v, syncTaskChange);
    };
    void browserVault().then(async (v) => {
      await saveSnapshot(v, { savedAt: new Date().toISOString(), project, tasks });
      void sync();
    });
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
