"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { diffIds, isNearEnd } from "./follow";

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// All scrolling of the chat in one place: the message list is the only scroller.
// Opens at the bottom (or at the "new since you left" divider) before first paint, follows new messages while the reader is at the
// bottom, otherwise counts them for a pill, keeps the view still when older messages are added above, centres deep-linked messages,
// and keeps the composer above the on-screen keyboard.
export function useChatScroll(selector: string) {
  const [unseen, setUnseen] = useState(0);
  const [away, setAway] = useState(false);
  const [heard, setHeard] = useState("");
  const list = useRef<HTMLElement | null>(null);

  const toBottom = useCallback((smooth: boolean) => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: smooth && !reduced() ? "smooth" : "auto" });
  }, []);
  const jump = useCallback(() => { toBottom(true); setUnseen(0); }, [toBottom]);

  const center = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
    el.classList.add("hit");
    setTimeout(() => el.classList.remove("hit"), 1600);
    return true;
  }, []);

  useBeforePaint(() => {
    const f = document.querySelector<HTMLElement>(selector);
    if (!f) return;
    list.current = f;
    const divider = f.querySelector<HTMLElement>(".newline");
    const target = location.hash.startsWith("#msg-") ? document.getElementById(location.hash.slice(1)) : null;
    if (target) target.scrollIntoView({ block: "center", behavior: "auto" });
    else if (divider) f.scrollTop = divider.getBoundingClientRect().top - f.getBoundingClientRect().top + f.scrollTop - 8;
    else f.scrollTop = f.scrollHeight;
  }, [selector]);

  useEffect(() => {
    const f = list.current;
    if (!f) return;
    const ids = () => [...f.querySelectorAll<HTMLElement>("article.mail.msg[id]")].map((e) => e.id);
    let prev = ids();
    // The message at the top of the view and how far below the top edge it sits: restored after older messages arrive above,
    // so the result is the same whether or not the browser has already anchored the scroll position itself.
    let anchor: { id: string; offset: number } | null = null;
    const measure = () => {
      const top = f.getBoundingClientRect().top;
      const el = [...f.querySelectorAll<HTMLElement>("article.mail.msg[id]")].find((e) => e.getBoundingClientRect().bottom > top + 1);
      anchor = el ? { id: el.id, offset: el.getBoundingClientRect().top - top } : null;
    };
    measure();
    let atBottom = isNearEnd(f.scrollHeight, f.scrollTop, f.clientHeight);

    // Until the reader scrolls themselves, keep following the bottom while pictures and fonts settle; always remember the last height.
    let stick = !location.hash.startsWith("#msg-") && !f.querySelector(".newline");
    const settle = new ResizeObserver(() => { if (stick) f.scrollTop = f.scrollHeight; measure(); });
    [...f.children].forEach((c) => settle.observe(c));
    const unstick = () => { stick = false; };
    const stop = setTimeout(unstick, 3000);
    for (const ev of ["wheel", "touchstart", "pointerdown", "keydown"]) f.addEventListener(ev, unstick, { once: true, passive: true });

    const watch = new MutationObserver(() => {
      const next = ids();
      const { prepended, appended } = diffIds(prev, next);
      prev = next;
      // Older messages arrived above: keep the same message under the reader's eyes.
      const held = anchor && prepended.length ? document.getElementById(anchor.id) : null;
      if (held && anchor) f.scrollTop += held.getBoundingClientRect().top - f.getBoundingClientRect().top - anchor.offset;
      if (appended.length) {
        const nodes = appended.map((id) => document.getElementById(id));
        const mine = nodes.some((n) => n?.hasAttribute("data-mine"));
        if (atBottom || mine) { toBottom(true); setUnseen(0); } else setUnseen((n) => n + appended.length);
        const last = nodes[nodes.length - 1];
        const words = (last?.querySelector(".body")?.textContent ?? "").trim().split(/\s+/).slice(0, 8).join(" ");
        setHeard(`${last?.querySelector(".who b")?.textContent ?? ""}: ${words}`);
      }
      measure();
      [...f.children].forEach((c) => settle.observe(c));
    });
    watch.observe(f, { childList: true, subtree: true });

    const onScroll = () => {
      measure();
      atBottom = isNearEnd(f.scrollHeight, f.scrollTop, f.clientHeight);
      if (!atBottom) stick = false; // the reader moved away from the bottom: stop following
      setAway(!isNearEnd(f.scrollHeight, f.scrollTop, f.clientHeight, 240));
      if (atBottom) setUnseen(0);
    };
    f.addEventListener("scroll", onScroll, { passive: true });

    // "Based on" links and message anchors: centre the message and flash it.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#msg-"]');
      if (!a || !center(a.getAttribute("href")!.slice(1))) return;
      e.preventDefault();
      history.replaceState(null, "", a.getAttribute("href"));
    };
    document.addEventListener("click", onClick);

    // On a phone the keyboard shrinks the visual viewport: lift the composer and stay at the bottom if we were there.
    const vv = window.visualViewport;
    const onKeyboard = () => {
      if (!vv) return;
      document.documentElement.style.setProperty("--kb", `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
      if (atBottom) f.scrollTop = f.scrollHeight;
    };
    vv?.addEventListener("resize", onKeyboard);
    onScroll();
    return () => {
      watch.disconnect();
      settle.disconnect();
      clearTimeout(stop);
      f.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      vv?.removeEventListener("resize", onKeyboard);
      document.documentElement.style.removeProperty("--kb");
    };
  }, [selector, toBottom, center]);

  return { list, unseen, away, heard, jump, toBottom, center };
}
