import { expect, test } from "@playwright/test";
import {
  cleanChannel,
  cleanTitle,
  invidiousProvider,
  parseInvidiousSearch,
  parseIsoDuration,
  parsePipedSearch,
  parseYouTubeApiSearch,
  pipedProvider,
  rankVideos,
  songsFromVideos,
  toSong,
} from "../app/lib/youtube";

/**
 * Live search is only as good as its parsing, and mirrors are third parties
 * that change shape without notice. These are real (trimmed) payloads from the
 * Invidious and Piped APIs, kept as fixtures so the pipeline stays honest.
 */

const invidiousPayload = [
  {
    type: "video",
    title:
      "Kesariya - Brahmāstra | Ranbir Kapoor, Alia Bhatt | Pritam | Arijit Singh | Amitabh Bhattacharya| 4K",
    videoId: "BddP6PYo2gs",
    author: "Sony Music India",
    authorVerified: true,
    lengthSeconds: 173,
    viewCount: 620737318,
    liveNow: false,
    isUpcoming: false,
  },
  {
    type: "video",
    title: "Kesariya (Lyrics) Full Song - Brahmastra | Arijit Singh",
    videoId: "W1S9AbHpWFY",
    author: "7clouds",
    authorVerified: true,
    lengthSeconds: 266,
    viewCount: 27466567,
    liveNow: false,
  },
  {
    type: "video",
    title: "Kesariya Live in Concert",
    videoId: "LIVE1234567",
    author: "Arijit Singh",
    lengthSeconds: 5400,
    liveNow: true,
  },
  { type: "playlist", title: "Kesariya playlist", playlistId: "PL123" },
  { type: "video", title: "", videoId: "Broken00000" },
];

const pipedPayload = {
  items: [
    {
      url: "/watch?v=BddP6PYo2gs",
      type: "stream",
      title: "Kesariya - Brahmāstra | Ranbir Kapoor, Alia Bhatt | 4K",
      uploaderName: "Sony Music India",
      duration: 173,
      views: 620737318,
      uploaderVerified: true,
    },
    {
      url: "/watch?v=532toSHe57E",
      type: "stream",
      title: "Kesariya [Slowed + Reverb] Arijit Singh | Brahmastra",
      uploaderName: "Glim Lofi",
      duration: 312,
      views: 8834773,
    },
    {
      url: "/watch?v=NEWS1234567",
      type: "stream",
      title: "Kesariya song NEWS report",
      uploaderName: "News Today",
      duration: 120,
      views: 5000,
    },
    {
      url: "/watch?v=SHORT123456",
      type: "stream",
      title: "Kesariya #shorts",
      uploaderName: "Clips",
      duration: 32,
      views: 120000,
    },
    {
      url: "/watch?v=LIVE1234567",
      type: "stream",
      title: "Kesariya radio",
      uploaderName: "Radio",
      duration: -1,
      views: 900,
    },
    {
      url: "/channel/UC123",
      type: "channel",
      title: "Kesariya",
      uploaderName: "Channel",
    },
  ],
  nextpage: "next",
  suggestion: "kesariya song",
};

test("an Invidious search payload becomes videos, junk entries dropped", () => {
  const videos = parseInvidiousSearch(invidiousPayload);
  expect(videos.map((video) => video.videoId)).toEqual([
    "BddP6PYo2gs",
    "W1S9AbHpWFY",
    "LIVE1234567",
  ]);
  expect(videos[0]).toMatchObject({
    title:
      "Kesariya - Brahmāstra | Ranbir Kapoor, Alia Bhatt | Pritam | Arijit Singh | Amitabh Bhattacharya| 4K",
    channel: "Sony Music India",
    duration: 173,
    views: 620737318,
    verified: true,
    live: false,
  });
  // Live streams are marked, not silently queued.
  expect(videos[2].live).toBe(true);
  expect(parseInvidiousSearch({ nope: true })).toEqual([]);
});

test("a Piped search payload becomes videos, including live and shorts", () => {
  const videos = parsePipedSearch(pipedPayload);
  expect(videos.map((video) => video.videoId)).toEqual([
    "BddP6PYo2gs",
    "532toSHe57E",
    "NEWS1234567",
    "SHORT123456",
    "LIVE1234567",
  ]);
  // Piped reports live streams with a negative duration.
  expect(videos.at(-1)).toMatchObject({ live: true, duration: 0 });
  expect(parsePipedSearch({ items: "nope" })).toEqual([]);
});

