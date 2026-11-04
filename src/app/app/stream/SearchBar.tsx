"use client";

import { useEffect, useRef, useState } from "react";

// Hidden until Ctrl/Cmd+F on the Stream page; Esc closes it. A plain GET form, so the server filters as before.
export function SearchBar({ action, projectId, source, q, label }: { action: string; projectId: string; source?: string; q?: string; label: string }) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") { e.preventDefault(); setOpen(true); input.current?.focus(); input.current?.select(); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  return (
    <form action={action} role="search" className="msgs-search" hidden={!open}>
      <input type="hidden" name="project" value={projectId} />
      {source && <input type="hidden" name="source" value={source} />}
      <input ref={input} type="search" name="q" defaultValue={q} placeholder={label} aria-label={label} />
    </form>
  );
}
