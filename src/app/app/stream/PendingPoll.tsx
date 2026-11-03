"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Lives only while the feed shows "Agent is writing…", so every viewer sees the reply arrive.
export function PendingPoll() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
