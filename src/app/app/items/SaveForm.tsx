"use client";

import { useActionState, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ConfirmDialog } from "@/app/app/ConfirmDialog";
import type { SaveResult } from "@/domain/saveState";
import { Notice } from "./Notice";

export type SaveText = { cancel: string; submit: string; saving: string; saveOnline: string; offline: string; reconnect: string; demo: string; failTitle: string; failBody: string; keep: string; retry: string; conflictTitle: string; conflictBody: string; latest: string; review: string; reload: string; reloadTitle: string; reloadBody: string; reloadGo: string; errTitle: string; errDates: string };

const subscribe = (cb: () => void) => {
  addEventListener("online", cb);
  addEventListener("offline", cb);
  return () => { removeEventListener("online", cb); removeEventListener("offline", cb); };
};

// The inspector's form: while it saves the button says so and cannot be pressed twice; a failed save keeps everything typed and says what to do next.
export function SaveForm({ action, children, text, cancelHref, reloadHref, demo = false, label }: { action: (prev: SaveResult, form: FormData) => Promise<SaveResult>; children: ReactNode; text: SaveText; cancelHref: string; reloadHref: string; demo?: boolean; label: string }) {
  const [state, run, pending] = useActionState(action, { status: "idle" } as SaveResult);
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const [seen, setSeen] = useState<SaveResult | null>(null);
  const [probe, setProbe] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const shown = state === seen ? ({ status: "idle" } as SaveResult) : state;
  // "Try reconnecting" asks the server once; a real answer means the browser flag was stale.
  const reconnect = async () => { setProbe(true); await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store" }).then(() => dispatchEvent(new Event("online")), () => {}); setProbe(false); };
  return (
    <form ref={form} action={run} className="item-form item-inspector" aria-label={label} aria-busy={pending}>
      {children}
      <div className="insp-notices">
        {demo && <Notice tone="info" title={text.demo} />}
        {!online && <Notice tone="warn" title={text.offline}><button type="button" className="btn btn-secondary" disabled={probe} onClick={reconnect}>{text.reconnect}</button></Notice>}
        {shown.status === "invalid" && <Notice tone="danger" title={shown.message === "items.err.dates" ? text.errDates : text.errTitle} />}
        {shown.status === "error" && (
          <Notice tone="danger" title={text.failTitle} body={text.failBody}>
            <button type="button" className="btn btn-secondary" onClick={() => setSeen(state)}>{text.keep}</button>
            <button type="button" className="btn btn-primary" onClick={() => form.current?.requestSubmit()}>{text.retry}</button>
          </Notice>
        )}
        {shown.status === "conflict" && (
          <Notice tone="warn" title={text.conflictTitle} body={text.conflictBody}>
            <details className="insp-latest"><summary className="btn btn-secondary">{text.review}</summary><p className="insp-card-label">{text.latest}</p><p><b>{shown.latest.title}</b></p><p className="insp-text">{shown.latest.details}</p></details>
            <ConfirmDialog trigger={text.reload} title={text.reloadTitle} body={text.reloadBody} cancel={text.keep}><a className="btn btn-primary" href={reloadHref}>{text.reloadGo}</a></ConfirmDialog>
          </Notice>
        )}
      </div>
      <footer className="insp-foot">
        <a className="btn btn-secondary" href={cancelHref}>{text.cancel}</a>
        <button type="submit" className="btn btn-primary" disabled={pending || !online || demo}>{pending ? <><span className="spinner" aria-hidden="true" /> {text.saving}</> : online ? text.submit : text.saveOnline}</button>
      </footer>
    </form>
  );
}
