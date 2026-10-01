import { searchCatalogue } from "./catalogue";
import { searchApple } from "./apple";
import {
  discoveryQueries,
  fallbackDiscovery,
  makeDiscovery,
  MIXES,
  tagSelection,
} from "./discovery";
import {
  isSong,
  type DiscoveryCategory,
  type DiscoveryResponse,
  type SearchResponse,
} from "./types";
import { searchLiveSongs, withTimeout } from "./youtube";

const SERVER_BUDGET_MS = 10_000;
const SOURCES = ["youtube", "apple", "catalogue", "offline", "mixed"];

export function parseSearchResponse(payload: unknown): SearchResponse {
  if (!payload || typeof payload !== "object")
    throw new Error("Invalid music response");
  const value = payload as SearchResponse;
  if (!Array.isArray(value.songs) || !SOURCES.includes(value.source))
    throw new Error("Invalid music response");
  const songs = value.songs.filter(isSong);
  if (value.songs.length && !songs.length)
    throw new Error("Invalid music response");
  return {
    songs,
    source: value.source,
    live: typeof value.live === "boolean" ? value.live : undefined,
    clientFallback: value.clientFallback === true,
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

async function requestServer(
  term: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const response = await fetch(
    `/api/search?query=${encodeURIComponent(term)}`,
    {
      signal: withTimeout(signal, SERVER_BUDGET_MS),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error("Search is taking a break. Please try again.");
  return parseSearchResponse(await response.json());
}

export async function searchSongs(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const term = query.trim();
  let server: SearchResponse | undefined;
  try {
    server = await requestServer(term, signal);
  } catch {
    /* Retry from the listener's network. */
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (server && !server.clientFallback) return server;
  const live = await searchLiveSongs(term, { mode: "browser", signal });
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  // A successful empty result is not an outage and must not become catalogue music.
  if (live.ok) return { songs: live.songs, source: "youtube", live: true };
  if (server?.live) return server;
  try {
    const songs = await searchApple(term, { signal });
    return { songs, source: "apple", live: true };
  } catch {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return (
      server ?? {
        songs: searchCatalogue(term),
        source: "offline",
        live: false,
        error:
          "Live search is temporarily unavailable. Your offline catalogue is still here.",
      }
    );
  }
}

/** Publish server results immediately; browser retries can update them in the background. */
export async function requestDiscovery(
  category: DiscoveryCategory,
  mixId?: string,
  signal?: AbortSignal,
): Promise<DiscoveryResponse> {
  const params = new URLSearchParams({ category });
  if (mixId) params.set("mix", mixId);
  try {
    const response = await fetch(`/api/discover?${params}`, {
      signal: withTimeout(signal, SERVER_BUDGET_MS),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Discovery is temporarily unavailable.");
    const payload = (await response.json()) as Partial<DiscoveryResponse>;
    const result = parseSearchResponse(payload);
    if (payload.category !== category || payload.mixId !== mixId)
      throw new Error("Invalid discovery response");
    // Derive cards from validated tracks instead of trusting a second, possibly
    // inconsistent, list of hardcoded artist or playlist metadata.
    const data = makeDiscovery([result], category, mixId);
    return {
      ...data,
      updatedAt:
        typeof payload.updatedAt === "string" &&
        Number.isFinite(Date.parse(payload.updatedAt))
          ? payload.updatedAt
          : data.updatedAt,
      partial: payload.partial === true,
      error: result.error ?? data.error,
    };
  } catch {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return fallbackDiscovery(category, mixId);
  }
}

export async function retryDiscovery(
  previous: DiscoveryResponse,
  signal?: AbortSignal,
): Promise<DiscoveryResponse> {
  if (!previous.clientFallback) return previous;
  const mix = MIXES.find((item) => item.id === previous.mixId);
  const hints: DiscoveryCategory[] =
    previous.category === "For you" && !mix
      ? ["Hindi", "Marathi", "Indie"]
      : [mix?.category ?? previous.category];
  const queries = discoveryQueries(previous.category, previous.mixId);
  const previewController = new AbortController();
  const abortPreviews = () => previewController.abort();
  signal?.addEventListener("abort", abortPreviews, { once: true });
  // If the hosting network is blocked, the listener may still reach Apple's
  // public preview API. Start that retry alongside the full-song providers.
  const previews = previous.live
    ? undefined
    : Promise.all(
        queries.map(async (query, index) => {
          try {
            const songs = await searchApple(query, {
              signal: previewController.signal,
            });
            return {
              songs: tagSelection(songs, hints[index]),
              source: "apple",
              live: true,
            } satisfies SearchResponse;
          } catch {
            return {
              songs: [],
              source: "offline",
              live: false,
            } satisfies SearchResponse;
          }
        }),
      );
  try {
    const outcomes = await Promise.all(
      queries.map(async (query, index) => {
        const live = await searchLiveSongs(query, { mode: "browser", signal });
        return { ...live, songs: tagSelection(live.songs, hints[index]) };
      }),
    );
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (previous.live && !outcomes.every((outcome) => outcome.ok))
      return previous;
    const apple = outcomes.every((outcome) => outcome.ok)
      ? undefined
      : await previews;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const results: SearchResponse[] = outcomes.map((outcome, index) =>
      outcome.ok
        ? { songs: outcome.songs, source: "youtube", live: true }
        : (apple?.[index] ?? { songs: [], source: "offline", live: false }),
    );
    if (!results.some((result) => result.live)) return previous;
    const next = makeDiscovery(results, previous.category, previous.mixId);
    if (next.partial)
      next.error =
        "Some live providers couldn’t be reached. Showing the live tracks available.";
    return next;
  } finally {
    abortPreviews();
    signal?.removeEventListener("abort", abortPreviews);
  }
}
