"use client";

import { useSyncExternalStore } from "react";

const root = () => document.documentElement;
const subscribe = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(root(), { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
};

// Switches between the light default and the opt-in dark theme; the choice is kept in this browser only.
export function ThemeToggle({ label }: { label: string }) {
  const light = useSyncExternalStore(subscribe, () => root().dataset.theme !== "dark", () => true);
  const toggle = () => {
    if (light) root().dataset.theme = "dark";
    else delete root().dataset.theme;
    try { localStorage.setItem("theme", light ? "dark" : "light"); } catch {}
  };
  return <button type="button" className="theme-toggle" aria-pressed={light} aria-label={label} title={label} onClick={toggle} />;
}
