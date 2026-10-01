import { test, expect } from "@playwright/test";
import { blockLiveMirrors } from "./live-mirrors";
import { mockAudio, mockOfflineDiscovery } from "./fixtures";

// Live YouTube search is a third-party dependency: tests drive those responses
// themselves, so mirrors are blocked unless a test opts back in.
test.beforeEach(async ({ page }) => {
  await blockLiveMirrors(page);
  await mockOfflineDiscovery(page);
});

const track = {
  id: "test-song",
  title: "A fresh find",
  artist: "Test artist",
  album: "Test album",
  image: "/images/heeriye.webp",
  duration: 180,
  categories: ["Indie"],
  previewUrl: "https://audio-ssl.itunes.apple.com/test.m4a",
};

test.beforeEach(async ({ page }) => {
  await mockAudio(page);
});

test("discovery loads complete artwork without errors or autoplay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/SMS Music/);
  await expect(
    page.getByRole("heading", { name: "Discover your sound." }),
  ).toBeVisible();
  await expect(page.locator(".song-grid .song-card")).toHaveCount(6);
  await expect(
    page.getByRole("heading", { name: "Made for your mood" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Play playback", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator("audio")
      .evaluate((audio) => (audio as HTMLAudioElement).paused),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    1440,
  );
});

test("language filters also become the selected playback queue", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Marathi", exact: true }).click();
  await expect(page.locator(".song-grid .song-card")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Marathi, on repeat" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Play Sairat Jhala Ji", exact: true })
    .click();
  await page.getByRole("button", { name: "Open play queue" }).click();
  const queue = page.getByRole("dialog", { name: "Play queue" });
  await expect(queue.locator(".queue-track")).toHaveCount(5);
  await expect(queue).toContainText("Ved Tujha");
  await expect(queue).not.toContainText("Heeriye");
  await page.keyboard.press("Escape");
  await expect(queue).not.toBeVisible();
});

test("search uses the same-origin API, supports keyboard focus and real history", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("searchbox");
  await expect(search).toBeFocused();
  await search.fill("Kesariya");
  await search.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Found your sound" }),
  ).toBeVisible();
  await expect(page.locator(".song-grid .song-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Discover your sound." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Go forward", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Found your sound" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toHaveValue("");
});

test("an empty search never silently shows trending tracks", async ({
  page,
}) => {
  await page.route("**/api/search?query=NothingMatches", (route) =>
    route.fulfill({ json: { songs: [], source: "apple" } }),
  );
  await page.goto("/");
  await page.getByRole("searchbox").fill("NothingMatches");
  await page.getByRole("searchbox").press("Enter");
  await expect(
    page.getByRole("heading", { name: "No tracks found. Yet." }),
  ).toBeVisible();
  await expect(page.locator(".song-card")).toHaveCount(0);
  await expect(page.locator(".hero-banner")).toHaveCount(0);
});

test("provider outages show useful feedback and a browse fallback", async ({
  page,
}) => {
  await page.route("**/api/search?query=Unavailable", (route) =>
    route.fulfill({ json: { songs: [], source: "offline" } }),
  );
  await page.goto("/");
  await page.getByRole("searchbox").fill("Unavailable");
  await page.getByRole("searchbox").press("Enter");
  await expect(page.locator(".offline-note")).toContainText(
    "Live search is temporarily unavailable",
  );
  await page
    .getByRole("button", { name: "Browse music", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Good music lives here." }),
  ).toBeVisible();
});

test("likes are real, persist after reload, and synchronize between tabs", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Like Heeriye", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unlike Heeriye", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /^Liked songs/ })
    .click();
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page.locator(".track-row")).toContainText("Heeriye");
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /^Liked songs/ })
    .click();
  await expect(page.locator(".track-row")).toHaveCount(1);
  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await otherTab.evaluate(() => localStorage.setItem("favorites", "[]"));
  await expect(
    page.getByRole("heading", { name: "A home for your favorites." }),
  ).toBeVisible();
  await otherTab.close();
});

