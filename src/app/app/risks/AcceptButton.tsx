"use client";
import { useEffect, useState } from "react";

// The submit button of the plan form; its label says how many steps are ticked ({n} in the label).
export function AcceptButton({ formId, label, none }: { formId: string; label: string; none: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const count = () => setN(form.querySelectorAll<HTMLInputElement>('input[name="stepId"]:checked').length);
    count();
    form.addEventListener("change", count);
    return () => form.removeEventListener("change", count);
  }, [formId]);
  return <button type="submit" form={formId} className="act act-primary" disabled={n === 0}>{n === 0 ? none : label.replace("{n}", String(n))}</button>;
}
