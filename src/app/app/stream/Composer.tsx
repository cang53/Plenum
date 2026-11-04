"use client";

import { useRef, useState } from "react";
import { filterMentions, type MentionItem, type MentionType } from "@/domain/mentions";

const COLORS = ["#df343b", "#ec7022", "#23a56b", "#3454db", "#9541e8"];
export type ComposerLabels = { placeholder: string; bold: string; italic: string; underline: string; list: string; color: string; colors: string[]; plain: string; mention?: { empty: string; types: Record<MentionType, string> } };

// The message box: typing with a small toolbar for bold, italic, underline, a list and a font colour.
// The form gets two hidden fields: body (the plain words) and html (the markup, cleaned again on the server).
const ICONS: Record<MentionType, string> = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  agent: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z",
  task: "M5 12.5l4.5 4.5L19 7.5",
  risk: "M12 4l9 16H3Zm0 6v4m0 3h.01",
  issue: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5m0 3h.01",
  decision: "M12 3v18M5 7h14M7 7l-3 6h6Zm10 0l-3 6h6Z",
  file: "M7 3h7l4 4v14H7Zm7 0v4h4",
};

// The message box: typing with a small toolbar for bold, italic, underline, a list and a font colour.
// Typing "@" opens a list of people, CobIA and project items; a chosen one becomes a link chip in the message.
export function Composer({ labels, disabled, mentions = [] }: { labels: ComposerLabels; disabled: boolean; mentions?: MentionItem[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState<{ query: string; at: { left: number; bottom: number }; index: number } | null>(null);
  const shown = pick ? filterMentions(mentions, pick.query) : [];

  // The "@word" right before the caret, as a range, or null.
  const typed = () => {
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!sel?.isCollapsed || !node || node.nodeType !== 3 || !box.current?.contains(node)) return null;
    const m = /(?:^|\s)@([^\s@]{0,40})$/.exec((node.textContent ?? "").slice(0, sel.anchorOffset));
    if (!m) return null;
    const r = document.createRange();
    r.setStart(node, sel.anchorOffset - m[1].length - 1);
    r.setEnd(node, sel.anchorOffset);
    return { range: r, query: m[1] };
  };
  const look = () => {
    const t = mentions.length ? typed() : null;
    if (!t) return setPick(null);
    const rect = t.range.getBoundingClientRect();
    setPick((p) => ({ query: t.query, at: { left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)), bottom: window.innerHeight - rect.top + 8 }, index: p && p.query === t.query ? p.index : 0 }));
  };
  const choose = (item: MentionItem) => {
    const t = typed();
    if (!t) return;
    t.range.deleteContents();
    const chip = document.createElement("a");
    chip.href = item.href;
    chip.className = "mention";
    chip.contentEditable = "false";
    chip.textContent = `@${item.label}`;
    const gap = document.createTextNode("\u00a0");
    t.range.insertNode(gap);
    t.range.insertNode(chip);
    const caret = document.createRange();
    caret.setStartAfter(gap);
    caret.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(caret);
    setPick(null);
    sync();
  };

  const text = useRef<HTMLInputElement>(null);
  const html = useRef<HTMLInputElement>(null);

  const sync = () => {
    const el = box.current!;
    if (!el.textContent?.trim() && !el.querySelector("li")) el.innerHTML = ""; // lets the placeholder show again
    text.current!.value = el.innerText.trim();
    html.current!.value = el.innerHTML;
  };
  const run = (cmd: string, value?: string) => { box.current?.focus(); document.execCommand("styleWithCSS", false, "true"); document.execCommand(cmd, false, value); sync(); };
  // "- " at the start of a line becomes a bullet; Shift+Enter in a list adds the next bullet; Tab nests a bullet (Shift+Tab undoes it).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (pick) {
      if (e.key === "Escape") { e.preventDefault(); return setPick(null); }
      if (shown.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); const n = shown.length; return setPick({ ...pick, index: (pick.index + (e.key === "ArrowDown" ? 1 : n - 1)) % n }); }
      if (shown.length && (e.key === "Enter" || e.key === "Tab") && !e.shiftKey) { e.preventDefault(); return choose(shown[pick.index] ?? shown[0]); }
    }
    const sel = window.getSelection();
    const node = sel?.anchorNode ?? null;
    const inList = !!(node && (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest("li"));
    if (e.key === " " && sel?.isCollapsed && node?.nodeType === 3 && /^[-*]$/.test(node.textContent ?? "") && sel.anchorOffset === 1 && !inList) {
      e.preventDefault();
      document.execCommand("delete");
      run("insertUnorderedList");
    } else if (e.key === "Enter" && e.shiftKey && inList) {
      e.preventDefault();
      run("insertParagraph");
    } else if (e.key === "Tab" && inList) {
      e.preventDefault();
      run(e.shiftKey ? "outdent" : "indent");
    }
  };
  const tools: [string, React.ReactNode, string][] = [["bold", "B", labels.bold], ["italic", "I", labels.italic], ["underline", "U", labels.underline], ["insertUnorderedList", <svg key="l" viewBox="0 0 24 24" width="18" height="15" aria-hidden="true"><path d="M3 6h.01M3 12h.01M3 18h.01M9 6h12M9 12h12M9 18h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>, labels.list]];

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
        onInput={() => { sync(); look(); }}
        onClick={look}
        onBlur={() => setPick(null)}
        onKeyDown={onKeyDown}
        // Pasted text goes in as plain words: formatting from other pages is not brought along. Pasted files are left to the attach handler.
        onPaste={(e) => { if (e.clipboardData.files.length) return; e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      />
      {pick && (
        <ul className="mention-pop" role="listbox" aria-label={labels.mention?.types.person ?? ""} style={{ left: pick.at.left, bottom: pick.at.bottom }} onMouseDown={(e) => e.preventDefault()}>
          {shown.length === 0 && <li className="none">{labels.mention?.empty}</li>}
          {shown.map((m, i) => (
            <li key={`${m.type}-${m.id}`} role="option" aria-selected={i === pick.index} className={i === pick.index ? "on" : undefined} onClick={() => choose(m)} onMouseEnter={() => setPick({ ...pick, index: i })}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={ICONS[m.type]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="lbl">{m.label}</span>
              <span className="kind">{labels.mention?.types[m.type]}</span>
            </li>
          ))}
        </ul>
      )}
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
