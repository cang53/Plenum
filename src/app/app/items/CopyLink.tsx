"use client";

import { useState } from "react";

// Copies the item's address; where the clipboard is blocked the button says so instead of failing quietly.
export function CopyLink({ href, label, done, failed }: { href: string; label: string; done: string; failed: string }) {
  const [state, setState] = useState<string>(label);
  return (
    <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(new URL(href, location.origin).href).then(() => setState(done), () => setState(failed))}>{state}</button>
  );
}
