"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// Shared popover for menus and listboxes: opens under its button, closes on outside click, Escape or Tab,
// moves between entries with the arrow keys and gives focus back to the button. Entries are role="menuitem" or role="option".
export function Pop({ trigger, label, role, className = "", panelClass = "", align = "start", onClose, children }: { trigger: ReactNode; label: string; role: "menu" | "listbox"; className?: string; panelClass?: string; align?: "start" | "end"; onClose?: () => void; children: ReactNode | ((close: () => void) => ReactNode) }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [back, setBack] = useState(0); // bumped when the menu closes from inside, so focus returns to the button
  const close = (refocus = true) => { setOpen(false); onClose?.(); if (refocus) setBack((n) => n + 1); };
  useEffect(() => { if (back) button.current?.focus(); }, [back]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close(false); };
    document.addEventListener("pointerdown", away);
    const first = root.current?.querySelector<HTMLElement>('[aria-checked="true"],[aria-selected="true"],[role="menuitem"],[role="option"]');
    first?.focus();
    return () => document.removeEventListener("pointerdown", away);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const entries = () => [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"],[role="option"]') ?? [])];
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") { close(false); return; }
    const all = entries(), at = all.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => { e.preventDefault(); all[(i + all.length) % all.length]?.focus(); };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(all.length - 1);
  };
  return (
    <div className={`mn ${className}`} ref={root} onKeyDown={onKey}>
      <button ref={button} type="button" className="mn-trigger" aria-haspopup={role === "menu" ? "menu" : "listbox"} aria-expanded={open} aria-controls={open ? id : undefined} aria-label={label}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); setOpen(true); } }}>
        {trigger}
      </button>
      {open && <div id={id} className={`mn-panel ${panelClass}`} role={role} aria-label={label} data-align={align}>{typeof children === "function" ? children(() => close()) : children}</div>}
    </div>
  );
}