test("playlists support creation, adding, persistence, removal, and confirmed deletion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  const create = page.getByRole("dialog", {
    name: "Create a playlist",
    exact: true,
  });
  await create.getByLabel("Playlist name").fill("Road trip favorites");
  await create
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Road trip favorites", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Kesariya", exact: true }).click();
  await expect(page.locator(".song-card")).toHaveCount(1);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Browse music", exact: true })
    .click();
  const heeriye = page.locator(".song-card").filter({
    has: page.getByRole("button", {
      name: "More actions for Heeriye",
      exact: true,
    }),
  });
  await heeriye
    .getByRole("button", { name: "More actions for Heeriye" })
    .click();
  await heeriye
    .getByRole("button", { name: "Road trip favorites", exact: true })
    .click();
  await page.reload();
  await page
    .locator(".playlist-nav")
    .getByRole("button", { name: "Road trip favorites", exact: true })
    .click();
  await expect(page.locator(".song-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "More actions for Heeriye", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove from playlist", exact: true })
    .click();
  await expect(page.locator(".song-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Delete this playlist", exact: true })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Delete playlist",
    exact: true,
  });
  await confirm
    .getByRole("button", { name: "Delete playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Discover your sound." }),
  ).toBeVisible();
  await expect(page.locator(".playlist-nav")).not.toContainText(
    "Road trip favorites",
  );
});

