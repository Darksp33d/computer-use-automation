import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: "list",
  use: { browserName: "chromium", trace: "off", screenshot: "off", video: "off" },
});
