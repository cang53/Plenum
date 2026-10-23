import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const png = (src: string) => readFileSync(new URL(`../../public${src}`, import.meta.url));
const size = (b: Buffer) => `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;

describe("manifest", () => {
  const m = manifest();
  it("is installable on a phone", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/app");
    expect(m.theme_color).toBe("#2b4fd0");
  });
  it("has PNG icons of the declared size, including a maskable one", () => {
    const pngs = (m.icons ?? []).filter((i) => i.type === "image/png");
    expect(pngs.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(pngs.some((i) => i.purpose === "maskable")).toBe(true);
    for (const i of pngs) expect(size(png(i.src))).toBe(i.sizes);
  });
  it("ships a 180px apple-touch-icon", () => {
    expect(size(png("/icons/apple-touch-icon.png"))).toBe("180x180");
  });
});
