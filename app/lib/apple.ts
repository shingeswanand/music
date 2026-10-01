import { isWebUrl, type Category, type Song } from "./types";
import { withTimeout } from "./youtube";

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

/** Shared parser for real provider payloads; malformed tracks never reach the UI. */
export function parseAppleTracks(payload: unknown): Song[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { results?: unknown }).results)
  )
    throw new Error("Invalid music provider response");
  const results = (payload as { results: unknown[] }).results;
  const seen = new Set<string>();
  return results.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const track = entry as AppleTrack;
    if (
      track.kind !== "song" ||
      typeof track.trackId !== "number" ||
      !Number.isFinite(track.trackId) ||
      track.trackId <= 0 ||
      typeof track.trackName !== "string" ||
      !track.trackName.trim() ||
      !isWebUrl(track.previewUrl)
    )
      return [];
    const id = String(track.trackId);
    if (seen.has(id)) return [];
    seen.add(id);
    const genre =
      typeof track.primaryGenreName === "string"
        ? track.primaryGenreName.toLowerCase()
        : "";
    const categories: Category[] = genre.includes("marathi")
      ? ["Marathi"]
      : genre.includes("bollywood") || genre.includes("hindi")
        ? ["Hindi"]
        : genre.includes("indie") || genre.includes("alternative")
          ? ["Indie"]
          : [];
    return [
      {
        id,
        title:
          track.trackName.replace(/\s*\(?\s*From\s+".*?"\)?/i, "").trim() ||
          track.trackName.trim(),
        artist:
          typeof track.artistName === "string"
            ? track.artistName
            : "Unknown artist",
        album:
          typeof track.collectionName === "string"
            ? track.collectionName
            : "Single",
        image: isWebUrl(track.artworkUrl100)
          ? track.artworkUrl100.replace(/100x100bb/, "600x600bb")
          : "/images/playlist-night.webp",
        duration:
          typeof track.trackTimeMillis === "number" &&
          Number.isFinite(track.trackTimeMillis) &&
          track.trackTimeMillis > 0
            ? track.trackTimeMillis / 1000
            : 0,
        categories,
        previewUrl: track.previewUrl,
        ...(isWebUrl(track.trackViewUrl)
          ? { externalUrl: track.trackViewUrl }
          : {}),
      },
    ];
  });
}

/** Public Apple Music search: real artwork, metadata and rights-holder previews. */
export async function searchApple(
  query: string,
  options: { signal?: AbortSignal; base?: string; limit?: number } = {},
): Promise<Song[]> {
  const url = new URL(
    "search",
    `${(options.base ?? "https://itunes.apple.com").replace(/\/+$/, "")}/`,
  );
  url.search = new URLSearchParams({
    term: query,
    entity: "song",
    country: "IN",
    limit: String(options.limit ?? 36),
  }).toString();
  const response = await fetch(url, {
    signal: withTimeout(options.signal, 4_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Music provider returned ${response.status}`);
  return parseAppleTracks(await response.json());
}
