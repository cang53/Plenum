import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SendButton } from "./SendButton";

describe("SendButton", () => {
  it("is enabled by default and disabled when told so", () => {
    expect(renderToStaticMarkup(<SendButton label="Send">x</SendButton>)).not.toContain("disabled");
    expect(renderToStaticMarkup(<SendButton label="Send" disabled>x</SendButton>)).toContain("disabled");
  });
});
