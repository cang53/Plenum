"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// Disabled while the message is sending, so repeated clicks or Enter cannot post it twice.
export function SendButton({ label, disabled, children }: { label: string; disabled?: boolean; children: ReactNode }) {
  const { pending } = useFormStatus();
  // When the send finishes, show the new message at the bottom.
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending) requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }));
    was.current = pending;
  }, [pending]);
  return <button type="submit" className="send" disabled={disabled || pending} aria-label={label} title={label}>{children}</button>;
}
