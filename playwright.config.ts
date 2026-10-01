import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : {},
  },
  webServer: {
    command:
      process.env.TEST_PRODUCTION === "1"
        ? "npm run build && npm run start -- --hostname 0.0.0.0 --port 3000"
        : "npm run dev -- --hostname 0.0.0.0 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Live search talks to third-party YouTube mirrors. Tests point the
      // server at a local mock mirror (see tests/live-search-server.spec.ts)
      // and intercept the browser's requests, so the suite never depends on a
      // public instance being up. Unset this to exercise the real thing.
      MUSIC_YOUTUBE_MIRRORS:
        process.env.MUSIC_YOUTUBE_MIRRORS ??
        `piped:http://127.0.0.1:${process.env.MUSIC_TEST_MIRROR_PORT ?? 3987}`,
    },
  },
});
