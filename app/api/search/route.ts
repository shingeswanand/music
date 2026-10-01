import { NextResponse } from "next/server";
import { searchCatalogue } from "../../lib/catalogue";
import {
  configuredProviders,
  parseIsoDuration,
  parseYouTubeApiSearch,
  searchLiveSongs,
  type LiveSearchOutcome,
  type YouTubeProvider,
} from "../../lib/youtube";
import type { Category, SearchResponse, Song } from "../../lib/types";

// Route handlers are uncached by default in this Next.js version, which is what
// live search needs: every request asks YouTube for its own query.

type AppleTrack = {
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
  primaryGenreName?: string;
};

/**
 * Optional official provider: set YOUTUBE_API_KEY and the route asks the
 * YouTube Data API first. The public mirrors keep working without any key.
 */
function youTubeApiProvider(key: string): YouTubeProvider {
  const base = "https://www.googleapis.com/youtube/v3";
  return {
    id: "youtube-data-api",
    base,
    url(query) {
      return `${base}/search?${new URLSearchParams({
        part: "snippet",
        type: "video",
        maxResults: "25",
        q: query,
        key,
      })}`;
    },
    async parse(payload, { signal }) {
      const items = (payload as { items?: { id?: { videoId?: string } }[] })
        .items;
      const ids = (items ?? []).flatMap((item) =>
        item.id?.videoId ? [item.id.videoId] : [],
      );
      if (!ids.length) return parseYouTubeApiSearch(payload);
      try {
        // One extra call turns the results into songs with real durations.
        const details = await fetch(
          `${base}/videos?${new URLSearchParams({
            part: "contentDetails",
            id: ids.join(","),
            key,
          })}`,
          { signal, cache: "no-store" },
        );
        if (!details.ok) return parseYouTubeApiSearch(payload);
        const body = (await details.json()) as {
          items?: { id?: string; contentDetails?: { duration?: string } }[];
        };
        const durations: Record<string, number> = {};
        for (const item of body.items ?? [])
          if (item.id)
            durations[item.id] = parseIsoDuration(item.contentDetails?.duration);
        return parseYouTubeApiSearch(payload, durations);
      } catch {
        // Durations are a nicety; the player reads the real length anyway.
        return parseYouTubeApiSearch(payload);
      }
    },
  };
}

/** Last live resort: Apple's public search API, which serves 30s previews. */
async function searchApple(query: string): Promise<Song[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({
    term: query,
    entity: "song",
    country: "IN",
    limit: "24",
  }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Music provider returned ${response.status}`);
  const data: { results?: AppleTrack[] } = await response.json();
  if (!Array.isArray(data.results))
    throw new Error("Invalid music provider response");
  return data.results.flatMap((track) => {
    if (
      track.kind !== "song" ||
      !track.trackId ||
      !track.trackName ||
      !track.previewUrl
    )
      return [];
    const genre = track.primaryGenreName?.toLowerCase() ?? "";
    const categories: Category[] = genre.includes("marathi")
      ? ["Marathi"]
      : genre.includes("bollywood")
        ? ["Hindi"]
        : genre.includes("indie")
          ? ["Indie"]
          : [];
    return [
      {
        id: String(track.trackId),
        title: track.trackName
          .replace(/\s*\(?\s*From\s+".*?"\)?/i, "")
          .trim(),
        artist: track.artistName ?? "Unknown artist",
        album: track.collectionName ?? "Single",
        image:
          track.artworkUrl100?.replace("100x100bb", "600x600bb") ??
          "/images/playlist-night.webp",
        duration: (track.trackTimeMillis ?? 0) / 1000,
        categories,
        previewUrl: track.previewUrl,
        externalUrl: track.trackViewUrl,
      },
    ];
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("query") ?? params.get("q") ?? "").trim();
  if (!query || query.length > 200) {
    return NextResponse.json(
      { message: "Enter a search between 1 and 200 characters." },
      { status: 400 },
    );
  }

  const key = process.env.YOUTUBE_API_KEY?.trim();
  // Set MUSIC_DISABLE_LIVE_SEARCH=1 for a curated, offline-only deployment
  // (and for the deterministic browser tests).
  const disabled = process.env.MUSIC_DISABLE_LIVE_SEARCH === "1";
  const live: LiveSearchOutcome = disabled
    ? { ok: false, songs: [] }
    : await searchLiveSongs(query, {
        mode: "server",
        providers: key
          ? [youTubeApiProvider(key), ...configuredProviders()]
          : configuredProviders(),
        signal: request.signal,
      });

  // Songs stream straight from YouTube whenever a mirror answers.
  if (live.ok)
    return NextResponse.json({
      songs: live.songs,
      source: "youtube",
      live: true,
      provider: live.provider,
    } satisfies SearchResponse & { provider?: string });

  // No mirror reachable: stay honest and offer the bundled favourites instead.
  const localSongs = searchCatalogue(query);
  if (localSongs.length)
    return NextResponse.json({
      songs: localSongs,
      source: "catalogue",
      live: false,
      clientFallback: !disabled,
    } satisfies SearchResponse);

  try {
    const songs = await searchApple(query);
    return NextResponse.json({
      songs,
      source: "apple",
      live: true,
    } satisfies SearchResponse);
  } catch {
    // An outage is not a successful empty search; the UI explains the difference.
    return NextResponse.json({
      songs: [],
      source: "offline",
      live: false,
      clientFallback: !disabled,
    } satisfies SearchResponse);
  }
}
