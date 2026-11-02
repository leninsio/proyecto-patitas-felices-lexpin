import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "off",
    screenshot: "off"
  },
  webServer: {
    command: "python3 -m http.server 4321 --bind 127.0.0.1 --directory site",
    url: "http://127.0.0.1:4321/index.html",
    reuseExistingServer: true,
    timeout: 30000,
    stdout: "ignore",
    stderr: "ignore"
  }
});
