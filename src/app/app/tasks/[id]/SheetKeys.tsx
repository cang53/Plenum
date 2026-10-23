"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Escape closes the sheet, and focus moves to its Close link when it opens.
export function SheetKeys({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  useEffect(() => {
    document.querySelector<HTMLElement>("[data-close]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push(closeHref);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeHref, router]);
  return null;
}
