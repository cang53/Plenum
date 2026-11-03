"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// Disabled while the message is sending, so repeated clicks or Enter cannot post it twice.
export function SendButton({ label, disabled, children }: { label: string; disabled?: boolean; children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="send" disabled={disabled || pending} aria-label={label} title={label}>{children}</button>;
}
