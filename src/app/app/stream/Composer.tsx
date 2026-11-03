"use client";

import { useRef } from "react";

const COLORS = ["#dc2626", "#ea580c", "#16a34a", "#2563eb", "#9333ea"];
export type ComposerLabels = { placeholder: string; bold: string; italic: string; underline: string; list: string; color: string; colors: string[]; plain: string };

// The message box: typing with a small toolbar for bold, italic, underline, a list and a font colour.
// The form gets two hidden fields: body (the plain words) and html (the markup, cleaned again on the server).
export function Composer({ labels, disabled }: { labels: ComposerLabels; disabled: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLInputElement>(null);
  const html = useRef<HTMLInputElement>(null);

  const sync = () => {
    const el = box.current!;
    if (!el.textContent?.trim() && !el.querySelector("li")) el.innerHTML = ""; // lets the placeholder show again
    text.current!.value = el.innerText.trim();
    html.current!.value = el.innerHTML;
  };
  const run = (cmd: string, value?: string) => { box.current?.focus(); document.execCommand("styleWithCSS", false, "true"); document.execCommand(cmd, false, value); sync(); };
  const tools: [string, string, string][] = [["bold", "B", labels.bold], ["italic", "I", labels.italic], ["underline", "U", labels.underline], ["insertUnorderedList", "•", labels.list]];

  return (
    <div className="comp-edit">
      {/* Buttons keep the text selection: mousedown must not move focus */}
      <div className="comp-tools" role="toolbar" aria-label={labels.placeholder} onMouseDown={(e) => e.preventDefault()}>
        {tools.map(([cmd, glyph, name]) => (
          <button key={cmd} type="button" className="tool" data-cmd={cmd} title={name} aria-label={name} disabled={disabled} onClick={() => run(cmd)}>{glyph}</button>
        ))}
        {COLORS.map((c, i) => (
          <button key={c} type="button" className="tool swatch" title={`${labels.color}: ${labels.colors[i]}`} aria-label={`${labels.color}: ${labels.colors[i]}`} disabled={disabled} style={{ background: c }} onClick={() => run("foreColor", c)} />
        ))}
        <button type="button" className="tool swatch plain" title={`${labels.color}: ${labels.plain}`} aria-label={`${labels.color}: ${labels.plain}`} disabled={disabled} onClick={() => run("foreColor", getComputedStyle(box.current!).color)} />
      </div>
      <input ref={text} type="hidden" name="body" />
      <input ref={html} type="hidden" name="html" />
      <div
        ref={box}
        className="comp-box"
        role="textbox"
        aria-multiline="true"
        aria-label={labels.placeholder}
        data-placeholder={labels.placeholder}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={sync}
        // Pasted text goes in as plain words: formatting from other pages is not brought along. Pasted files are left to the attach handler.
        onPaste={(e) => { if (e.clipboardData.files.length) return; e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      />
      <ResetOnSend box={box} sync={sync} />
    </div>
  );
}

// React empties the form after a send; a contenteditable box is not a form field, so it is emptied here.
function ResetOnSend({ box, sync }: { box: React.RefObject<HTMLDivElement | null>; sync: () => void }) {
  return (
    <span hidden ref={(el) => {
      const form = el?.closest("form");
      if (!form || (form as HTMLFormElement & { _rt?: boolean })._rt) return;
      (form as HTMLFormElement & { _rt?: boolean })._rt = true;
      form.addEventListener("reset", () => { if (box.current) box.current.innerHTML = ""; sync(); });
    }} />
  );
}
