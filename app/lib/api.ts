import { searchCatalogue } from "./catalogue";
import type { SearchResponse } from "./types";
import { searchLiveSongs, withTimeout } from "./youtube";

/**
 * Search runs in two steps.
 *
 * 1. The same-origin route handler asks YouTube through its public mirrors
 *    (and through a curated catalogue when nothing live can be reached).
 * 2. If the server itself has no route to YouTube — sandboxed preview hosts,
 *    locked-down networks, mirror outages — the browser retries the live
 *    search directly against the CORS-enabled mirrors.
 */
const SERVER_BUDGET_MS = 4_000;

async function requestServer(
  term: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const response = await fetch(
    `/api/search?query=${encodeURIComponent(term)}`,
    { signal: withTimeout(signal, SERVER_BUDGET_MS) },
  );
  if (!response.ok)
    throw new Error("Search is taking a break. Please try again.");
  return (await response.json()) as SearchResponse;
}

export async function searchSongs(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const term = query.trim();
  let server: SearchResponse | undefined;
  let failure: unknown;
  try {
    server = await requestServer(term, signal);
  } catch (error) {
    failure = error;
  }
  if (signal?.aborted)
    throw failure ?? new DOMException("Aborted", "AbortError");

  // The server answered from a live provider, or it intentionally stays
  // offline (MUSIC_DISABLE_LIVE_SEARCH): use what it sent.
  if (server && server.clientFallback !== true) return server;

  const live = await searchLiveSongs(term, { mode: "browser", signal });
  if (signal?.aborted)
    throw failure ?? new DOMException("Aborted", "AbortError");
  if (live.songs.length)
    return { songs: live.songs, source: "youtube", live: true };

  if (server) return server;

  // The server never answered: the bundled catalogue keeps search usable.
  const songs = searchCatalogue(term);
  return {
    songs,
    source: "offline",
    live: false,
    error: songs.length
      ? undefined
      : "Live search is temporarily unavailable. Your handpicked catalogue is still here.",
  };
}