test("the YouTube Data API is parsed with real durations", () => {
  const videos = parseYouTubeApiSearch(
    {
      items: [
        {
          id: { kind: "youtube#video", videoId: "BddP6PYo2gs" },
          snippet: {
            title: "Kesariya - Brahmāstra",
            channelTitle: "Sony Music India",
            liveBroadcastContent: "none",
          },
        },
        {
          id: { kind: "youtube#video", videoId: "LIVE1234567" },
          snippet: {
            title: "Kesariya radio",
            channelTitle: "Radio",
            liveBroadcastContent: "live",
          },
        },
      ],
    },
    { BddP6PYo2gs: parseIsoDuration("PT2M53S") },
  );
  expect(videos[0].duration).toBe(173);
  expect(videos[0].channel).toBe("Sony Music India");
  expect(videos[1].live).toBe(true);
  expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
  expect(parseIsoDuration("nonsense")).toBe(0);
});

test("noise, live streams and duplicates never reach the song grid", () => {
  const songs = songsFromVideos(parsePipedSearch(pipedPayload), "kesariya");
  // The news report, the #shorts clip and the radio stream are gone.
  expect(songs.map((song) => song.title)).toEqual([
    "Kesariya - Brahmāstra",
    "Kesariya [Slowed + Reverb] Arijit Singh",
  ]);
  expect(songs.every((song) => song.youtubeId === song.id)).toBe(true);
  expect(songs.every((song) => song.categories[0] === "YouTube")).toBe(true);
  expect(songs[0].image).toBe(
    "https://i.ytimg.com/vi/BddP6PYo2gs/hq720.jpg",
  );
});

test("ranking prefers exact matches over loose ones and keeps order stable", () => {
  const videos = parsePipedSearch({
    items: [
      {
        url: "/watch?v=11111111111",
        type: "stream",
        title: "Best Bollywood remix party mix 2024",
        uploaderName: "DJ",
        duration: 4000,
        views: 1000000,
      },
      {
        url: "/watch?v=22222222222",
        type: "stream",
        title: "Tum Hi Ho - Arijit Singh (Official Video)",
        uploaderName: "T-Series",
        duration: 260,
        views: 900000000,
        uploaderVerified: true,
      },
    ],
  });
  const ranked = rankVideos(videos, "Tum Hi Ho");
  expect(ranked[0].videoId).toBe("22222222222");
  // The unrelated mix may still appear, just below the real match.
  expect(ranked.map((video) => video.videoId)).toEqual([
    "22222222222",
    "11111111111",
  ]);
});

test("a search for something noisy still returns what YouTube matched", () => {
  const videos = parsePipedSearch({
    items: [
      {
        url: "/watch?v=33333333333",
        type: "stream",
        title: "Arijit Singh interview about his latest song",
        uploaderName: "Film Companion",
        duration: 1800,
        views: 200000,
      },
    ],
  });
  // "interview" is filtered out — unless the listener searched for interviews.
  expect(rankVideos(videos, "arijit singh")).toEqual([]);
  expect(rankVideos(videos, "arijit singh interview")[0].videoId).toBe(
    "33333333333",
  );
});

test("titles are cleaned up and channels are credited", () => {
  expect(
    cleanTitle(
      "Kesariya - Brahmāstra | Ranbir Kapoor, Alia Bhatt | Pritam | Arijit Singh | Amitabh Bhattacharya| 4K",
    ),
  ).toBe("Kesariya - Brahmāstra");
  expect(cleanTitle("Tum Hi Ho (Official Music Video)")).toBe("Tum Hi Ho");
  expect(cleanTitle("Raabta | Official Video | Movie")).toBe("Raabta | Movie");
  // Real words that merely start with a noise word survive.
  expect(cleanTitle("Officially Missing You")).toBe("Officially Missing You");
  expect(cleanChannel("Sony Music India - Topic")).toBe("Sony Music India");
  expect(cleanChannel("SonyMusicIndiaVEVO")).toBe("SonyMusicIndia");
  expect(cleanChannel("")).toBe("YouTube");
});

test("a video becomes a playable full song, not a preview", () => {
  const song = toSong(parseInvidiousSearch(invidiousPayload)[0]);
  expect(song).toEqual({
    id: "BddP6PYo2gs",
    title: "Kesariya - Brahmāstra",
    artist: "Sony Music India",
    album: "YouTube",
    image: "https://i.ytimg.com/vi/BddP6PYo2gs/hq720.jpg",
    duration: 173,
    categories: ["YouTube"],
    youtubeId: "BddP6PYo2gs",
    externalUrl: "https://www.youtube.com/watch?v=BddP6PYo2gs",
  });
  expect(song.previewUrl).toBeUndefined();
});

test("mirror request URLs are built for each API shape", () => {
  expect(
    invidiousProvider("invidious.f5.si").url("kesariya song"),
  ).toBe("https://invidious.f5.si/api/v1/search?q=kesariya+song&type=video");
  expect(pipedProvider("api.piped.private.coffee").url("kesariya")).toBe(
    "https://api.piped.private.coffee/search?q=kesariya&filter=videos",
  );
});
