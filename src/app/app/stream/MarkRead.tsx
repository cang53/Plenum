"use client";

import { useEffect } from "react";

// Remembers on this device when the stream was last opened; the next visit draws the New line from it.
export function MarkRead({ projectId }: { projectId: string }) {
  useEffect(() => {
    document.cookie = `stream-read-${projectId}=${new Date().toISOString()}; path=/app; max-age=31536000; samesite=lax`;
  }, [projectId]);
  return null;
}
