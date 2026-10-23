import { expect, test } from "@playwright/test";
import { admin, createManager, signIn } from "./helpers";

const run = `t${Date.now().toString(36)}`;
const email = `ts-${run}@example.test`;

// Enter hours, submit the week, approve it, download the CSV. The manager owns the task, so one person does every step.
test("log hours, submit, approve and export a week", async ({ page }) => {
  const { user, project } = await createManager(run, email, `E2E timesheet ${run}`);
  await admin.from("tasks").insert({ project_id: project, title: `Pour slab ${run}`, owner_id: user }).throwOnError();
  await signIn(page, email);

  await page.goto(`/app/timesheet?project=${project}`);
  await page.getByLabel(new RegExp(`^Pour slab ${run} \\d{4}-\\d{2}-\\d{2}$`)).first().fill("7.5");
  await page.getByRole("button", { name: "Save hours" }).click();
  await expect(page.getByText("Hours saved.")).toBeVisible();

  await page.goto(`/app/timesheets?project=${project}`);
  await page.getByRole("button", { name: "Submit this week" }).click();
  await expect(page.getByText("Waiting for approval")).toBeVisible();
  await page.getByRole("link", { name: /^Review/ }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Approved and locked")).toBeVisible();

  const { data } = await admin.from("timesheet_weeks").select("week_start").eq("project_id", project).single().throwOnError();
  const csv = await page.request.get(`/app/timesheets/csv?project=${project}&from=${data!.week_start}&to=${data!.week_start}`);
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(`Pour slab ${run}`);
});
