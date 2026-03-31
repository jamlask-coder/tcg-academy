import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Run tests against an already-running server (dev or: npx serve out -l tcp:3000 -s)
  // webServer: { command: "npx serve out -l tcp:3000 -s", url: "http://localhost:3000", timeout: 30000 },
})
