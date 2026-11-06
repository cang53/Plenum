"use client";

import { useState } from "react";

export type SourceOption = { value: string; label: string };

// Client-side only: sets data-filter on the chat container; CSS hides other sources. No counts, no server round trip.
export function SourceFilter({ options, allLabel, label }: { options: SourceOption[]; allLabel: string; label: string }) {
  const [active, setActive] = useState("");
  const pick = (value: string) => {
    setActive(value);
    const root = document.getElementById("main");
    if (!root) return;
    if (value) root.setAttribute("data-filter", value);
    else root.removeAttribute("data-filter");
  };
  const all = [{ value: "", label: allLabel }, ...options];
  return (
    <div className="fpills" role="group" aria-label={label}>
      {all.map((o) => (
        <button key={o.value} type="button" className="fpill" aria-pressed={active === o.value} onClick={() => pick(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
