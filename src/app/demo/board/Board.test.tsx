import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Board } from "./Board";

describe("Board", () => {
  it("shows a Mine pill only when the signed-in person is known", () => {
    expect(renderToStaticMarkup(<Board initialTasks={[]} me="Sam" />)).toContain("Mine");
    expect(renderToStaticMarkup(<Board initialTasks={[]} />)).not.toContain("Mine");
  });
});
