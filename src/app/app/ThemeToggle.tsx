"use client";

import { useSyncExternalStore } from "react";

const root = () => document.documentElement;
const subscribe = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(root(), { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
};

// Switches between the dark default and the light theme; the choice is kept in this browser only.
export function ThemeToggle({ label }: { label: string }) {
  const light = useSyncExternalStore(subscribe, () => root().dataset.theme === "light", () => false);
  const toggle = () => {
    if (light) delete root().dataset.theme;
    else root().dataset.theme = "light";
    try { localStorage.setItem("theme", light ? "dark" : "light"); } catch {}
  };
  return <button type="button" className="theme-toggle" aria-pressed={light} onClick={toggle}>{label}</button>;
}
