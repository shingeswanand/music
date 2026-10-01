import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

// The search/discovery routes use the same provider adapter. A local Apple
// double verifies real request-time data without depending on a public API.
const PORT = Number(process.env.MUSIC_TEST_APPLE_PORT ?? 3988);
const BASE = `http://127.0.0.1:${PORT}`;
const queries = [
  "Hindi songs",
  "Marathi songs",
  "Indian indie music",
  "Hindi chill acoustic songs",
  "Hindi party dance songs",
  "Bollywood romantic songs",
];
let server: Server;
let revision = 1;
let mode: "live" | "empty" | "down" | "partial" | "malformed" = "live";
const requests: string[] = [];

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", BASE);
    const term = url.searchParams.get("term") ?? "";
    requests.push(term);
    if (
      url.pathname !== "/search" ||
      !queries.includes(term) ||
      mode === "down" ||
      (mode === "partial" && term === "Marathi songs")
    ) {
      response.writeHead(503).end();
      return;
    }
    const index = queries.indexOf(term);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify(
        mode === "malformed"
          ? { invalid: true }
          : {
              results:
                mode === "empty"
                  ? []
                  : [
                      {
                        kind: "song",
                        trackId: revision * 100000 + index,
                        trackName: `Provider find ${revision} ${index}`,
                        artistName: `Fresh artist ${index}`,
                        collectionName: `Current album ${revision}`,
                        artworkUrl100: `https://example.com/${index}/100x100bb.jpg`,
                        previewUrl: `https://audio-ssl.itunes.apple.com/test-${revision}-${index}.m4a`,
                        trackTimeMillis: 210000,
                        trackViewUrl: `https://music.apple.com/in/album/${revision}-${index}`,
                        primaryGenreName:
                          index === 1
                            ? "Marathi"
                            : index === 2
                              ? "Indian Indie"
                              : "Bollywood",
                      },
                    ],
            },
      ),
    );
  });
  await new Promise<void>((resolve) =>
    server.listen(PORT, "127.0.0.1", resolve),
  );
});
test.beforeEach(() => {
  mode = "live";
  revision = 1;
  requests.length = 0;
});
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("discovery fetches live provider metadata and derives artists and mixes", async ({
  request,
}) => {
  const response = await request.get("/api/discover?category=For+you");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const data = await response.json();
  expect(data).toMatchObject({
    source: "apple",
    live: true,
    category: "For you",
  });
  expect(data.songs).toHaveLength(3);
  expect(data.songs.map((song: { title: string }) => song.title)).toEqual([
    "Provider find 1 0",
    "Provider find 1 1",
    "Provider find 1 2",
  ]);
  expect(data.artists.map((artist: { name: string }) => artist.name)).toContain(
    "Fresh artist 0",
  );
  expect(
    data.mixes.find((mix: { id: string }) => mix.id === "marathi").songs[0]
      .title,
  ).toBe("Provider find 1 1");
  expect(requests).toEqual(
    expect.arrayContaining([
      "Hindi songs",
      "Marathi songs",
      "Indian indie music",
    ]),
  );
});

test("subsequent requests see changed provider results, not a static snapshot", async ({
  request,
}) => {
  const first = await (
    await request.get("/api/discover?category=Hindi")
  ).json();
  revision = 2;
  const next = await (await request.get("/api/discover?category=Hindi")).json();
  expect(first.songs[0].title).toBe("Provider find 1 0");
  expect(next.songs[0].title).toBe("Provider find 2 0");
  expect(next.songs[0].id).not.toBe(first.songs[0].id);
});

test("station tracklists are fetched for their own query on demand", async ({
  request,
}) => {
  const data = await (await request.get("/api/discover?mix=late-night")).json();
  expect(data.mixId).toBe("late-night");
  expect(data.songs[0]).toMatchObject({
    title: "Provider find 1 3",
    categories: ["Hindi", "Chill"],
  });
  expect(requests).toContain("Hindi chill acoustic songs");
});

test("successful empty results stay empty", async ({ request }) => {
  mode = "empty";
  const data = await (
    await request.get("/api/discover?category=Marathi")
  ).json();
  expect(data).toMatchObject({
    live: true,
    source: "apple",
    songs: [],
    artists: [],
  });
});

test("provider outages and invalid payloads use a labelled category fallback", async ({
  request,
}) => {
  for (const state of ["down", "malformed"] as const) {
    mode = state;
    const data = await (
      await request.get("/api/discover?category=Marathi")
    ).json();
    expect(data).toMatchObject({
      live: false,
      source: "catalogue",
      clientFallback: true,
    });
    expect(data.songs).toHaveLength(5);
    expect(
      data.songs.every((song: { categories: string[] }) =>
        song.categories.includes("Marathi"),
      ),
    ).toBe(true);
    expect(data.error).toContain("offline catalogue");
  }
});

test("partial failures keep available music and explain the fallback", async ({
  request,
}) => {
  mode = "partial";
  const data = await (await request.get("/api/discover")).json();
  expect(data).toMatchObject({ live: false, partial: true, source: "mixed" });
  expect(
    data.songs.some(
      (song: { title: string }) => song.title === "Provider find 1 0",
    ),
  ).toBe(true);
  expect(data.error).toContain("Some live providers");
});

test("invalid discovery categories and unknown mix IDs are rejected", async ({
  request,
}) => {
  expect((await request.get("/api/discover?category=Anything")).status()).toBe(
    400,
  );
  expect((await request.get("/api/discover?mix=not-a-mix")).status()).toBe(404);
  expect(requests).toEqual([]);
});
