"use client";

import { useId, useRef, type ReactNode } from "react";

// Destructive actions wait behind a dialog; the form with the real action is passed in as children.
export function ConfirmDialog({ trigger, title, body, cancel, children }: { trigger: string; title: string; body?: string; cancel: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button type="button" className="btn btn-plain" onClick={() => ref.current?.showModal()}>{trigger}</button>
      <dialog ref={ref} className="dialog" aria-labelledby={id}>
        <h2 id={id}>{title}</h2>
        {body && <p>{body}</p>}
        {children}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={() => ref.current?.close()}>{cancel}</button>
        </div>
      </dialog>
    </>
  );
}
