import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.035,
      threshold: 0.25,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "dark",
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
    },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: "node ./node_modules/vinext/dist/cli.js dev -p 4173 -H 127.0.0.1",
    url: "http://127.0.0.1:4173/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
