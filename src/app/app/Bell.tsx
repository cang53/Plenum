"use client";

import { useEffect, useState } from "react";

const EVERY_MS = 30_000;

// Inbox link with the unread count. It refreshes every half minute and when the tab gets focus back.
export function Bell({ href, initial, label, countLabel, current }: { href: string; initial: number; label: string; countLabel: (n: number) => string; current?: boolean }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/app/notifications/count").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCount(d.count)).catch(() => {});
    };
    const timer = setInterval(refresh, EVERY_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return (
    <a href={href} className={`shell-link${count ? " shell-unread" : ""}`} aria-current={current ? "page" : undefined} aria-label={count ? `${label}: ${countLabel(count)}` : label}>
      <span aria-hidden="true">{label}</span>
      <span role="status" className="shell-badge" hidden={count === 0}>{count > 99 ? "99+" : count}</span>
    </a>
  );
}