test("native playback reports progress, supports seeking, volume, next, and history", async ({
  page,
}) => {
  await page.goto("/");
  const player = page.getByRole("region", { name: "Music player" });
  await player
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio) => (audio as HTMLAudioElement).currentTime),
    )
    .toBeGreaterThan(0);
  await player
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  expect(
    await page
      .locator("audio")
      .evaluate((audio) => (audio as HTMLAudioElement).paused),
  ).toBe(true);
  const seek = player.getByRole("slider", {
    name: "Seek playback",
    exact: true,
  });
  await expect(seek).toHaveAttribute("max", "60");
  await seek.focus();
  await seek.press("End");
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio) => (audio as HTMLAudioElement).currentTime),
    )
    .toBeGreaterThan(50);
  await player.getByRole("slider", { name: "Volume", exact: true }).focus();
  await player
    .getByRole("slider", { name: "Volume", exact: true })
    .press("Home");
  await expect(
    player.getByRole("button", { name: "Unmute", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator("audio")
      .evaluate((audio) => (audio as HTMLAudioElement).volume),
  ).toBe(0);
  await player.getByRole("button", { name: "Unmute", exact: true }).click();
  await player.getByRole("button", { name: "Next track", exact: true }).click();
  await expect(player.locator(".player-song-text strong")).toContainText(
    "Heeriye",
  );
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio) => (audio as HTMLAudioElement).currentTime),
    )
    .toBeLessThan(5);
  await player.getByRole("button", { name: "Shuffle", exact: true }).click();
  await expect(
    player.getByRole("button", { name: "Shuffle", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await player
    .getByRole("button", { name: "Repeat: off", exact: true })
    .click();
  await expect(
    player.getByRole("button", { name: "Repeat: all", exact: true }),
  ).toBeVisible();
  await player
    .getByRole("button", { name: "Repeat: all", exact: true })
    .click();
  await expect(
    player.getByRole("button", { name: "Repeat: one", exact: true }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Recently played", exact: true })
    .click();
  await expect(page.locator(".track-row")).toHaveCount(2);
  await expect(page.locator(".track-row").first()).toContainText("Heeriye");
});

test("queue changes are actionable and do not duplicate tracks", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open play queue", exact: true })
    .click();
  let queue = page.getByRole("dialog", { name: "Play queue", exact: true });
  await queue.getByRole("button", { name: "Clear queue", exact: true }).click();
  await expect(queue.locator(".queue-track")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "More actions for Heeriye", exact: true })
    .click();
  await page.getByRole("button", { name: "Add to queue", exact: true }).click();
  await page
    .getByRole("button", { name: "More actions for Heeriye", exact: true })
    .click();
  await page.getByRole("button", { name: "Add to queue", exact: true }).click();
  await page
    .getByRole("button", { name: "Open play queue", exact: true })
    .click();
  queue = page.getByRole("dialog", { name: "Play queue", exact: true });
  await expect(queue.locator(".queue-track")).toHaveCount(2);
  await queue
    .getByRole("button", { name: "Remove Heeriye from queue", exact: true })
    .click();
  await expect(queue.locator(".queue-track")).toHaveCount(1);
});

test("expanded player traps focus, exposes full-track links, and closes with Escape", async ({
  page,
}) => {
  await page.goto("/");
  const opener = page.getByRole("button", {
    name: "Expand player",
    exact: true,
  });
  await opener.click();
  const expanded = page.getByRole("dialog", {
    name: "Now playing",
    exact: true,
  });
  await expect(expanded).toBeVisible();
  await expect(
    expanded.getByRole("heading", { name: "Kesariya", exact: true }),
  ).toBeVisible();
  await expect(
    expanded.getByRole("link", {
      name: "Listen to the full track",
      exact: true,
    }),
  ).toHaveAttribute("target", "_blank");
  await expanded
    .getByRole("button", { name: "Show queue", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Play queue", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await opener.click();
  await page.keyboard.press("Escape");
  await expect(expanded).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("corrupt and blocked storage cannot crash the player or prevent likes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("favorites", "{invalid");
    localStorage.setItem("sms-recent", "{}");
    localStorage.setItem("sms-playlists", "[null]");
    localStorage.setItem("sms-volume", '"invalid"');
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Like Heeriye", exact: true }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /^Liked songs/ })
    .click();
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page.locator(".track-row")).toContainText("Heeriye");
});

test("overlapping searches retain their own results when navigating back", async ({
  page,
}) => {
  await page.route("**/api/search?query=First", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      json: { songs: [{ ...track, title: "First result" }], source: "apple" },
    });
  });
  await page.route("**/api/search?query=Second", (route) =>
    route.fulfill({
      json: { songs: [{ ...track, title: "Second result" }], source: "apple" },
    }),
  );
  await page.goto("/");
  const input = page.getByRole("searchbox");
  await input.fill("First");
  await input.press("Enter");
  await input.fill("Second");
  await input.press("Enter");
  await expect(
    page.getByRole("button", { name: "Second result", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "First result", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".skeleton-card")).toHaveCount(0);
});

test("unavailable audio pauses gracefully and offers a full-track link", async ({
  page,
}) => {
  await page.unroute("https://audio-ssl.itunes.apple.com/**");
  await page.route("https://audio-ssl.itunes.apple.com/**", (route) =>
    route.abort("failed"),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect(page.locator(".player-error")).toContainText(
    "This preview isn’t available right now.",
  );
  await expect(
    page.getByRole("button", { name: "Play playback", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".player-error").getByRole("link")).toHaveAttribute(
    "href",
    /music.apple.com/,
  );
});

test("mobile navigation and now-playing remain usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  const nav = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: /^Liked songs/ }).click();
  await expect(nav).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Songs you love.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open now playing", exact: true })
    .click();
  const expanded = page.getByRole("dialog", {
    name: "Now playing",
    exact: true,
  });
  await expect(
    expanded.getByRole("slider", {
      name: "Volume in expanded player",
      exact: true,
    }),
  ).toBeVisible();
  await expanded
    .getByRole("button", { name: "Show queue", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Play queue", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("search API validates input and accepts the old q parameter", async ({
  request,
}) => {
  expect((await request.get("/api/search")).status()).toBe(400);
  expect(
    (await request.get(`/api/search?query=${"x".repeat(201)}`)).status(),
  ).toBe(400);
  const response = await request.get("/api/search?q=Kesariya");
  expect(response.status()).toBe(200);
  const data = await response.json();
  // The test mirror is down for this query: the route reports a fallback it
  // can explain, not an invented live result.
  expect(data.source).toBe("catalogue");
  expect(data.live).toBe(false);
  expect(data.clientFallback).toBe(true);
  expect(data.songs[0].title).toBe("Kesariya");
  expect(data.songs[0].previewUrl).toMatch(/^https:/);
});

test("the discovery screen meets automated accessibility checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  // Wait for hydration through a real interaction, not a screenshot DOM mutation.
  await page.getByRole("button", { name: "Hindi", exact: true }).click();
  await page
    .getByRole("group", { name: "Filter music by mood or language" })
    .getByRole("button", { name: "For you", exact: true })
    .click();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      rule: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        detail: node.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Expand player", exact: true })
    .click();
  const expanded = await new AxeBuilder({ page })
    .include(".now-playing-dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    expanded.violations.map((violation) => ({
      rule: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        detail: node.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("playback keyboard shortcuts work without scrolling or stealing input keys", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Discover your sound.", exact: true })
    .click();
  const player = page.getByRole("region", { name: "Music player" });
  const scroll = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("Space");
  await expect(
    player.getByRole("button", { name: "Pause playback", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await page.keyboard.press("m");
  await expect(
    player.getByRole("button", { name: "Unmute", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio) => (audio as HTMLAudioElement).muted),
    )
    .toBe(true);
  await page.keyboard.press("m");
  await expect(
    player.getByRole("button", { name: "Mute", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio) => (audio as HTMLAudioElement).muted),
    )
    .toBe(false);
  await page.keyboard.press("Space");
  await expect(
    player.getByRole("button", { name: "Play playback", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("music with spaces");
  await page.getByRole("searchbox").press("Space");
  await expect(
    player.getByRole("button", { name: "Play playback", exact: true }),
  ).toBeVisible();
});
