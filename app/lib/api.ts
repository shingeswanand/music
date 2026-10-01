import { searchCatalogue } from "./catalogue";
import type { SearchResponse } from "./types";

export async function searchSongs(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  try {
    const response = await fetch(
      `/api/search?query=${encodeURIComponent(query.trim())}`,
      { signal },
    );
    if (!response.ok)
      throw new Error("Search is taking a break. Please try again.");
    return (await response.json()) as SearchResponse;
  } catch (error) {
    if (signal?.aborted) throw error;
    // The installed app can still search its bundled catalogue while offline.
    return { songs: searchCatalogue(query), source: "offline" };
  }
}
