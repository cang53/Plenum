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
        // React resets the form once the send finishes; the chips go with it.
        form.addEventListener("reset", () => { setFiles([]); setError(""); });
        form.addEventListener("dragover", (e) => e.preventDefault());
        form.addEventListener("drop", (e) => { e.preventDefault(); add(e.dataTransfer?.files ?? null); });
      }} />
      <button type="button" className="clip-btn" disabled={disabled} aria-label={label} title={label} onClick={() => input.current?.click()}>
        <svg viewBox="1211 1110 21 21" width="21" height="21" aria-hidden="true"><path d="M1218 1120.37L1225 1113.37C1225.7 1112.68 1226.64 1112.29 1227.63 1112.29C1228.61 1112.29 1229.55 1112.68 1230.25 1113.37C1230.95 1114.07 1231.34 1115.02 1231.34 1116C1231.34 1116.98 1230.95 1117.93 1230.25 1118.62L1220.63 1128.25C1219.65 1128.72 1218.54 1128.87 1217.47 1128.69C1216.4 1128.5 1215.42 1127.99 1214.65 1127.22C1213.88 1126.46 1213.37 1125.47 1213.19 1124.4C1213 1123.33 1213.16 1122.23 1213.63 1121.25L1223.25 1111.62C1223.6 1111.28 1224.07 1111.08 1224.56 1111.08C1225.05 1111.08 1225.53 1111.28 1225.88 1111.62C1226.22 1111.97 1226.42 1112.45 1226.42 1112.94C1226.42 1113.43 1226.22 1113.9 1225.88 1114.25L1217.13 1123C1216.89 1123.23 1216.76 1123.55 1216.76 1123.87C1216.76 1124.2 1216.89 1124.52 1217.13 1124.75C1217.36 1124.98 1217.67 1125.11 1218 1125.11C1218.33 1125.11 1218.64 1124.98 1218.88 1124.75L1226.75 1116.87" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
