import { expect, test } from "@playwright/test";
import { admin, clickUntil, createManager, signIn } from "./helpers";

const run = `r${Date.now().toString(36)}`;
const email = `rw-${run}@example.test`;

// One reward (the team streak) shows on the overview; an admin turns rewards off everywhere and it disappears.
test("team streak shows, then hides when rewards are switched off", async ({ page }) => {
  const { project, workspace } = await createManager(run, email, `E2E rewards ${run}`);
  await signIn(page, email);

  await page.goto(`/app?project=${project}`);
  await expect(page.getByRole("heading", { name: /Team streak/ })).toBeVisible();

  await page.goto(`/app/settings?project=${project}`);
  await page.getByLabel("Off everywhere").check();
  await clickUntil(page.locator("form").filter({ hasText: "Team rewards" }).getByRole("button", { name: "Save" }), async () => {
    await expect.poll(async () => (await admin.from("reward_switches").select("site").eq("workspace_id", workspace)).data?.length, { timeout: 3000 }).toBe(1);
  });

  await page.goto(`/app?project=${project}`);
  await expect(page.getByRole("heading", { name: "Team streak" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
});
