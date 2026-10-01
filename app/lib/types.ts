export type Category =
  "For you" | "Hindi" | "Marathi" | "Indie" | "Chill" | "Party" | "YouTube";

export type DiscoveryCategory = Exclude<Category, "YouTube">;
export type MusicSource =
  "youtube" | "catalogue" | "apple" | "offline" | "mixed";

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  categories: Category[];
  previewUrl?: string;
  youtubeId?: string;
  externalUrl?: string;
};

export type Artist = {
  name: string;
  image: string;
  description: string;
  trackCount: number;
};

/** Editorial themes, not fixed track lists. Their contents come from providers. */
export type MixDefinition = {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  query: string;
  category: DiscoveryCategory;
};

export type ListeningMix = MixDefinition & { songs: Song[] };

export type Playlist = {
  id: string;
  name: string;
  songs: Song[];
};

export type View = {
  type:
    | "home"
    | "discover"
    | "radio"
    | "favorites"
    | "recent"
    | "playlist"
    | "search";
  id?: string;
  query?: string;
};

export type SearchResponse = {
  songs: Song[];
  source: MusicSource;
  /** A provider answered this exact request; false means a labelled fallback. */
  live?: boolean;
  /** The browser can retry when the server's network cannot reach a provider. */
  clientFallback?: boolean;
  error?: string;
};

export type DiscoveryResponse = SearchResponse & {
  category: DiscoveryCategory;
  mixId?: string;
  queries: string[];
  updatedAt: string;
  artists: Artist[];
  mixes: ListeningMix[];
  partial?: boolean;
};

export function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false;
  const song = value as Record<string, unknown>;
  return (
    typeof song.id === "string" &&
    !!song.id.trim() &&
    typeof song.title === "string" &&
    !!song.title.trim() &&
    typeof song.artist === "string" &&
    typeof song.album === "string" &&
    typeof song.image === "string" &&
    (isWebUrl(song.image) || /^\/(?!\/)/.test(song.image)) &&
    typeof song.duration === "number" &&
    Number.isFinite(song.duration) &&
    song.duration >= 0 &&
    Array.isArray(song.categories) &&
    song.categories.every((category) => typeof category === "string") &&
    (isWebUrl(song.previewUrl) ||
      (typeof song.youtubeId === "string" &&
        /^[a-zA-Z0-9_-]{11}$/.test(song.youtubeId))) &&
    (song.externalUrl === undefined || isWebUrl(song.externalUrl))
  );
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function sourceLabel(source: MusicSource) {
  if (source === "youtube") return "Streaming in full from YouTube";
  if (source === "apple") return "Official previews available";
  if (source === "mixed") return "Music from multiple sources";
  return "From your offline catalogue";
}

export function collectionSourceLabel(songs: Song[]) {
  const full = songs.filter(
    (song) => !!song.youtubeId && !song.previewUrl,
  ).length;
  const previews = songs.length - full;
  return (
    [
      full ? `${full} full YouTube ${full === 1 ? "track" : "tracks"}` : "",
      previews
        ? `${previews} official ${previews === 1 ? "preview" : "previews"}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Add a track to get started."
  );
}
