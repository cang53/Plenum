"use client";

import { useEffect } from "react";
import { inboxAction } from "@/domain/inbox";

// A, D and H press the matching button of the focused card (the first card when none is focused); J and K move between cards.
export function InboxKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      const cards = [...document.querySelectorAll<HTMLElement>("[data-card]")];
      const at = cards.findIndex((c) => c.contains(document.activeElement));
      const key = e.key.toLowerCase();
      if (key === "j" || key === "k") return cards[Math.min(Math.max(at + (key === "j" ? 1 : -1), 0), cards.length - 1)]?.focus();
      const action = inboxAction(key);
      if (action) (cards[Math.max(at, 0)] ?? document).querySelector<HTMLElement>(`[data-act="${action}"]`)?.click();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
