"use client";

import { Pop } from "./Pop";

export type Choice = { value: string; label: string };

// A filter dropdown that looks the same in every browser; replaces the native select, whose popup cannot be styled.
export function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: Choice[]; onChange: (value: string) => void }) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Pop label={label} role="listbox" className="mn-dd" trigger={<><span>{current?.label}</span><Chevron /></>}>
      {(close) => options.map((o) => (
        <button key={o.value} type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); close(); }}>
          <span>{o.label}</span>{o.value === value && <Check />}
        </button>
      ))}
    </Pop>
  );
}

export const Chevron = () => <svg className="mn-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m3 7.5 2.7 2.7L11 4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
