import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

/**
 * The route handler's live path runs against a local mock mirror.
 * playwright.config.ts points MUSIC_YOUTUBE_MIRRORS at this port, so the
 * server walks "YouTube" exactly like it would with a self-hosted Piped
 * instance — no third party, no flakiness.
 *
 * Contract of the mock: it only answers queries containing "mirror" (with
 * results) or starting with "nothing" (an honest empty result). Everything
 * else gets a 503, which keeps every other test on its deterministic
 * catalogue fallback no matter which worker is running.
 */
const PORT = Number(process.env.MUSIC_TEST_MIRROR_PORT ?? 3987);
const BASE = `http://127.0.0.1:${PORT}`;

const mirrorPayload = {
  items: [
    {
      url: "/watch?v=BddP6PYo2gs",
      type: "stream",
      title:
        "Kesariya - Brahmāstra | Ranbir Kapoor, Alia Bhatt | Pritam | Arijit Singh | 4K",
      uploaderName: "Sony Music India",
      duration: 173,
      views: 620737318,
      uploaderVerified: true,
    },
    {
      url: "/watch?v=NEWS1234567",
      type: "stream",
      title: "Kesariya song NEWS report tonight",
      uploaderName: "News Today",
      duration: 120,
      views: 5000,
    },
    {
      url: "/watch?v=LIVE1234567",
      type: "stream",
      title: "Kesariya radio",
      uploaderName: "Radio",
      duration: -1,
      views: 900,
    },
  ],
};

let mirror: Server;
const requests: string[] = [];

test.beforeAll(async () => {
  mirror = createServer((request, response) => {
    const url = new URL(request.url ?? "/", BASE);
    requests.push(url.pathname + url.search);
    const query = url.searchParams.get("q") ?? "";
    if (url.pathname !== "/search" || !/^(mirror|nothing)/i.test(query)) {
      response.writeHead(503).end();
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify(query.toLowerCase().startsWith("nothing") ? { items: [] } : mirrorPayload),
    );
  });
  await new Promise<void>((resolve) =>
    mirror.listen(PORT, "127.0.0.1", resolve),
  );
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => mirror.close(() => resolve()));
});

test("the route asks the configured mirror and streams full YouTube songs", async ({
  request,
}) => {
  const response = await request.get("/api/search?query=mirror+only+kesariya");
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.source).toBe("youtube");
  expect(data.live).toBe(true);
  expect(data.provider).toBe(`127.0.0.1:${PORT}`);
  // Junk and live streams are filtered out, the full song is kept.
  expect(data.songs).toHaveLength(1);
  expect(data.songs[0]).toMatchObject({
    id: "BddP6PYo2gs",
    title: "Kesariya - Brahmāstra",
    artist: "Sony Music India",
    duration: 173,
    categories: ["YouTube"],
    youtubeId: "BddP6PYo2gs",
    externalUrl: "https://www.youtube.com/watch?v=BddP6PYo2gs",
  });
  // Full songs stream from YouTube: no 30-second preview URL is invented.
  expect(data.songs[0].previewUrl).toBeUndefined();
  expect(requests.at(-1)).toContain("/search?q=mirror+only+kesariya");
});

test("a mirror that answers with nothing is not an outage", async ({
  request,
}) => {
  const response = await request.get("/api/search?query=nothingmatchesthis");
  const data = await response.json();
  expect(data.source).toBe("youtube");
  expect(data.live).toBe(true);
  expect(data.songs).toEqual([]);
});

test("a mirror that is down falls back to the catalogue and says so", async ({
  request,
}) => {
  const response = await request.get("/api/search?query=Kesariya");
  const data = await response.json();
  expect(data.source).toBe("catalogue");
  expect(data.live).toBe(false);
  expect(data.clientFallback).toBe(true);
  expect(data.songs[0].title).toBe("Kesariya");
});

test("the search page shows live results the route fetched", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("mirror only kesariya");
  await page.getByRole("searchbox").press("Enter");
  await expect(page.locator(".song-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Kesariya - Brahmāstra", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".search-section")).toContainText(
    "Streaming in full from YouTube",
  );
  await expect(page.locator(".offline-note")).toHaveCount(0);
});
