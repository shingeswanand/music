import { expect, test } from "@playwright/test";
import { blockLiveMirrors } from "./live-mirrors";
import { mockAudio, mockOfflineDiscovery } from "./fixtures";

// The offline catalogue keeps this suite independent of third-party
// providers; the silent WAV fixture exercises real browser audio.
test.beforeEach(async ({ page }) => {
  await blockLiveMirrors(page);
  await mockOfflineDiscovery(page);
  await mockAudio(page);
});

test("the up next panel shows the playing list and mirrors the live track", async ({
  page,
}) => {
  await page.goto("/");
  const panel = page.getByRole("complementary", { name: "Up next" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("13 tracks");
  // Playback never autostarts, but the queued first track is the current one.
  await expect(panel.locator(".queue-current")).toContainText("Kesariya");

  // Picking a row inside the list starts that track in the player bar.
  const target = panel.locator(".queue-track-main").nth(4);
  const title = (await target.locator("strong").textContent()) ?? "";
  expect(title).toBeTruthy();
  await target.click();
  await expect(page.locator(".player-song-text")).toContainText(title);
  await expect(panel.locator(".queue-current")).toContainText(title);
});

test("the playing list reorders, removes and clears tracks, and persists", async ({
  page,
}) => {
  await page.goto("/");
  const panel = page.getByRole("complementary", { name: "Up next" });
  await expect(panel).toBeVisible();
  const titles = panel.locator(".queue-track strong");
  await expect(titles.first()).toHaveText("Kesariya");
  await expect(titles.nth(1)).toHaveText("Heeriye");

  await panel
    .getByRole("button", { name: "Move Heeriye up in queue", exact: true })
    .click();
  await expect(titles.first()).toHaveText("Heeriye");
  await expect(titles.nth(1)).toHaveText("Kesariya");
  // The current track stays put in the player while its neighbors move.
  await expect(page.locator(".player-song-text")).toContainText("Kesariya");
  // The new first row can no longer move up.
  await expect(
    panel.getByRole("button", {
      name: "Move Heeriye up in queue",
      exact: true,
    }),
  ).toBeDisabled();

  await panel
    .getByRole("button", { name: "Remove Heeriye from queue", exact: true })
    .click();
  await expect(panel).not.toContainText("Heeriye");
  await expect(panel).toContainText("12 tracks");

  await panel
    .getByRole("button", { name: "Clear queue", exact: true })
    .click();
  await expect(panel.locator(".queue-track")).toHaveCount(1);
  await expect(panel.locator(".queue-current")).toContainText("Kesariya");

  await page.reload();
  await expect(panel.locator(".queue-track")).toHaveCount(1);
  await expect(panel.locator(".queue-current")).toContainText("Kesariya");
});

test("system media controls stay in sync for background listening", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio) => (audio as HTMLAudioElement).paused),
    )
    .toBe(false);
  // Lock screens show the right state, metadata and artwork variety.
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession.playbackState))
    .toBe("playing");
  const metadata = await page.evaluate(() => ({
    title: navigator.mediaSession.metadata?.title ?? "",
    artwork: navigator.mediaSession.metadata?.artwork.length ?? 0,
  }));
  expect(metadata.title).toBe("Kesariya");
  expect(metadata.artwork).toBeGreaterThanOrEqual(3);
  const panel = page.getByRole("complementary", { name: "Up next" });
  await expect(panel.locator(".queue-current")).toContainText("Kesariya");
});

test("the playing list falls back to the queue dialog on small screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("complementary", { name: "Up next" }),
  ).toBeHidden();
  // The player bar keeps its main-width layout on a narrow screen.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    700,
  );
  await page.getByRole("button", { name: "Open play queue" }).click();
  const dialog = page.getByRole("dialog", { name: "Play queue" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".queue-track")).toHaveCount(13);
  await dialog
    .getByRole("button", { name: "Move Apna Bana Le up in queue", exact: true })
    .click();
  await expect(dialog.locator(".queue-track strong").nth(1)).toHaveText(
    "Apna Bana Le",
  );
});
