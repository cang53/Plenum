"use client";

import { useEffect, useRef } from "react";
import { useChatScroll } from "./useChatScroll";

// Scrolls to the newest message (or the "new" divider), offers a jump control, and adds J/K/T/D/C/End keys. Works on the markup StreamView renders.
export function StreamKeys({ label, hint, count, countOne }: { label: string; hint: string; count: string; countOne: string }) {
  const { unseen, away, heard, jump, center } = useChatScroll(".chat .feed");
  const cur = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const cards = () => [...document.querySelectorAll<HTMLElement>(".msgs-main article.mail")];
    const focusCard = (el?: HTMLElement) => {
      if (!el) return;
      cur.current?.classList.remove("on");
      el.classList.add("on");
      cur.current = el;
      center(el.id);
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && el.matches(".comp [contenteditable]")) {
        e.preventDefault();
        const form = el.closest("form");
        if (!form?.querySelector(".send:disabled")) form?.requestSubmit();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, summary, [contenteditable]")) return;
      const list = cards();
      const at = cur.current ? list.indexOf(cur.current) : list.length;
      const k = e.key.toLowerCase();
      if (k === "j") focusCard(list[Math.min(at + 1, list.length - 1)]);
      else if (k === "k") focusCard(list[Math.max(at - 1, 0)]);
      else if (k === "t") cur.current?.querySelector<HTMLButtonElement>("[data-act=task]")?.click();
      else if (k === "d") cur.current?.querySelector<HTMLButtonElement>("[data-act=pin]")?.click();
      else if (k === "c") { e.preventDefault(); document.querySelector<HTMLElement>(".comp [contenteditable]")?.focus(); }
      else if (e.key === "End") { e.preventDefault(); jump(); }
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [center, jump]);

  const arrow = <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const text = unseen === 1 ? countOne : count.replace("{n}", String(unseen));
  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">{heard}</p>
      {unseen > 0 ? <button type="button" className="jump btn btn-primary" onClick={jump}>{arrow}{text}</button>
        : away ? <button type="button" className="jump btn btn-primary" title={hint} onClick={jump}>{arrow}{label}</button> : null}
    </>
  );
}
