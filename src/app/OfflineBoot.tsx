"use client";

import { useEffect } from "react";
import { idbKeyStore } from "@/lib/offline-crypto";
import { wipe } from "@/lib/offline-queue";

// Registers the service worker. On the sign-in page it also wipes the offline copy and its key, so signing out leaves nothing behind.
export function OfflineBoot() {
  useEffect(() => {
    if (location.pathname === "/login") {
      try { wipe(localStorage); } catch {}
      idbKeyStore.clear().catch(() => {});
    }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
