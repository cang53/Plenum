"use client";

import { useState, type ReactNode } from "react";

// A search box above a list of options: options whose text does not match are hidden (the form still holds every choice).
export function PopSearch({ label, children }: { label: string; children: ReactNode }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  return (
    <>
      <input type="search" className="pop-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={label} aria-label={label} />
      <div className="pop-list" ref={(el) => el?.querySelectorAll<HTMLElement>("[data-search]").forEach((o) => { o.hidden = !!needle && !o.dataset.search?.includes(needle); })}>{children}</div>
    </>
  );
}
