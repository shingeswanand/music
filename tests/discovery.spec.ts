import { expect, test } from "@playwright/test";
import { GET as discoverRoute } from "../app/api/discover/route";
import { GET as searchRoute } from "../app/api/search/route";
import { parseAppleTracks } from "../app/lib/apple";
import { parseSearchResponse } from "../app/lib/api";
import {
  artistsFromSongs,
  dailyMix,
  fallbackDiscovery,
  makeDiscovery,
  mixesFromSongs,
  uniqueSongs,
} from "../app/lib/discovery";
import { findMusic } from "../app/lib/server-music";
import { isSong, type Song } from "../app/lib/types";

const track: Song = {
  id: "new-provider-track",
  title: "A new song",
  artist: "New artist · Another voice",
  album: "New album",
  image: "https://example.com/album.jpg",
  duration: 189,
  categories: ["Hindi", "Chill"],
  previewUrl: "https://example.com/preview.m4a",
};
const appleTrack = {
  kind: "song",
  trackId: 98765,
  trackName: 'A new song (From "New film")',
  artistName: "New artist",
  collectionName: "New film",
  artworkUrl100: "https://example.com/100x100bb.jpg",
  previewUrl: "https://example.com/preview.m4a",
  trackTimeMillis: 189000,
  trackViewUrl: "https://music.apple.com/in/album/98765",
  primaryGenreName: "Marathi",
};

test("Apple payloads become real, deduplicated, playable preview records", () => {
  expect(
    parseAppleTracks({
      results: [appleTrack, appleTrack, { ...appleTrack, kind: "podcast" }],
    }),
  ).toEqual([
    {
      id: "98765",
      title: "A new song",
      artist: "New artist",
      album: "New film",
      image: "https://example.com/600x600bb.jpg",
      duration: 189,
      categories: ["Marathi"],
      previewUrl: "https://example.com/preview.m4a",
      externalUrl: "https://music.apple.com/in/album/98765",
    },
  ]);
});

test("malformed provider payloads fail safely and unsafe media is rejected", () => {
  expect(() => parseAppleTracks({ items: [] })).toThrow(
    "Invalid music provider response",
  );
  expect(
    parseAppleTracks({
      results: [
        null,
        { ...appleTrack, previewUrl: "javascript:alert(1)" },
        { ...appleTrack, trackId: Infinity },
      ],
    }),
  ).toEqual([]);
  const [song] = parseAppleTracks({
    results: [
      {
        ...appleTrack,
        trackTimeMillis: NaN,
        artworkUrl100: "bad",
        trackViewUrl: "javascript:bad",
      },
    ],
  });
  expect(song.duration).toBe(0);
  expect(song.image).toBe("/images/playlist-night.webp");
  expect(song.externalUrl).toBeUndefined();
  expect(isSong({ ...track, externalUrl: "javascript:alert(1)" })).toBe(false);
});

test("client response validation cannot treat malformed responses as live music", () => {
  expect(() => parseSearchResponse({ songs: null, source: "apple" })).toThrow();
  expect(() =>
    parseSearchResponse({ songs: [], source: "invented" }),
  ).toThrow();
  expect(() =>
    parseSearchResponse({ songs: [{}], source: "youtube" }),
  ).toThrow();
  expect(
    parseSearchResponse({ songs: [null, track], source: "apple", live: true })
      .songs,
  ).toEqual([track]);
});

test("artist names, artwork and counts are derived from current songs", () => {
  const artists = artistsFromSongs([
    track,
    { ...track, id: "second", artist: "New artist" },
  ]);
  expect(artists[0]).toMatchObject({
    name: "New artist",
    trackCount: 2,
    image: track.image,
    description: "2 tracks in this selection",
  });
  expect(artists[1]).toMatchObject({ name: "Another voice", trackCount: 1 });
  expect(artists.some((artist) => artist.name === "Arijit Singh")).toBe(false);
  expect(artistsFromSongs([])).toEqual([]);
});

