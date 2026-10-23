"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { shortcutFor } from "@/domain/shortcuts";

type Labels = Record<"title" | "close" | "search" | "new" | "next" | "prev" | "help", string>;

// Keyboard shortcuts for the signed-in app, with a help sheet on "?".
export function Shortcuts({ labels }: { labels: Labels }) {
  const router = useRouter();
  const sheet = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const move = (step: number) => {
      const rows = [...document.querySelectorAll<HTMLElement>("main [data-row]")];
      const at = rows.indexOf(document.activeElement as HTMLElement);
      rows[Math.min(Math.max(at + step, 0), rows.length - 1)]?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      const action = shortcutFor({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, typing });
      if (!action) return;
      e.preventDefault();
      const project = new URLSearchParams(window.location.search).get("project");
      if (action === "search") document.querySelector<HTMLInputElement>('.shell-search input[type="search"]')?.focus();
      else if (action === "new") router.push(project ? `/app/items?project=${encodeURIComponent(project)}` : "/app/items");
      else if (action === "next") move(1);
      else if (action === "prev") move(-1);
      else if (sheet.current?.open) sheet.current.close();
      else sheet.current?.showModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);
  const rows: [string, string][] = [["/", labels.search], ["n", labels.new], ["j", labels.next], ["k", labels.prev], ["?", labels.help]];
  return (
    <dialog ref={sheet} className="dialog" aria-label={labels.title}>
      <h2>{labels.title}</h2>
      <dl>
        {rows.map(([key, what]) => (
          <div key={key}><dt><kbd>{key}</kbd></dt><dd>{what}</dd></div>
        ))}
      </dl>
      <form method="dialog"><button className="btn btn-secondary">{labels.close}</button></form>
    </dialog>
  );
}
