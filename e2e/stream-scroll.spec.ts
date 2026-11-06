import { expect, test, type Page } from "@playwright/test";

// The Stream chat scroll behaviour, checked on the demo page (same markup and scroll logic as /app/stream, no sign-in needed).
const URL = "/demo/messages?unread=0";
const UNREAD = "/demo/messages";
const feed = (page: Page) => page.locator(".chat .feed");
const metrics = (page: Page) => feed(page).evaluate((f) => ({ top: f.scrollTop, max: f.scrollHeight - f.clientHeight }));

// Simulates what a live refresh does: a new message appears at the end (or older ones above the first).
async function addMessage(page: Page, where: "end" | "start", mine = false, count = 1) {
  await page.evaluate(({ where, mine, count }) => {
    const all = [...document.querySelectorAll<HTMLElement>(".chat .feed article.mail.msg[id]")];
    const ref = (where === "end" ? all[all.length - 1] : all[0]).parentElement as HTMLElement;
    for (let i = 0; i < count; i++) {
      const copy = ref.cloneNode(true) as HTMLElement;
      const art = copy.querySelector("article.mail.msg") as HTMLElement;
      art.id = `msg-test-${where}-${Date.now()}-${i}`;
      if (mine) art.setAttribute("data-mine", ""); else art.removeAttribute("data-mine");
      copy.querySelectorAll("[id]").forEach((e) => { if (e !== art) e.removeAttribute("id"); });
      if (where === "end") ref.after(copy); else ref.before(copy);
    }
  }, { where, mine, count });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL);
  await expect(feed(page)).toBeVisible();
  await expect.poll(async () => { const m = await metrics(page); return m.max > 0 && m.max - m.top <= 2; }).toBe(true); // hydrated and at the bottom
});

test("opens at the bottom and the page itself does not scroll", async ({ page }) => {
  const m = await metrics(page);
  expect(m.max).toBeGreaterThan(200);
  expect(m.max - m.top).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
});

test("a new message while at the bottom stays at the bottom", async ({ page }) => {
  await addMessage(page, "end");
  await expect.poll(async () => { const m = await metrics(page); return m.max - m.top; }).toBeLessThanOrEqual(2);
  await expect(page.locator(".chat .jump")).toHaveCount(0);
});

test("a new message while scrolled up shows the pill and does not move", async ({ page }) => {
  await feed(page).evaluate(async (f) => { f.scrollTop = 0; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  const before = (await metrics(page)).top;
  await addMessage(page, "end");
  await expect(page.getByRole("button", { name: "1 new message", exact: true })).toBeVisible();
  expect((await metrics(page)).top).toBe(before);
  await page.getByRole("button", { name: /new message/ }).click();
  await expect.poll(async () => { const m = await metrics(page); return m.max - m.top; }).toBeLessThanOrEqual(2);
  await expect(page.locator(".chat .jump")).toHaveCount(0);
});

test("loading older messages keeps the same first visible message", async ({ page }) => {
  await feed(page).evaluate(async (f) => { f.scrollTop = f.scrollHeight / 2; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  const firstVisible = () => feed(page).evaluate((f) => {
    const top = f.getBoundingClientRect().top;
    const el = [...f.querySelectorAll<HTMLElement>("article.mail.msg[id]")].find((e) => e.getBoundingClientRect().bottom > top + 1)!;
    return { id: el.id, offset: Math.round(el.getBoundingClientRect().top - top) };
  });
  const before = await firstVisible();
  await addMessage(page, "start", false, 4);
  await expect.poll(async () => { const now = await firstVisible(); return now.id === before.id && Math.abs(now.offset - before.offset) <= 2; }).toBe(true);
});

test("phone width has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await expect(feed(page)).toBeVisible();
  await page.evaluate(() => { const b = document.querySelector<HTMLElement>(".chat .feed .body"); if (b) b.textContent = "x".repeat(200) + " https://example.com/" + "a".repeat(120); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await feed(page).evaluate((f) => f.scrollWidth <= f.clientWidth)).toBe(true);
});

test("with unread messages it opens at the New divider", async ({ page }) => {
  await page.goto(UNREAD);
  await expect(page.locator(".chat .newline")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Math.abs(document.querySelector(".chat .newline")!.getBoundingClientRect().top - document.querySelector(".chat .feed")!.getBoundingClientRect().top))).toBeLessThan(40);
});
