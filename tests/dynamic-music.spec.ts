import { expect, test, type Page } from "@playwright/test";
import {
  fallbackDiscovery,
  isDiscoveryCategory,
  makeDiscovery,
} from "../app/lib/discovery";
import type { DiscoveryCategory, Song } from "../app/lib/types";
import { mockAudio } from "./fixtures";
import {
  blockLiveMirrors,
  invidiousResults,
  mirrorPattern,
} from "./live-mirrors";

function song(
  id: string,
  title: string,
  artist: string,
  categories: Song["categories"],
  image = "/images/heeriye.webp",
): Song {
  return {
    id,
    title,
    artist,
    categories,
    image,
    album: `${title} album`,
    duration: 200,
    previewUrl: `https://audio-ssl.itunes.apple.com/test-${id}.m4a`,
    externalUrl: `https://music.apple.com/in/album/${id}`,
  };
}
const tracks = [
  song("fresh-hindi", "Aurora", "A new voice", ["Hindi", "Chill"]),
  song(
    "fresh-marathi",
    "Coastal morning",
    "Another artist",
    ["Marathi"],
    "/images/ved.webp",
  ),
  song(
    "fresh-indie",
    "Starlight",
    "Indie newcomer",
    ["Indie", "Party"],
    "/images/ilahi.webp",
  ),
];
const stationTracks = [
  song(
    "station-one",
    "Station exclusive",
    "Station artist",
    ["Marathi"],
    "/images/sairat.webp",
  ),
  song(
    "station-two",
    "One more station song",
    "Station artist",
    ["Marathi"],
    "/images/ved.webp",
  ),
];

