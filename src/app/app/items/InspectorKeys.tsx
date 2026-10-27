"use client";

import { useEffect, useRef } from "react";
import { softGo } from "./softNav";

type Text = { title: string; body: string; keep: string; discard: string };

// Escape closes the inspector; typed-in changes ask first in a dialog. A create form puts focus in its title field.
export function InspectorKeys({ closeHref, text, focusTitle = false }: { closeHref: string; text: Text; focusTitle?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (focusTitle) document.querySelector<HTMLInputElement>(".item-inspector [name=title]")?.focus();
    let dirty = false;
    const mark = () => { dirty = true; };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if (dirty) dialog.current?.showModal();
      else softGo(closeHref);
    };
    const root = document.querySelector(".item-inspector");
    root?.addEventListener("input", mark);
    document.addEventListener("keydown", onKey);
    return () => { root?.removeEventListener("input", mark); document.removeEventListener("keydown", onKey); };
  }, [closeHref, focusTitle]);
  return (
    <dialog ref={dialog} className="dialog pop" aria-labelledby="unsaved-title">
      <h3 id="unsaved-title">{text.title}</h3>
      <p>{text.body}</p>
      <div className="pop-actions">
        <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()}>{text.keep}</button>
        <button type="button" className="btn btn-primary" onClick={() => softGo(closeHref)}>{text.discard}</button>
      </div>
    </dialog>
  );
}
