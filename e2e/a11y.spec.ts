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