async function mockLiveDiscovery(
  page: Page,
  resolve: (category: DiscoveryCategory, mixId?: string) => Song[] = () =>
    tracks,
) {
  await page.route("**/api/discover**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const raw = params.get("category");
    const category = isDiscoveryCategory(raw) ? raw : "For you";
    const mixId = params.get("mix") ?? undefined;
    return route.fulfill({
      json: makeDiscovery(
        [
          {
            songs: resolve(category, mixId),
            source: "apple",
            live: true,
            clientFallback: false,
          },
        ],
        category,
        mixId,
      ),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await blockLiveMirrors(page);
  await mockAudio(page);
});

test("home, artists, mix artwork and the initial queue use fetched data", async ({
  page,
}) => {
  await mockLiveDiscovery(page);
  await page.goto("/");
  await expect(page.locator(".song-card")).toHaveCount(3);
  await expect(page.locator(".song-grid")).toContainText("Aurora");
  await expect(page.locator(".song-grid")).not.toContainText("Kesariya");
  await expect(page.locator(".artist-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Find songs by A new voice" }),
  ).toBeVisible();
  await expect(
    page.locator(".mood-card").first().locator("img"),
  ).toHaveAttribute("src", tracks[0].image);
  await expect(page.locator(".discovery-status")).toContainText(
    "Live discovery",
  );
  await expect(page.locator(".player-song-text")).toContainText("Aurora");
  expect(
    await page
      .locator("audio")
      .evaluate((audio) => (audio as HTMLAudioElement).paused),
  ).toBe(true);
  await page.getByRole("button", { name: "Open play queue" }).click();
  await expect(
    page.getByRole("dialog", { name: "Play queue" }).locator(".queue-track"),
  ).toHaveCount(3);
});

test("refresh updates the feed and artists instead of reusing a static list", async ({
  page,
}) => {
  let current = tracks;
  let calls = 0;
  await mockLiveDiscovery(page, () => {
    calls++;
    return current;
  });
  await page.goto("/");
  await expect(page.locator(".song-card")).toHaveCount(3);
  current = [song("just-released", "New horizon", "Today’s artist", ["Hindi"])];
  await page.getByRole("button", { name: "Refresh music" }).click();
  await expect(page.locator(".song-card")).toHaveCount(1);
  await expect(page.locator(".song-grid")).toContainText("New horizon");
  await expect(page.locator(".artist-card")).toContainText("Today’s artist");
  await expect(page.locator(".player-song-text")).toContainText("New horizon");
  expect(calls).toBeGreaterThanOrEqual(2);
});

test("refresh never interrupts an active song or overwrites a chosen queue", async ({
  page,
}) => {
  let current = tracks;
  await mockLiveDiscovery(page, () => current);
  await page.goto("/");
  await page.getByRole("button", { name: "Play Aurora", exact: true }).click();
  const player = page.getByRole("region", { name: "Music player" });
  await expect(
    player.getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  current = [
    song("another-release", "Different discovery", "Different artist", [
      "Indie",
    ]),
  ];
  await page.getByRole("button", { name: "Refresh music" }).click();
  await expect(page.locator(".song-grid")).toContainText("Different discovery");
  await expect(player.locator(".player-song-text")).toContainText("Aurora");
  await expect(
    player.getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open play queue" }).click();
  const queue = page.getByRole("dialog", { name: "Play queue" });
  await expect(queue.locator(".queue-track")).toHaveCount(3);
  await expect(queue).not.toContainText("Different discovery");
});

test("categories request their own live selections and persist the preference", async ({
  page,
}) => {
  const requests: string[] = [];
  await mockLiveDiscovery(page, (category) => {
    requests.push(category);
    return category === "Marathi" ? stationTracks : tracks;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Marathi", exact: true }).click();
  await expect(page.locator(".song-card")).toHaveCount(2);
  await expect(page.locator(".song-grid")).toContainText("Station exclusive");
  await page
    .getByRole("button", { name: "Play Station exclusive", exact: true })
    .click();
  await page.getByRole("button", { name: "Open play queue" }).click();
  await expect(
    page.getByRole("dialog", { name: "Play queue" }).locator(".queue-track"),
  ).toHaveCount(2);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Marathi", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".song-grid")).toContainText("Station exclusive");
  expect(requests).toContain("Marathi");
});

test("a late category response cannot replace the current category", async ({
  page,
}) => {
  let release = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requestedHindi = false;
  let finishedHindi = false;
  await page.route("**/api/discover**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const category = params.get("category") as DiscoveryCategory;
    if (category === "Hindi") {
      requestedHindi = true;
      await hold;
    }
    await route.fulfill({
      json: makeDiscovery(
        [
          {
            songs: category === "Marathi" ? stationTracks : tracks,
            source: "apple",
            live: true,
          },
        ],
        category,
      ),
    });
    if (category === "Hindi") finishedHindi = true;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Hindi", exact: true }).click();
  await expect.poll(() => requestedHindi).toBe(true);
  await page.getByRole("button", { name: "Marathi", exact: true }).click();
  await expect(page.locator(".song-grid")).toContainText("Station exclusive");
  release();
  await expect.poll(() => finishedHindi).toBe(true);
  await expect(page.locator(".song-grid")).not.toContainText("Aurora");
  await expect(
    page.getByRole("button", { name: "Marathi", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("an empty live discovery remains empty, with no invented songs or artists", async ({
  page,
}) => {
  await mockLiveDiscovery(page, () => []);
  await page.goto("/");
  await expect(page.locator(".feed-empty")).toContainText(
    "No tracks in this selection yet",
  );
  await expect(page.locator(".song-card")).toHaveCount(0);
  await expect(page.locator(".artist-card")).toHaveCount(0);
  await expect(page.locator(".discovery-status")).toContainText(
    "Live discovery",
  );
  await expect(
    page.getByRole("button", { name: "Play playback" }),
  ).toBeDisabled();
});

test("discovery outages and malformed responses are explained instead of disguised as live", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/discover**", (route) =>
    route.fulfill({ json: { songs: [{}], source: "apple", live: true } }),
  );
  await page.goto("/");
  await expect(page.locator(".discovery-status")).toContainText(
    "Offline catalogue",
  );
  await expect(page.locator(".song-card")).toHaveCount(6);
  await page.unroute("**/api/discover**");
  await page.route("**/api/discover**", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Refresh music" }).click();
  await expect(page.locator(".discovery-status")).toContainText(
    "Showing the offline catalogue",
  );
  expect(errors).toEqual([]);
});

test("the listener's browser can upgrade an unreachable discovery provider to live songs", async ({
  page,
}) => {
  await page.unroute(mirrorPattern);
  await page.route(mirrorPattern, (route) => route.abort("failed"));
  await page.route("https://invidious.f5.si/api/v1/search**", (route) =>
    route.fulfill({ json: invidiousResults }),
  );
  await page.route("**/api/discover**", (route) => {
    const raw = new URL(route.request().url()).searchParams.get("category");
    return route.fulfill({
      json: fallbackDiscovery(isDiscoveryCategory(raw) ? raw : "For you"),
    });
  });
  await page.goto("/");
  await expect(page.locator(".song-card")).toHaveCount(2);
  await expect(page.locator(".discovery-status")).toContainText(
    "Live discovery",
  );
  await expect(page.locator(".song-grid")).toContainText(
    "Kesariya - Brahmāstra",
  );
  await expect(page.locator(".player-song-text")).toContainText("YOUTUBE");
});

test("mix pages fetch and refresh their own tracklists, not the home feed", async ({
  page,
}) => {
  let mixSongs = stationTracks;
  await mockLiveDiscovery(page, (_category, mixId) =>
    mixId ? mixSongs : tracks,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore playlist", exact: true })
    .click();
  await expect(page.locator(".track-row")).toHaveCount(2);
  await expect(page.locator(".track-list")).toContainText("Station exclusive");
  await expect(page.locator(".track-list")).not.toContainText("Aurora");
  mixSongs = [song("mix-update", "A fresher mix", "Mix artist", ["Hindi"])];
  await page.getByRole("button", { name: "Refresh this mix" }).click();
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page.locator(".track-list")).toContainText("A fresher mix");
  await page
    .getByRole("button", { name: "More actions for A fresher mix" })
    .click();
  await page
    .getByRole("button", { name: "Create playlist with this song" })
    .click();
  await page
    .locator(".playlist-nav")
    .getByRole("button", { name: "A fresher mix mix", exact: true })
    .click();
  await expect(page.locator(".song-card")).toHaveCount(1);
  await expect(page.locator(".song-grid")).toContainText("A fresher mix");
});

test("radio loads the selected station and enables a real repeating shuffle queue", async ({
  page,
}) => {
  await mockLiveDiscovery(page, (_category, mixId) =>
    mixId ? stationTracks : tracks,
  );
  await page.goto("/");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Radio", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Play Marathi मनातलं station" })
    .click();
  const player = page.getByRole("region", { name: "Music player" });
  await expect(
    player.getByRole("button", { name: "Repeat: all" }),
  ).toBeVisible();
  await expect(player.getByRole("button", { name: "Shuffle" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".station-grid")).toContainText(
    "2 tracks · Live selection",
  );
  await player.getByRole("button", { name: "Open play queue" }).click();
  const queue = page.getByRole("dialog", { name: "Play queue" });
  await expect(queue.locator(".queue-track")).toHaveCount(2);
  await expect(queue).toContainText("Station exclusive");
  await expect(queue).not.toContainText("Aurora");
});

test("the Daily Mix responds to likes and keeps the personalized choice after reload", async ({
  page,
}) => {
  await mockLiveDiscovery(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Like Starlight", exact: true })
    .click();
  await expect(page.locator(".daily-mix")).toContainText(
    "Starting with Starlight",
  );
  await expect(page.locator(".daily-mix")).toContainText(
    "INSPIRED BY YOUR LISTENING",
  );
  await page.getByRole("button", { name: "Play your Daily Mix" }).click();
  await expect(page.locator(".player-song-text")).toContainText("Starlight");
  await page.reload();
  await expect(page.locator(".daily-mix")).toContainText(
    "Starting with Starlight",
  );
  expect(
    await page
      .locator("audio")
      .evaluate((audio) => (audio as HTMLAudioElement).paused),
  ).toBe(true);
});

test("personal playlists can be renamed and reordered with persisted results", async ({
  page,
}) => {
  await mockLiveDiscovery(page);
  await page.goto("/");
  await page
    .locator(".song-grid")
    .getByRole("button", { name: "More actions for Aurora" })
    .click();
  await page
    .getByRole("button", { name: "Create playlist with this song" })
    .click();
  await page
    .getByRole("button", { name: "More actions for Coastal morning" })
    .click();
  await page
    .getByRole("group", { name: "Actions for Coastal morning" })
    .getByRole("button", { name: "Aurora mix", exact: true })
    .click();
  await page
    .locator(".playlist-nav")
    .getByRole("button", { name: "Aurora mix", exact: true })
    .click();
  await expect(page.locator(".song-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "More actions for Coastal morning" })
    .click();
  await page
    .getByRole("button", { name: "Move Coastal morning earlier" })
    .click();
  await expect(page.locator(".song-title").first()).toHaveText(
    "Coastal morning",
  );
  await page.getByRole("button", { name: "Rename this playlist" }).click();
  const rename = page.getByRole("dialog", { name: "Rename playlist" });
  await rename.getByLabel("Playlist name").fill("My live discoveries");
  await rename.getByRole("button", { name: "Save name" }).click();
  await expect(
    page.getByRole("heading", { name: "My live discoveries", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .locator(".playlist-nav")
    .getByRole("button", { name: "My live discoveries", exact: true })
    .click();
  await expect(page.locator(".song-title").first()).toHaveText(
    "Coastal morning",
  );
});

test("profile name and library statistics are editable, live, and persistent", async ({
  page,
}) => {
  await mockLiveDiscovery(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Like Aurora", exact: true }).click();
  await page.getByRole("button", { name: "Play Aurora", exact: true }).click();
  await page
    .locator(".song-grid")
    .getByRole("button", { name: "More actions for Aurora" })
    .click();
  await page
    .getByRole("button", { name: "Create playlist with this song" })
    .click();
  await page.getByRole("button", { name: "Open your profile" }).click();
  await expect(page.locator(".profile-dropdown")).toContainText(
    "1 liked · 1 recent · 1 playlist",
  );
  await page.getByRole("button", { name: "Edit your profile" }).click();
  const profile = page.getByRole("dialog", { name: "Your profile" });
  await profile.getByLabel("Display name").fill("   ");
  await expect(
    profile.getByRole("button", { name: "Save profile" }),
  ).toBeDisabled();
  await profile.getByLabel("Display name").fill("Samir Shah");
  await profile.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator(".avatar")).toHaveText("SS");
  await page.reload();
  await page.getByRole("button", { name: "Open your profile" }).click();
  await expect(page.locator(".profile-dropdown")).toContainText("Samir Shah");
  await expect(page.locator(".profile-dropdown")).toContainText(
    "1 liked · 1 recent · 1 playlist",
  );
});

test("the chosen queue, song and playback modes survive reload without autoplay", async ({
  page,
}) => {
  await mockLiveDiscovery(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play Coastal morning", exact: true })
    .click();
  const player = page.getByRole("region", { name: "Music player" });
  await player.getByRole("button", { name: "Shuffle" }).click();
  await player.getByRole("button", { name: "Repeat: off" }).click();
  await player.getByRole("button", { name: "Open play queue" }).click();
  await page
    .getByRole("dialog", { name: "Play queue" })
    .getByRole("button", { name: "Remove Aurora from queue" })
    .click();
  await page.reload();
  await expect(page.locator(".player-song-text")).toContainText(
    "Coastal morning",
  );
  await expect(player.getByRole("button", { name: "Shuffle" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    player.getByRole("button", { name: "Repeat: all" }),
  ).toBeVisible();
  expect(
    await page
      .locator("audio")
      .evaluate((audio) => (audio as HTMLAudioElement).paused),
  ).toBe(true);
  await player.getByRole("button", { name: "Open play queue" }).click();
  await expect(
    page.getByRole("dialog", { name: "Play queue" }).locator(".queue-track"),
  ).toHaveCount(2);
});

test("dynamic menus remain reachable on mobile without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockLiveDiscovery(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "More actions for Starlight" })
    .click();
  await page
    .getByRole("button", { name: "Create playlist with this song" })
    .click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog", { name: "Navigation" })
    .getByRole("button", { name: "Starlight mix", exact: true })
    .click();
  await page
    .getByRole("button", { name: "More actions for Starlight" })
    .click();
  await page.getByRole("button", { name: "Remove from playlist" }).click();
  await expect(page.locator(".song-card")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("browser-side Apple discovery works when neither the server nor YouTube is reachable", async ({
  page,
}) => {
  await page.unroute("https://itunes.apple.com/search**");
  await page.route("https://itunes.apple.com/search**", (route) =>
    route.fulfill({
      json: {
        results: [
          {
            kind: "song",
            trackId: 7654321,
            trackName: "Browser preview find",
            artistName: "Reachable artist",
            collectionName: "A live album",
            artworkUrl100: "https://example.com/100x100bb.jpg",
            previewUrl: "https://audio-ssl.itunes.apple.com/test-browser.m4a",
            trackTimeMillis: 189000,
            trackViewUrl: "https://music.apple.com/in/album/7654321",
            primaryGenreName: "Bollywood",
          },
        ],
      },
    }),
  );
  await page.route("**/api/discover**", (route) =>
    route.fulfill({ json: fallbackDiscovery("For you") }),
  );
  await page.goto("/");
  await expect(page.locator(".song-card")).toHaveCount(1);
  await expect(page.locator(".song-grid")).toContainText(
    "Browser preview find",
  );
  await expect(page.locator(".discovery-status")).toContainText(
    "Live discovery",
  );
  await expect(page.locator(".artist-card")).toContainText("Reachable artist");
  await page
    .getByRole("button", { name: "Play Browser preview find", exact: true })
    .click();
  await expect(page.locator(".player-song-text")).toContainText("PREVIEW");
});

test("a pending mix cannot override a newer explicit playback choice", async ({
  page,
}) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/api/discover**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const mixId = params.get("mix") ?? undefined;
    if (mixId) {
      requested = true;
      await pending;
    }
    await route.fulfill({
      json: makeDiscovery(
        [
          {
            songs: mixId ? stationTracks : tracks,
            source: "apple",
            live: true,
          },
        ],
        "For you",
        mixId,
      ),
    });
  });
  await page.goto("/");
  await expect(page.locator(".song-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Play the mix", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page
    .locator(".song-grid")
    .getByRole("button", { name: "Play Aurora", exact: true })
    .click();
  release();
  await expect(
    page.getByRole("button", { name: "Play the mix", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".player-song-text")).toContainText("Aurora");
  await page.getByRole("button", { name: "Open play queue" }).click();
  await expect(
    page.getByRole("dialog", { name: "Play queue" }).locator(".queue-track"),
  ).toHaveCount(3);
});

test("live feeds, track menus and the editable profile meet accessibility checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await mockLiveDiscovery(page);
  await page.goto("/");
  await expect(page.locator(".song-card")).toHaveCount(3);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "More actions for Aurora" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .include(".song-dropdown")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open your profile" }).click();
  await page.getByRole("button", { name: "Edit your profile" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .include(".create-dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("refreshing to an empty live feed clears an untouched default player", async ({
  page,
}) => {
  let current = tracks;
  await mockLiveDiscovery(page, () => current);
  await page.goto("/");
  await expect(page.locator(".player-song-text")).toContainText("Aurora");
  current = [];
  await page.getByRole("button", { name: "Refresh music" }).click();
  await expect(page.locator(".song-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Play playback" }),
  ).toBeDisabled();
  await expect(page.locator(".player-song-text")).not.toContainText("Aurora");
});

test("library changes sync between tabs without replacing active playback", async ({
  page,
  context,
}) => {
  await mockLiveDiscovery(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play Coastal morning", exact: true })
    .click();
  const other = await context.newPage();
  await blockLiveMirrors(other);
  await mockAudio(other);
  await mockLiveDiscovery(other);
  await other.goto("/");
  await other
    .getByRole("button", { name: "Play Starlight", exact: true })
    .click();
  await other
    .locator(".song-grid")
    .getByRole("button", { name: "Like Starlight", exact: true })
    .click();
  await expect(
    page
      .locator(".song-grid")
      .getByRole("button", { name: "Unlike Starlight", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".player-song-text")).toContainText(
    "Coastal morning",
  );
  await expect(
    page
      .getByRole("region", { name: "Music player" })
      .getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  await other.close();
});
