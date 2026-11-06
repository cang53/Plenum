"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MAX_PAGES } from "@/domain/paging";

// Sits at the top of the message list. When it scrolls into view it asks the page for one more page of older messages, which are
// added above the current ones (the chat scroll hook keeps the reader's place). Without scripts it stays a plain link.
export function EarlierLoader({ href, loadHref, pages, label, loading }: { href: string; loadHref: string; pages: number; label: string; loading: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const mark = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => { busy.current = pending; }, [pending]);
  useEffect(() => {
    const el = mark.current;
    if (!el || pages >= MAX_PAGES) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || busy.current) return;
      busy.current = true;
      start(() => router.replace(loadHref, { scroll: false }));
    }, { root: el.closest(".feed"), rootMargin: "120px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadHref, pages, router]);

  return (
    <div ref={mark} className="earlier">
      {pending ? <p className="earlier-skel" role="status"><span aria-hidden="true" /><span className="sr-only">{loading}</span></p> : <p><a href={href}>{label}</a></p>}
    </div>
  );
}
