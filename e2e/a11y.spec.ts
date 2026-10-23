import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Pages that need no sign-in; the signed-in pages share the same layout and components.
for (const path of ["/", "/login", "/demo/board", "/demo/timeline"]) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("demo board fits a phone screen without sideways page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/demo/board");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("demo board can be used from the keyboard", async ({ page }) => {
  await page.goto("/demo/board");
  await page.keyboard.press("Tab"); // skip link
  await expect(page.locator(".skip")).toBeFocused();
  const status = page.locator(".status-select select").first();
  await status.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".board-column").nth(1).locator(".card")).not.toHaveCount(0);
});

test("demo timeline fits a phone screen without sideways page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/demo/timeline");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// Light and dark, with the user's contrast and motion preferences, on the glass screens that need no sign-in.
const modes = [
  { name: "light", scheme: "light" },
  { name: "dark", scheme: "dark" },
  { name: "high contrast", scheme: "light", contrast: "more" },
  { name: "dark high contrast", scheme: "dark", contrast: "more" },
  { name: "reduced motion", scheme: "light", reducedMotion: "reduce" },
] as const;

for (const mode of modes) {
  for (const path of ["/demo/ui", "/demo/board", "/demo/timeline"]) {
    test(`no axe violations on ${path} in ${mode.name}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode.scheme, contrast: "contrast" in mode ? mode.contrast : "no-preference", reducedMotion: "reducedMotion" in mode ? mode.reducedMotion : "no-preference" });
      await page.goto(path);
      await page.evaluate((dark) => document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"), mode.scheme === "dark");
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }
}

test("every control on the demo screen shows a visible focus ring", async ({ page }) => {
  await page.goto("/demo/ui");
  let seen = 0;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { tag: el.tagName, width: parseFloat(s.outlineWidth), style: s.outlineStyle, shadow: s.boxShadow };
    });
    if (!outline || outline.tag === "NEXTJS-PORTAL") break;
    seen++;
    expect(outline.style !== "none" && outline.width >= 2 || outline.shadow !== "none", `focus ring on ${outline.tag} #${i}`).toBe(true);
  }
  expect(seen).toBeGreaterThan(3);
});
