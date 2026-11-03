import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Composer } from "./Composer";

const labels = { placeholder: "Message", bold: "Bold", italic: "Italic", underline: "Underline", list: "List", color: "Colour", colors: ["Red", "Orange", "Green", "Blue", "Purple"], plain: "Default" };

describe("Composer", () => {
  it("has a toolbar and sends plain words and markup in two fields", () => {
    const html = renderToStaticMarkup(<Composer labels={labels} disabled={false} />);
    expect(html).toContain('aria-label="Bold"');
    expect(html).toContain('aria-label="Colour: Red"');
    expect(html).toContain('name="body"');
    expect(html).toContain('name="html"');
    expect(html).toContain('contentEditable="true"');
  });
  it("cannot be edited when read-only", () => {
    expect(renderToStaticMarkup(<Composer labels={labels} disabled />)).toContain('contentEditable="false"');
  });
});
