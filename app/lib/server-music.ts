// Server-only provider configuration. API keys never enter a browser module.
import { searchApple } from "./apple";
import type { SearchResponse, Song } from "./types";
import {
  configuredProviders,
  parseIsoDuration,
  parseYouTubeApiSearch,
  searchLiveSongs,
  type YouTubeProvider,
} from "./youtube";

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
        const response = await fetch(
          `${base}/videos?${new URLSearchParams({
            part: "contentDetails",
            id: ids.join(","),
            key,
          })}`,
          { signal, cache: "no-store" },
        );
        if (!response.ok) return parseYouTubeApiSearch(payload);
        const body = (await response.json()) as {
          items?: { id?: string; contentDetails?: { duration?: string } }[];
        };
        const durations: Record<string, number> = {};
        for (const item of body.items ?? [])
          if (item.id)
            durations[item.id] = parseIsoDuration(
              item.contentDetails?.duration,
            );
        return parseYouTubeApiSearch(payload, durations);
      } catch {
        return parseYouTubeApiSearch(payload);
      }
    },
  };
}

/** Live providers first. The bundled catalogue is only an explicitly labelled outage fallback. */
export async function findMusic(
  query: string,
  options: { signal?: AbortSignal; offlineSongs: Song[]; disabled?: boolean },
): Promise<SearchResponse & { provider?: string }> {
  const { signal, offlineSongs } = options;
  if (options.disabled || process.env.MUSIC_DISABLE_LIVE_SEARCH === "1")
    return {
      songs: offlineSongs,
      source: "catalogue",
      live: false,
      clientFallback: false,
    };

  const key = process.env.YOUTUBE_API_KEY?.trim();
  const appleController = new AbortController();
  const appleSignal = signal
    ? AbortSignal.any([signal, appleController.signal])
    : appleController.signal;
  // Running the preview request alongside YouTube keeps outages from adding
  // another four seconds to every discovery/category request.
  const apple = searchApple(query, {
    signal: appleSignal,
    base: process.env.MUSIC_APPLE_API_URL,
  }).catch(() => undefined);
  try {
    const live = await searchLiveSongs(query, {
      mode: "server",
      signal,
      providers: key
        ? [youTubeApiProvider(key), ...configuredProviders()]
        : configuredProviders(),
    });
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (live.ok)
      return {
        songs: live.songs,
        source: "youtube",
        live: true,
        provider: live.provider,
      };
    const previews = await apple;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (previews !== undefined)
      return {
        songs: previews,
        source: "apple",
        live: true,
        clientFallback: true,
      };
    return {
      songs: offlineSongs,
      source: offlineSongs.length ? "catalogue" : "offline",
      live: false,
      clientFallback: true,
    };
  } finally {
    appleController.abort();
  }
}
