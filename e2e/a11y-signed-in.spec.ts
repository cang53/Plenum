import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { admin, createManager, signIn } from "./helpers";

const run = `a${Date.now().toString(36)}`;
const email = `ax-${run}@example.test`;

// The stage 9 to 12 screens need a sign-in, so they get their own axe pass here (a11y.spec.ts covers the public ones).
test("no axe violations on risks, site log, timesheet and rewards", async ({ page }) => {
  const { user, project } = await createManager(run, email, `E2E a11y ${run}`);
  await admin.from("tasks").insert({ project_id: project, title: `Pour slab ${run}`, owner_id: user }).throwOnError();
  await signIn(page, email);

  const screens = [
    ["risks", `/app/items?project=${project}&kind=risk`],
    ["site log", `/app/sitelog?project=${project}`],
    ["timesheet", `/app/timesheet?project=${project}`],
    ["timesheets", `/app/timesheets?project=${project}`],
    ["rewards", `/app?project=${project}`],
    ["stream", `/app/stream?project=${project}`],
  ];
  for (const [name, path] of screens) {
    await page.goto(path);
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), name).toEqual([]);
  }
});
