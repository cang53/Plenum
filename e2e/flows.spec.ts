import { expect, test } from "@playwright/test";
import { admin, clickUntil, createManager, signIn } from "./helpers";

const run = `f${Date.now().toString(36)}`;
const email = `pm-${run}@example.test`;
const name = `E2E flows ${run}`;
let project: string;
let workspace: string;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  ({ project, workspace } = await createManager(run, email, name));
});

test.beforeEach(async ({ page }) => {
  await signIn(page, email);
});

test("invite someone and change a member's role", async ({ page }) => {
  const guest = `guest-${run}@example.test`;
  await page.goto(`/app/members?project=${project}`);
  await page.getByLabel("Work email").fill(guest);
  await clickUntil(page.getByRole("button", { name: "Send invitation" }), async () => {
    await expect(page.getByText(guest)).toBeVisible({ timeout: 3000 });
  });
  expect((await admin.from("invitations").select("email").eq("email", guest)).data).toHaveLength(1);

  // A second person joins; the manager makes them an outside contributor.
  const { data } = await admin.auth.admin.createUser({ email: `member-${run}@example.test`, email_confirm: true });
  await admin.from("profiles").insert({ id: data.user!.id, display_name: "E2E member", email: `member-${run}@example.test` }).throwOnError();
  await admin.from("workspace_members").insert({ workspace_id: workspace, user_id: data.user!.id, kind: "staff" }).throwOnError();
  await admin.from("project_members").insert({ project_id: project, user_id: data.user!.id, role: "member" }).throwOnError();
  await page.goto(`/app/members?project=${project}`);
  const row = page.getByRole("listitem").filter({ hasText: "E2E member" });
  await row.getByLabel("Role").selectOption("contributor");
  await clickUntil(row.getByRole("button", { name: "Save role" }), async () => {
    const { data: m } = await admin.from("project_members").select("role").eq("user_id", data.user!.id).single();
    expect(m?.role).toBe("contributor");
  });
});

test("save the daily digest preference", async ({ page }) => {
  await page.goto(`/app/notifications?project=${project}`);
  const box = page.getByLabel("Email me a daily summary");
  await box.check();
  await clickUntil(page.getByRole("button", { name: "Save", exact: true }), async () => {
    await page.reload();
    await expect(box).toBeChecked({ timeout: 3000 });
  });
});

test("export the workspace and delete the project", async ({ page }) => {
  await page.goto(`/app/settings?project=${project}`);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download everything as JSON" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("plenum-export.json");

  await page.getByLabel("Type the project name to confirm:").fill(name);
  await clickUntil(page.getByRole("button", { name: "Delete this project" }), async () => {
    const { data } = await admin.from("projects").select("id").eq("id", project);
    expect(data).toHaveLength(0);
  });
});
