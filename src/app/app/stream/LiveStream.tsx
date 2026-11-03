"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { liveChannelSpec } from "./live";

const FALLBACK_MS = 15000;

// Keeps the Stream current for everyone: Supabase Realtime tells us when a message or an AI card changes
// (row-level security still applies, so people only hear about their own projects), then the page re-reads.
// If the live connection is down, a slow refresh keeps the feed from going stale.
export function LiveStream({ projectId }: { projectId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    let live = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };
    const spec = liveChannelSpec(projectId);
    let channel = supabase.channel(spec.name);
    for (const f of spec.filters) channel = channel.on("postgres_changes", f, refresh);
    channel.subscribe((status) => { live = status === "SUBSCRIBED"; });
    const fallback = setInterval(() => { if (!live && document.visibilityState === "visible") router.refresh(); }, FALLBACK_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [projectId, router]);
  return null;
}
