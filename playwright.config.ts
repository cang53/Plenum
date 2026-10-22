import { defineConfig } from "@playwright/test";

// End-to-end tests run against the local Supabase stack (`supabase start`) and `next dev`.
// See docs/e2e.md for the environment variables.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    // Signed-in tests start past the onboarding invite step.
    storageState: { cookies: [{ name: "plenum_onboarded", value: "1", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
