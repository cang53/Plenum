"use client";

import { useEffect } from "react";
import { inboxAction } from "@/domain/inbox";

// A, D and H press the matching button of the open item; J and K move the list focus (shared keys) and open the row.
export function InboxKeys() {
  useEffect(() => {
    let moved = false;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      moved = e.key === "j" || e.key === "k";
      const action = inboxAction(e.key);
      if (action) document.querySelector<HTMLElement>(`[data-act="${action}"]`)?.click();
    };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (moved && el.matches("a[data-row]") && el.getAttribute("aria-current") !== "true") el.click();
      moved = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("focusin", onFocus); };
  }, []);
  return null;
}
