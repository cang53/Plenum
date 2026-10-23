"use client";

import { useEffect } from "react";
import { QUEUE_KEY, VIEW_KEY } from "@/lib/offline-queue";

// Registers the service worker. On the sign-in page it also wipes the offline copy, so signing out leaves nothing behind.
export function OfflineBoot() {
  useEffect(() => {
    if (location.pathname === "/login") {
      try { localStorage.removeItem(VIEW_KEY); localStorage.removeItem(QUEUE_KEY); } catch {}
    }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
