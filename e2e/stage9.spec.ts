import { expect, test, type Page } from "@playwright/test";
import { admin, clickUntil, createManager, signIn } from "./helpers";

const run = `s${Date.now().toString(36)}`;
const email = `pm-${run}@example.test`;
let project: string;

test.describe.configure({ mode: "serial" });

let page: Page;

// One sign-in for the whole file: sign-in emails are rate limited per address.
test.beforeAll(async ({ browser }) => {
  ({ project } = await createManager(run, email, `E2E stage 9 ${run}`));
  page = await browser.newPage();
  await signIn(page, email);
});

test.afterAll(async () => {
  await page.close();
});

test("save a daily site log", async () => {
  await page.goto(`/app/sitelog?project=${project}`);
  await page.getByLabel("Site", { exact: true }).fill("North yard");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-20");
  await page.getByLabel("People on site (total)").fill("12");
  await page.getByLabel("Work done").fill("Poured the slab");
  await page.getByRole("button", { name: "Save log" }).click();
  await expect(page.getByRole("status")).toHaveText("Site log saved.");
  await expect(page.getByRole("heading", { name: "North yard · 2026-10-20" })).toBeVisible();
});

test("site log on a phone keeps an offline entry and sends it when back online", async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/app/sitelog?project=${project}`);
  await expect(page.getByRole("link", { name: "Add entry" })).toBeVisible();
  await page.getByRole("link", { name: "Add entry" }).click();
  await page.getByLabel("Site", { exact: true }).fill("Phone yard");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-21");
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Save log" }).click();
  await expect(page.getByRole("status")).toHaveText("Waiting to send: 1");
  await page.context().setOffline(false);
  await expect(page.getByRole("status")).toHaveText("Sent: 1");
  await page.setViewportSize({ width: 1280, height: 720 });
});

test("add a risk and an issue", async () => {
  await page.goto(`/app/items?project=${project}&kind=risk`);
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Risks and issues" }) });
  for (const [kind, title] of [["risk", `Crane delay ${run}`], ["issue", `Leaking roof ${run}`]]) {
    const form = section.locator("form").first();
    // The first create can leave the panel open, and a second click would close it.
    if (!(await form.isVisible())) await section.getByText(/^New /).click();
    await form.getByLabel("Title", { exact: true }).fill(title);
    await form.locator("select[name=riskKind]").selectOption(kind);
    await form.getByRole("button", { name: "Create" }).click();
    await expect(section.getByText(title)).toBeVisible();
  }
});

test("save a baseline and compare the Gantt against it", async () => {
  await admin.from("tasks").insert({ project_id: project, title: "Pour slab", start_date: "2026-10-20", due_date: "2026-10-24" }).throwOnError();
  await page.goto(`/app/gantt?project=${project}`);
  await page.getByLabel("Baseline name").fill("Kick-off plan");
  await clickUntil(page.getByRole("button", { name: "Save baseline" }), async () => {
    await expect(page.getByRole("status")).toContainText("Baseline saved", { timeout: 3000 });
  });
  await page.reload();
  await expect(page.getByText("0 tasks finish later than the baseline.")).toBeVisible();
});

test("tag an attachment as a document with a revision", async () => {
  const { data: message } = await admin.from("messages")
    .insert({ project_id: project, external_id: `<e2e-${run}@plenum.local>`, from_address: "aylin@supplier.example", subject: `Cabinet drawings ${run}`, body_text: "Drawings attached." })
    .select("id").single().throwOnError();
  await admin.from("message_attachments").insert({ message_id: message!.id, part_index: 0, filename: "cabinet.pdf", content_type: "application/pdf", size_bytes: 1024 }).throwOnError();
  await page.goto(`/app/timeline?project=${project}`);
  const row = page.getByRole("listitem").filter({ hasText: "cabinet.pdf" });
  await row.getByText("Tag document").click();
  await row.locator("select[name=type]").selectOption("drawing");
  await row.getByLabel("Number", { exact: true }).fill("A-101");
  await row.getByLabel("Revision", { exact: true }).fill("B");
  await clickUntil(row.getByRole("button", { name: "Save tag" }), async () => {
    await expect(row.getByText("Latest revision")).toBeVisible({ timeout: 3000 });
  });
  await expect(row.locator(".chip", { hasText: "Drawing" })).toBeVisible();
});
