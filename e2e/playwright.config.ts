import { defineConfig, devices } from "@playwright/test";

const PORT = 3999;

/**
 * Real ceremonies against SignatureAPI test mode, in the two engines the apps
 * embed: WebKit (WKWebView on iOS) and Chromium (Android System WebView).
 * The demo server runs from ../server with the key in server/.env.
 */
export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "webkit-iphone", use: { ...devices["iPhone 15"] } },
    { name: "chromium-android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node --env-file-if-exists=.env src/index.ts",
    cwd: "../server",
    env: { PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/health`,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
