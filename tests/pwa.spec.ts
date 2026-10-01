import { test, expect } from "@playwright/test";
import { blockLiveMirrors } from "./live-mirrors";

test.use({ serviceWorkers: "allow" });

test("production PWA opens its cached listening space offline without caching recordings", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.TEST_PRODUCTION !== "1",
    "Service-worker registration is production-only",
  );
  test.setTimeout(60_000);
  await blockLiveMirrors(page);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const cached = await page.evaluate(async () => {
    const cache = await caches.open("sms-assets-v1");
    return (await cache.keys()).map((request) => request.url);
  });
  expect(cached.some((url) => url.includes("/_next/static/"))).toBe(true);
  expect(
    cached.some(
      (url) => url.includes("/api/") || url.includes("itunes.apple.com"),
    ),
  ).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Discover your sound.", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Marathi", exact: true }).click();
  await expect(page.locator(".song-card")).toHaveCount(5);
  await expect(
    page
      .getByRole("button", { name: "Play Sairat Jhala Ji", exact: true })
      .locator("img"),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("Kesariya");
  await page.getByRole("searchbox").press("Enter");
  await expect(
    page.getByRole("heading", { name: "Found your sound", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".song-card")).toHaveCount(1);
  await expect(page.locator(".offline-note")).toBeVisible();
  await context.setOffline(false);
});
