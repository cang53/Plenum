import { describe, expect, it } from "vitest";
import { cleanColor, hasFormatting, htmlToText, sanitizeHtml } from "./richtext";

describe("sanitizeHtml", () => {
  it("keeps bold, italic, underline and lists", () => {
    expect(sanitizeHtml("<b>a</b> <strong>b</strong> <em>c</em> <u>d</u><ul><li>e</li></ul>")).toBe("<b>a</b> <b>b</b> <i>c</i> <u>d</u><ul><li>e</li></ul>");
  });
  it("keeps only a valid colour on a span", () => {
    expect(sanitizeHtml('<span style="color: rgb(220, 38, 38); background:url(x)">hi</span>')).toBe('<span style="color:#dc2626">hi</span>');
    expect(sanitizeHtml('<font color="#00f">hi</font>')).toBe('<span style="color:#0000ff">hi</span>');
    expect(sanitizeHtml('<span style="color:red;position:fixed">hi</span>')).toBe("hi");
  });
  it("drops scripts, handlers, links and images", () => {
    expect(sanitizeHtml('<script>alert(1)</script>x<img src=x onerror=alert(1)><a href="javascript:alert(1)">y</a>')).toBe("xy");
    expect(sanitizeHtml('<b onclick="alert(1)">z</b>')).toBe("<b>z</b>");
  });
  it("escapes stray angle brackets and closes open tags", () => {
    expect(sanitizeHtml("1 < 2 <b>bold")).toBe("1 &lt; 2 <b>bold</b>");
    expect(sanitizeHtml("&lt;script&gt;")).toBe("&lt;script&gt;");
  });
});

describe("htmlToText", () => {
  it("gives plain words with line breaks, so the agent sees no markup", () => {
    expect(htmlToText("<div>@agent <b>move</b> it</div><div>to <span style=\"color:#f00\">May</span> &amp; June</div>")).toBe("@agent move it\nto May & June");
    expect(htmlToText("<ul><li>one</li><li>two</li></ul>")).toBe("one\ntwo");
  });
});

describe("helpers", () => {
  it("normalises colours", () => {
    expect(cleanColor("#ABC")).toBe("#aabbcc");
    expect(cleanColor("red")).toBe("");
    expect(cleanColor("rgb(300,0,0)")).toBe("");
  });
  it("detects formatting", () => {
    expect(hasFormatting("plain")).toBe(false);
    expect(hasFormatting("<b>x</b>")).toBe(true);
  });
});
