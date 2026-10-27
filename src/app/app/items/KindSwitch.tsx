"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Opt = { kind: string; label: string; href: string };
type Text = { field: string; title: string; body: string; keep: string; switch: string; open: string };

// The create form's kind field. Changing kind asks first, then reopens the form for the new kind with the title and details carried over.
export function KindSwitch({ current, options, text }: { current: string; options: Opt[]; text: Text }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [picked, setPicked] = useState(current);
  const now = options.find((o) => o.kind === current)!;
  const next = options.find((o) => o.kind === picked)!;
  const go = () => {
    const form = ref.current?.closest("form");
    const carry = new URLSearchParams();
    for (const n of ["title", "details"]) {
      const v = (form?.elements.namedItem(n) as HTMLInputElement | null)?.value;
      if (v) carry.set(n, v);
    }
    router.push(`${next.href}${carry.size ? `&${carry}` : ""}`);
  };
  return (
    <>
      <button type="button" className="insp-kind" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>{now.label}<span aria-hidden="true">⌄</span><span className="sr-only"> {text.open}</span></button>
      <dialog ref={ref} className="dialog pop" aria-labelledby="kind-switch-title">
        <h3 id="kind-switch-title">{text.title}</h3>
        <p>{text.body}</p>
        <label>{text.field}
          <select value={picked} onChange={(e) => setPicked(e.target.value)}>{options.map((o) => <option key={o.kind} value={o.kind}>{o.label}</option>)}</select>
        </label>
        <div className="pop-actions">
          <button type="button" className="btn btn-secondary" onClick={() => { setPicked(current); ref.current?.close(); }}>{text.keep.replace("{kind}", now.label.toLowerCase())}</button>
          <button type="button" className="btn btn-primary" disabled={picked === current} onClick={go}>{text.switch.replace("{kind}", next.label.toLowerCase())}</button>
        </div>
      </dialog>
    </>
  );
}
