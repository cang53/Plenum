"use client";

import { useState, type ReactNode } from "react";

// Shows one AI suggestion at a time; the others stay mounted so a half-edited form is not lost.
export function SuggestionCarousel({ prev, next, children }: { prev: string; next: string; children: ReactNode[] }) {
  const [i, setI] = useState(0);
  const n = children.length;
  return (
    <div className="carousel">
      <div className="carousel-nav">
        <button type="button" className="carousel-btn" aria-label={prev} disabled={i === 0} onClick={() => setI(i - 1)}>‹</button>
        <span aria-live="polite">{i + 1} / {n}</span>
        <button type="button" className="carousel-btn" aria-label={next} disabled={i === n - 1} onClick={() => setI(i + 1)}>›</button>
      </div>
      <div className="carousel-track">{children.map((c, k) => <div key={k} className="carousel-slide" data-pos={k < i ? "before" : k > i ? "after" : "now"} aria-hidden={k !== i}>{c}</div>)}</div>
    </div>
  );
}
