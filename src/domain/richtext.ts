// Formatting for messages written in Plenum. Only the tags below survive, with no attributes except a colour on a span and an in-app link on a mention.
// The same function runs when saving and when showing, so a row written by any other route cannot carry script or links.
const KEEP = new Set(["b", "i", "u", "ul", "ol", "li", "br", "p", "div", "span", "a"]);
const ALIAS: Record<string, string> = { strong: "b", em: "i" };

const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
// Accepts #rgb, #rrggbb and rgb(r, g, b) (what the browser writes) and returns #rrggbb, or "" for anything else.
export function cleanColor(v: string): string {
  const s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  const m = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(s);
  return m && [m[1], m[2], m[3]].every((n) => Number(n) <= 255) ? `#${hex(m[1])}${hex(m[2])}${hex(m[3])}` : "";
}

const colorOf = (attrs: string): string => {
  const m = /\b(?:style\s*=\s*"(?:[^"]*[\s;])?color\s*:\s*([^;"]+)|color\s*=\s*"([^"]+)")/i.exec(attrs);
  return m ? cleanColor(m[1] ?? m[2]) : "";
};

export function sanitizeHtml(html: string): string {
  const out: string[] = [];
  const open: string[] = [];
  const re = /<(\/?)([a-z][a-z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|<!--[\s\S]*?-->|<[^>]*$|([^<]+)|</gi;
  for (const m of html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "").matchAll(re)) {
    if (m[4] !== undefined) { out.push(m[4].replace(/&(?!(?:amp|lt|gt|nbsp|quot|#39);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")); continue; }
    if (m[0] === "<") { out.push("&lt;"); continue; }
    if (!m[2]) continue;
    const raw = m[2].toLowerCase();
    // <font color> is what older browsers write for a colour.
    const tag = raw === "font" ? "span" : (ALIAS[raw] ?? raw);
    if (!KEEP.has(tag)) continue;
    if (m[1]) {
      const at = open.lastIndexOf(tag);
      if (at < 0) continue;
      out.push(...open.splice(at).reverse().map((t) => `</${t}>`));
    } else if (tag === "br") out.push("<br>");
    else {
      if (tag === "a") { // a mention chip: only a link to a page inside the app survives
        const h = /\bhref\s*=\s*"(\/app\/[A-Za-z0-9\/_\-?=.#]*)"/i.exec(m[3]);
        if (!h) continue;
        open.push("a");
        out.push(`<a class="mention" href="${h[1]}">`);
        continue;
      }
      const c = tag === "span" ? colorOf(m[3]) : "";
      if (tag === "span" && !c) continue; // a span without a colour carries nothing
      open.push(tag);
      out.push(c ? `<span style="color:${c}">` : `<${tag}>`);
    }
  }
  return out.join("") + open.reverse().map((t) => `</${t}>`).join("");
}

// What the AI agent, Teams, search and everything else read: the words, with line breaks, without markup.
export function htmlToText(html: string): string {
  return sanitizeHtml(html)
    .replace(/<br>/g, "\n")
    .replace(/<\/(p|div|li)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n").trim();
}

// True when the message has something worth keeping beyond its plain text.
export const hasFormatting = (clean: string): boolean => /<(b|i|u|ul|ol|span|a)\b/.test(clean);
