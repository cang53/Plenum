"use client";

import { useEffect, useState } from "react";

export type ReplyTarget = { id: string; who: string; subject: string; excerpt: string };
const EVENT = "plenum:reply";

// Replying needs no page load: the button tells the composer which message it answers.
export function ReplyButton({ target, label, disabled }: { target: ReplyTarget; label: string; disabled?: boolean }) {
  return (
    <button type="button" className="act" data-ico="reply" data-tip={label} aria-label={label} disabled={disabled} onClick={() => {
      window.dispatchEvent(new CustomEvent<ReplyTarget>(EVENT, { detail: target }));
      document.querySelector<HTMLElement>("#composer .comp-box")?.focus();
    }} />
  );
}

// Inside the composer form: shows the quoted message and sends its id with the new one.
export function ReplyBar({ replyingTo, cancel }: { replyingTo: string; cancel: string }) {
  const [to, setTo] = useState<ReplyTarget | null>(null);
  useEffect(() => {
    const on = (e: Event) => setTo((e as CustomEvent<ReplyTarget>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  // The form is emptied after a send; the reply ends with it.
  useEffect(() => {
    const form = document.getElementById("composer");
    const reset = () => setTo(null);
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);
  if (!to) return null;
  return (
    <>
      <input type="hidden" name="replyTo" value={to.id} />
      <input type="hidden" name="subject" value={`Re: ${to.subject.replace(/^(\s*re:)+\s*/i, "") || to.excerpt}`} />
      <p className="replying"><span>{replyingTo} <b>{to.who}</b>: {to.excerpt}</span> <button type="button" className="linkish" onClick={() => setTo(null)}>{cancel}</button></p>
    </>
  );
}
