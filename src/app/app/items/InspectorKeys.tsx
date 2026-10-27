"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Escape closes the inspector (a form with typed-in changes asks first), and the title field takes focus when a create form opens.
export function InspectorKeys({ closeHref, discard, focusTitle = false }: { closeHref: string; discard: string; focusTitle?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (focusTitle) document.querySelector<HTMLInputElement>(".item-inspector [name=title]")?.focus();
    let dirty = false;
    const mark = () => { dirty = true; };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if (!dirty || confirm(discard)) router.push(closeHref);
    };
    const root = document.querySelector(".item-inspector");
    root?.addEventListener("input", mark);
    document.addEventListener("keydown", onKey);
    return () => { root?.removeEventListener("input", mark); document.removeEventListener("keydown", onKey); };
  }, [closeHref, discard, focusTitle, router]);
  return null;
}
