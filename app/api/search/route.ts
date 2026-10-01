import { NextResponse } from "next/server";
import { searchCatalogue } from "../../lib/catalogue";
import type { Category, Song } from "../../lib/types";

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

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("query") ?? params.get("q") ?? "").trim();
  if (!query || query.length > 200) {
    return NextResponse.json(
      { message: "Enter a search between 1 and 200 characters." },
      { status: 400 },
    );
  }

  const localSongs = searchCatalogue(query);
  // Familiar favorites resolve instantly, even if the external provider is down.
  if (localSongs.length)
    return NextResponse.json({ songs: localSongs, source: "catalogue" });

  try {
    const url = new URL("https://itunes.apple.com/search");
    url.search = new URLSearchParams({
      term: query,
      entity: "song",
      country: "IN",
      limit: "24",
    }).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    });
    if (!response.ok)
      throw new Error(`Music provider returned ${response.status}`);
    const data: { results?: AppleTrack[] } = await response.json();
    if (!Array.isArray(data.results))
      throw new Error("Invalid music provider response");
    const songs: Song[] = data.results.flatMap((track) => {
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
    return NextResponse.json({ songs, source: "apple" });
  } catch {
    // An outage is not a successful empty search; the UI explains the difference.
    return NextResponse.json({ songs: localSongs, source: "offline" });
  }
}
