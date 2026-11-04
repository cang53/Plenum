"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { liveChannelSpec } from "./live";

const HEARTBEAT = 30; // seconds between safety refreshes while live
const DOWN = 3; // seconds between refreshes while the live connection is down

// Keeps the Stream current for everyone: Supabase Realtime tells us when a message or an AI card changes
// (row-level security still applies, so people only hear about their own projects), then the page re-reads.
// If the live connection is down, a slow refresh keeps the feed from going stale.
export function LiveStream({ projectId }: { projectId: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const again = useRef(false);
  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    let live = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One page re-read at a time: changes that arrive meanwhile are folded into a single follow-up.
    const run = () => {
      if (busy.current) { again.current = true; return; }
      busy.current = true;
      router.refresh();
      setTimeout(() => { busy.current = false; if (again.current) { again.current = false; run(); } }, 700);
    };
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    };
    // Realtime must carry the signed-in person's token, or row-level security hides every row from it without any error.
    let gone = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const auth = supabase.auth.onAuthStateChange((_e, session) => { if (session?.access_token) void supabase.realtime.setAuth(session.access_token); });
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (gone) return;
      if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
      const spec = liveChannelSpec(projectId);
      channel = supabase.channel(spec.name);
      for (const f of spec.filters) channel = channel.on("postgres_changes", f, refresh);
      channel.subscribe((status, err) => {
        live = status === "SUBSCRIBED";
        if (!live && status !== "CLOSED") console.warn("Stream live connection:", status, err?.message ?? "");
      });
    })();
    // Safety net: quick while the live connection is down, a slow heartbeat while it is up.
    let ticks = 0;
    const fallback = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      ticks += 1;
      if (live ? ticks % HEARTBEAT === 0 : ticks % DOWN === 0) run();
    }, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      clearTimeout(timer);
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      auth.data.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [projectId, router]);
  return null;
}
