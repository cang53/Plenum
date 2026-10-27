"use client";

import { useEffect, useRef, useState } from "react";

// Scrolls to the newest message (or the "new" divider), offers a jump control, and adds J/K/T/D/C/End keys. Works on the markup StreamView renders.
export function StreamKeys({ label, hint }: { label: string; hint: string }) {
  const [away, setAway] = useState(false);
  const cur = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const cards = () => [...document.querySelectorAll<HTMLElement>(".msgs-main article.mail")];
    const latest = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    const focusCard = (el?: HTMLElement) => {
      if (!el) return;
      cur.current?.classList.remove("on");
      el.classList.add("on");
      cur.current = el;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    // Opens on the newest messages like a chat app, and keeps following the bottom while pictures and fonts load, until the person scrolls.
    let follow = true;
    const toEnd = () => window.scrollTo(0, document.documentElement.scrollHeight);
    toEnd();
    const watch = new ResizeObserver(() => follow && toEnd());
    watch.observe(document.body);
    const stop = () => { follow = false; };
    const done = setTimeout(() => { watch.disconnect(); }, 2500);
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchmove", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });
    const onScroll = () => setAway(document.documentElement.scrollHeight - window.scrollY - window.innerHeight > 240);
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && el.matches(".comp textarea")) {
        e.preventDefault();
        (el as HTMLTextAreaElement).form?.requestSubmit();
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
      else if (k === "c") { e.preventDefault(); document.querySelector<HTMLTextAreaElement>(".comp textarea")?.focus(); }
      else if (e.key === "End") { e.preventDefault(); latest(); }
      else return;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(done); watch.disconnect(); window.removeEventListener("wheel", stop); window.removeEventListener("touchmove", stop); window.removeEventListener("keydown", stop); window.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey); };
  }, []);

  return away ? (
    <button type="button" className="jump btn btn-primary" title={hint} onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}>↓ {label}</button>
  ) : null;
}
