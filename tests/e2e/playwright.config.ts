import { defineConfig, devices } from "@playwright/test";

const port = process.env.QA_PORT ?? "3020";
const baseURL = process.env.QA_BASE_URL ?? `http://localhost:${port}`;
const skipServer = process.env.QA_SKIP_SERVER === "1";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 90_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 200,
      threshold: 0.25,
    },
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../../docs/reports/sprint15/playwright-report.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        }
      : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: skipServer
    ? undefined
    : {
        command: `npm run start --workspace=@game-platform/web -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
