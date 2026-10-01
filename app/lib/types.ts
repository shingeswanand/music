export type Category =
  "For you" | "Hindi" | "Marathi" | "Indie" | "Chill" | "Party";

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
};

export type CuratedPlaylist = {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  songIds: string[];
};

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
  source: "catalogue" | "apple" | "offline";
};

export function isSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false;
  const song = value as Record<string, unknown>;
  return (
    typeof song.id === "string" &&
    typeof song.title === "string" &&
    typeof song.artist === "string" &&
    typeof song.album === "string" &&
    typeof song.image === "string" &&
    typeof song.duration === "number" &&
    Number.isFinite(song.duration) &&
    song.duration >= 0 &&
    Array.isArray(song.categories) &&
    song.categories.every((category) => typeof category === "string") &&
    (typeof song.previewUrl === "string" || typeof song.youtubeId === "string")
  );
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
