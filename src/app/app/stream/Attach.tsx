"use client";

import { useMemo, useRef, useState } from "react";
import { checkFiles, sizeLabel } from "@/domain/attachments";

// Paperclip, paste and drop for the composer: the chosen files wait as chips and go with the message. Same limits as the server.
export function Attach({ label, remove, errors, disabled }: { label: string; remove: string; errors: Record<string, string>; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  // One preview link per file, made once, so a re-render does not reload the picture.
  const previews = useMemo(() => new Map(files.map((f) => [f, f.type.startsWith("image/") ? URL.createObjectURL(f) : ""])), [files]);
  const [error, setError] = useState("");

  // Keeps the real file input in step, so the form posts exactly what the chips show.
  const set = (next: File[]) => {
    const bad = checkFiles(next);
    if (bad) { setError(errors[bad]); return; }
    setError("");
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (input.current) input.current.files = dt.files;
    setFiles(next);
  };
  const add = (list: FileList | File[] | null) => list && list.length && set([...files, ...Array.from(list)]);

  return (
    <>
      <input ref={input} type="file" name="files" multiple hidden onChange={(e) => { add(e.target.files); }} />
      {/* the form takes paste and drop too; the handlers are attached through the ref callback so the form stays server-rendered */}
      <span hidden ref={(el) => {
        const form = el?.closest("form");
        if (!form || form.dataset.attach) return;
        form.dataset.attach = "1";
        form.addEventListener("paste", (e) => { const f = e.clipboardData?.files; if (f?.length) { e.preventDefault(); add(f); } });
        form.addEventListener("dragover", (e) => e.preventDefault());
        form.addEventListener("drop", (e) => { e.preventDefault(); add(e.dataTransfer?.files ?? null); });
      }} />
      <button type="button" className="clip-btn" disabled={disabled} aria-label={label} title={label} onClick={() => input.current?.click()}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 11.5l-8.5 8.5a5 5 0 01-7-7L14 4.5a3.3 3.3 0 014.7 4.7L10 18a1.7 1.7 0 01-2.4-2.4L15 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {(files.length > 0 || error) && (
        <ul className="picked" aria-live="polite">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {previews.get(f) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews.get(f)} alt="" />
              )}
              <span>{f.name}<small>{sizeLabel(f.size)}</small></span>
              <button type="button" aria-label={`${remove}: ${f.name}`} onClick={() => set(files.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
          {error && <li className="err" role="alert">{error}</li>}
        </ul>
      )}
    </>
  );
}
