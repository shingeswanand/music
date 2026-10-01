import { ARTIST_IMAGES, CATEGORIES, SONGS } from "./catalogue";
import type {
  Artist,
  DiscoveryCategory,
  DiscoveryResponse,
  ListeningMix,
  MixDefinition,
  SearchResponse,
  Song,
} from "./types";

export const MIXES: MixDefinition[] = [
  {
    id: "bollywood",
    name: "Bollywood, with love",
    description: "For your main-character moments.",
    image: "/images/playlist-love.webp",
    color: "#b67a87",
    query: "Bollywood romantic songs",
    category: "Hindi",
  },
  {
    id: "late-night",
    name: "Late night drive",
    description: "City lights. Quiet thoughts.",
    image: "/images/playlist-night.webp",
    color: "#8684ba",
    query: "Hindi chill acoustic songs",
    category: "Chill",
  },
  {
    id: "marathi",
    name: "Marathi मनातलं",
    description: "A little closer to home.",
    image: "/images/playlist-sunset.webp",
    color: "#de9c60",
    query: "Marathi songs",
    category: "Marathi",
  },
  {
    id: "good-energy",
    name: "Only good energy",
    description: "Turn it up. Let it all go.",
    image: "/images/playlist-party.webp",
    color: "#bd7661",
    query: "Hindi party dance songs",
    category: "Party",
  },
];

const CATEGORY_QUERIES: Record<DiscoveryCategory, string[]> = {
  "For you": ["Hindi songs", "Marathi songs", "Indian indie music"],
  Hindi: ["Hindi songs"],
  Marathi: ["Marathi songs"],
  Indie: ["Indian indie music"],
  Chill: ["Hindi chill acoustic songs"],
  Party: ["Hindi party dance songs"],
};

export function isDiscoveryCategory(
  value: unknown,
): value is DiscoveryCategory {
  return (
    typeof value === "string" && CATEGORIES.includes(value as DiscoveryCategory)
  );
}

export function discoveryQueries(category: DiscoveryCategory, mixId?: string) {
  const mix = MIXES.find((item) => item.id === mixId);
  return mix ? [mix.query] : CATEGORY_QUERIES[category];
}

export function offlineSongs(category: DiscoveryCategory, mixId?: string) {
  const selection =
    MIXES.find((item) => item.id === mixId)?.category ?? category;
  return selection === "For you"
    ? SONGS
    : SONGS.filter((song) => song.categories.includes(selection));
}

export function uniqueSongs(songs: Song[]): Song[] {
  const byId = new Map<string, Song>();
  for (const song of songs) {
    const previous = byId.get(song.id);
    byId.set(
      song.id,
      previous
        ? {
            ...previous,
            categories: [
              ...new Set([...previous.categories, ...song.categories]),
            ],
          }
        : song,
    );
  }
  return [...byId.values()];
}

/** Category hints describe the provider query; they are not a claim about charts or popularity. */
export function tagSelection(songs: Song[], category: DiscoveryCategory) {
  if (category === "For you") return songs;
  return songs.map((song) => ({
    ...song,
    categories: [...new Set([...song.categories, category])],
  }));
}

export function artistsFromSongs(songs: Song[]): Artist[] {
  const artists = new Map<string, Artist>();
  for (const song of songs) {
    const names = song.artist
      .split(/\s*[·,&]\s*|\s+(?:feat\.?|ft\.?)\s+/i)
      .filter(Boolean);
    for (const name of new Set(names)) {
      const previous = artists.get(name);
      const trackCount = (previous?.trackCount ?? 0) + 1;
      artists.set(name, {
        name,
        image:
          previous?.image ??
          (song.image.startsWith("/images/")
            ? ARTIST_IMAGES[name]
            : undefined) ??
          song.image,
        trackCount,
        description: `${trackCount} ${trackCount === 1 ? "track" : "tracks"} in this selection`,
      });
    }
  }
  return [...artists.values()]
    .sort((a, b) => b.trackCount - a.trackCount)
    .slice(0, 5);
}

export function mixesFromSongs(songs: Song[]): ListeningMix[] {
  return MIXES.map((mix) => {
    const tracks = songs.filter((song) =>
      song.categories.includes(mix.category),
    );
    return { ...mix, songs: tracks, image: tracks[0]?.image ?? mix.image };
  });
}

export function makeDiscovery(
  results: SearchResponse[],
  category: DiscoveryCategory,
  mixId?: string,
): DiscoveryResponse {
  const sources = [...new Set(results.map((result) => result.source))];
  const songs = uniqueSongs(results.flatMap((result) => result.songs));
  const live =
    results.length > 0 && results.every((result) => result.live === true);
  const partial = !live && results.some((result) => result.live === true);
  return {
    category,
    ...(mixId ? { mixId } : {}),
    queries: discoveryQueries(category, mixId),
    updatedAt: new Date().toISOString(),
    songs,
    artists: artistsFromSongs(songs),
    mixes: mixesFromSongs(songs),
    source:
      sources.length === 1 ? sources[0] : sources.length ? "mixed" : "offline",
    live,
    partial,
    clientFallback: results.some((result) => result.clientFallback === true),
    ...(!live
      ? {
          error: partial
            ? "Some live providers couldn’t be reached. Showing the available music and offline picks."
            : "Live discovery is unavailable on this network. Showing the offline catalogue.",
        }
      : {}),
  };
}

export function fallbackDiscovery(
  category: DiscoveryCategory,
  mixId?: string,
  retry = true,
) {
  return makeDiscovery(
    [
      {
        songs: offlineSongs(category, mixId),
        source: "catalogue",
        live: false,
        clientFallback: retry,
      },
    ],
    category,
    mixId,
  );
}

function hash(text: string) {
  let value = 2166136261;
  for (const char of text)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return (value ^ (value >>> 16)) >>> 0;
}

/** A reproducible daily order, with real library selections shaping its contents. */
export function dailyMix(
  songs: Song[],
  favorites: Song[],
  recent: Song[],
  day: string,
) {
  const anchors = uniqueSongs([
    ...favorites.slice(-3).reverse(),
    ...recent.slice(0, 3),
  ]);
  const preferred = new Set(anchors.flatMap((song) => song.categories));
  const ranked = [...songs].sort((a, b) => {
    const score = (song: Song) =>
      song.categories.filter((category) => preferred.has(category)).length;
    return (
      score(b) - score(a) || hash(`${day}:${a.id}`) - hash(`${day}:${b.id}`)
    );
  });
  return uniqueSongs([...anchors, ...ranked]).slice(0, 20);
}