test("mixes contain current provider tracks, not fixed catalogue song IDs", () => {
  const mixes = mixesFromSongs([
    track,
    { ...track, id: "marathi-new", categories: ["Marathi"] },
  ]);
  expect(
    mixes.find((mix) => mix.id === "bollywood")?.songs.map((song) => song.id),
  ).toEqual([track.id]);
  expect(mixes.find((mix) => mix.id === "marathi")?.songs[0].id).toBe(
    "marathi-new",
  );
  expect(mixes.find((mix) => mix.id === "late-night")?.image).toBe(track.image);
  expect(mixes.find((mix) => mix.id === "good-energy")?.songs).toEqual([]);
});

test("Daily Mix reacts to actual likes and history without duplicates", () => {
  const tracks = Array.from({ length: 10 }, (_, index) => ({
    ...track,
    id: `track-${index}`,
    title: `Track ${index}`,
  }));
  const mix = dailyMix(
    tracks,
    [tracks[7]],
    [tracks[2], tracks[7]],
    "2026-10-01",
  );
  expect(mix[0].id).toBe("track-7");
  expect(mix[1].id).toBe("track-2");
  expect(new Set(mix.map((song) => song.id)).size).toBe(mix.length);
  expect(dailyMix(tracks, [], [], "2026-10-01")).toEqual(
    dailyMix(tracks, [], [], "2026-10-01"),
  );
  expect(dailyMix(tracks, [], [], "2026-10-02")).not.toEqual(
    dailyMix(tracks, [], [], "2026-10-01"),
  );
});

test("duplicate tracks merge their discovery categories", () => {
  expect(uniqueSongs([track, { ...track, categories: ["Indie"] }])).toEqual([
    { ...track, categories: ["Hindi", "Chill", "Indie"] },
  ]);
});

test("partial provider outages are not labelled as completely live", () => {
  const response = makeDiscovery(
    [
      { songs: [track], source: "apple", live: true },
      { songs: [], source: "offline", live: false, clientFallback: true },
    ],
    "For you",
  );
  expect(response).toMatchObject({
    live: false,
    partial: true,
    source: "mixed",
    clientFallback: true,
  });
  expect(response.error).toContain("Some live providers");
  expect(response.artists[0].name).toBe("New artist");
});

test("an honest empty live feed does not generate offline tracks or artists", () => {
  const response = makeDiscovery(
    [{ songs: [], source: "youtube", live: true }],
    "Hindi",
  );
  expect(response.live).toBe(true);
  expect(response.songs).toEqual([]);
  expect(response.artists).toEqual([]);
  expect(response.mixes.every((mix) => mix.songs.length === 0)).toBe(true);
  expect(response.error).toBeUndefined();
});

test("offline selection is explicit and respects the requested language", () => {
  const response = fallbackDiscovery("Marathi", undefined, false);
  expect(response).toMatchObject({
    live: false,
    source: "catalogue",
    clientFallback: false,
  });
  expect(
    response.songs.every((song) => song.categories.includes("Marathi")),
  ).toBe(true);
  expect(response.error).toContain("offline catalogue");
});

test("disabled live providers never make network calls", async () => {
  const fetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Unexpected network request");
  };
  try {
    expect(
      await findMusic("new song", { offlineSongs: [track], disabled: true }),
    ).toMatchObject({
      songs: [track],
      source: "catalogue",
      live: false,
      clientFallback: false,
    });
  } finally {
    globalThis.fetch = fetch;
  }
});

test("cancelled API requests finish quietly without starting provider requests", async () => {
  const controller = new AbortController();
  controller.abort();
  for (const [handler, path] of [
    [discoverRoute, "/api/discover?category=Hindi"],
    [searchRoute, "/api/search?query=Hindi"],
  ] as const) {
    const response = await handler(
      new Request(`http://localhost${path}`, { signal: controller.signal }),
    );
    expect(response.status).toBe(499);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
