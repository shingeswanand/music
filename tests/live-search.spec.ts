import { expect, test } from "@playwright/test";
import {
  blockLiveMirrors,
  invidiousResults,
  mirrorPattern,
} from "./live-mirrors";

test.beforeEach(async ({ page }) => {
  await blockLiveMirrors(page);
});

const liveTrack = {
  id: "BddP6PYo2gs",
  title: "Kesariya - Brahmāstra",
  artist: "Sony Music India",
  album: "YouTube",
  image: "https://i.ytimg.com/vi/BddP6PYo2gs/hq720.jpg",
  duration: 173,
  categories: ["YouTube"],
  youtubeId: "BddP6PYo2gs",
  externalUrl: "https://www.youtube.com/watch?v=BddP6PYo2gs",
};

test("live YouTube results render as full songs, not previews", async ({
  page,
}) => {
  await page.route("**/api/search**", (route) =>
    route.fulfill({
      json: {
        songs: [liveTrack, { ...liveTrack, id: "W1S9AbHpWFY", title: "Kesariya (Lyrics)" }],
        source: "youtube",
        live: true,
        provider: "invidious.f5.si",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("searchbox").fill("Kesariya");
  await page.getByRole("searchbox").press("Enter");

  await expect(
    page.getByRole("heading", { name: "Found your sound" }),
  ).toBeVisible();
  await expect(page.locator(".song-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Kesariya - Brahmāstra", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".search-section")).toContainText(
    "Streaming in full from YouTube",
  );
  // The bundled catalogue notice belongs to fallback results only.
  await expect(page.locator(".offline-note")).toHaveCount(0);

  // Playing a live result keeps the YouTube source visible in the player.
  await page
    .getByRole("button", { name: "Play Kesariya - Brahmāstra", exact: true })
    .click();
  await expect(page.locator(".player-song")).toContainText(
    "Kesariya - Brahmāstra",
  );
  await expect(page.locator(".player-song")).toContainText("YOUTUBE");
});

test("the browser retries live search when the server cannot reach YouTube", async ({
  page,
}) => {
  await page.unroute(mirrorPattern);
  await page.route("**/api/search**", (route) =>
    route.fulfill({
      json: { songs: [], source: "offline", live: false, clientFallback: true },
    }),
  );
  await page.route("https://invidious.f5.si/api/v1/search**", (route) =>
    route.fulfill({ json: invidiousResults }),
  );

  await page.goto("/");
  await page.getByRole("searchbox").fill("kesariya song");
  await page.getByRole("searchbox").press("Enter");

  await expect(page.locator(".song-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Kesariya - Brahmāstra", exact: true }),
  ).toBeVisible();
  // "(Lyrics) Full Song - …" is cleaned down to the song and its film.
  await expect(
    page.getByRole("button", { name: "Kesariya - Brahmastra", exact: true }),
  ).toBeVisible();
  // The news entry is filtered out by the shared ranking pipeline.
  await expect(page.locator(".search-section")).not.toContainText("NEWS report");
  await expect(page.locator(".offline-note")).toHaveCount(0);
});

test("every mirror failing leaves the catalogue in place with an explanation", async ({
  page,
}) => {
  await page.route("**/api/search**", (route) =>
    route.fulfill({
      json: {
        songs: [],
        source: "offline",
        live: false,
        clientFallback: true,
        error: "Live search is unavailable right now.",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("searchbox").fill("Kesariya");
  await page.getByRole("searchbox").press("Enter");
  await expect(page.locator(".offline-note")).toContainText(
    "Live search is unavailable right now.",
  );
  // With no results and no live provider the app refuses to invent tracks.
  await expect(page.locator(".song-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Let’s explore what’s here." }),
  ).toBeVisible();
});

test("a live search that finds nothing says so instead of showing the catalogue", async ({
  page,
}) => {
  await page.route("**/api/search**", (route) =>
    route.fulfill({ json: { songs: [], source: "youtube", live: true } }),
  );
  await page.goto("/");
  await page.getByRole("searchbox").fill("Kesariya");
  await page.getByRole("searchbox").press("Enter");
  await expect(
    page.getByRole("heading", { name: "No tracks found. Yet." }),
  ).toBeVisible();
  await expect(page.locator(".song-card")).toHaveCount(0);
  await expect(page.locator(".offline-note")).toHaveCount(0);
});
