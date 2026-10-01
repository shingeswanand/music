import type { Song } from "./types";

/**
 * Live YouTube search.
 *
 * YouTube's own APIs are not usable straight from a browser (no CORS headers),
 * so this module talks to public, CORS-enabled YouTube mirrors: Invidious
 * (JSON API) and Piped (JSON API). The same module runs inside the Next.js
 * route handler and inside the browser, which lets the app fall back to a
 * direct client-side search when the server itself cannot reach YouTube.
 *
 * Every helper here is a pure function: parsing, filtering and ranking are
 * covered by tests in tests/youtube.spec.ts.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeVideo = {
  videoId: string;
  title: string;
  channel: string;
  /** Seconds. 0 when the mirror did not report a length. */
  duration: number;
  views: number;
  verified: boolean;
  /** Live streams and premieres cannot be queued, so they are left out. */
  live: boolean;
};

export type ProviderContext = {
  query: string;
  signal?: AbortSignal;
};

export type YouTubeProvider = {
  /** Mirror host name, used for logs and for remembering what worked. */
  id: string;
  base: string;
  /** Builds the search request for a query. */
  url: (query: string) => string;
  /** Turns a provider payload into videos. May fetch extra details. */
  parse: (
    payload: unknown,
    context: ProviderContext,
  ) => YouTubeVideo[] | Promise<YouTubeVideo[]>;
};

export type LiveSearchOutcome = {
  /** True when at least one mirror answered, even if it found nothing. */
  ok: boolean;
  songs: Song[];
  provider?: string;
};

export type LiveSearchOptions = {
  signal?: AbortSignal;
  limit?: number;
  /**
   * "server" walks the mirrors one by one inside a request budget.
   * "browser" races them so the fastest answer wins.
   */
  mode?: "server" | "browser";
  providers?: YouTubeProvider[];
};

/** Accepts "https://host", "host" and "https://host/" alike. */
function trimBase(base: string) {
  const trimmed = base.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Invidious exposes the same JSON API on every instance. */
export function invidiousProvider(baseUrl: string): YouTubeProvider {
  const base = trimBase(baseUrl);
  return {
    id: new URL(base).host || base,
    base,
    url(query) {
      const params = new URLSearchParams({ q: query, type: "video" });
      return `${base}/api/v1/search?${params.toString()}`;
    },
    parse: parseInvidiousSearch,
  };
}

/** Piped exposes the same JSON API on every instance. */
export function pipedProvider(baseUrl: string): YouTubeProvider {
  const base = trimBase(baseUrl);
  return {
    id: new URL(base).host || base,
    base,
    url(query) {
      const params = new URLSearchParams({ q: query, filter: "videos" });
      return `${base}/search?${params.toString()}`;
    },
    parse: parsePipedSearch,
  };
}

/**
 * Public mirrors. The first entries are the ones this app has verified to
 * answer search requests; the rest are community instances used as fallbacks.
 * Mirrors come and go, so this list is the one place to update them.
 */
export const PROVIDERS: YouTubeProvider[] = [
  invidiousProvider("https://invidious.f5.si"),
  pipedProvider("https://api.piped.private.coffee"),
  pipedProvider("https://pipedapi.reallyaweso.me"),
  pipedProvider("https://pipedapi.adminforge.de"),
  pipedProvider("https://pipedapi.kavin.rocks"),
  pipedProvider("https://piped-api.privacy.com.de"),
  pipedProvider("https://pipedapi.owo.si"),
  invidiousProvider("https://invidious.nerdvpn.de"),
];

/**
 * Self-hosted mirrors, or a test double, can replace the public list on the
 * server with MUSIC_YOUTUBE_MIRRORS="piped:https://my.host,invidious:http://…".
 * Entries default to Piped when no kind is given. The browser keeps using the
 * public list, because it cannot read server environment variables.
 */
export function parseMirrorList(value: string): YouTubeProvider[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const match = entry.match(/^(invidious|piped)\s*:\s*(.+)$/i);
      const kind = match?.[1].toLowerCase() ?? "";
      const target = match?.[2] ?? entry;
      try {
        const apiPath = new URL(trimBase(target)).pathname;
        const invidious =
          kind === "invidious" || (!kind && apiPath.includes("/api/v1"));
        return [
          invidious ? invidiousProvider(target) : pipedProvider(target),
        ];
      } catch {
        return [];
      }
    });
}

export function configuredProviders() {
  const override = process.env.MUSIC_YOUTUBE_MIRRORS?.trim();
  if (!override) return PROVIDERS;
  const parsed = parseMirrorList(override);
  return parsed.length ? parsed : PROVIDERS;
}

export const PROVIDER_HOSTS = PROVIDERS.map(
  (provider) => new URL(provider.base).hostname,
);

export function thumbnailFor(videoId: string) {
  // YouTube's own thumbnail CDN: always available, unlike mirror proxies.
  // Artwork falls back to the smaller 16:9 thumbnail when this one 404s.
  return `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
}

export function watchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function providerUrl(provider: YouTubeProvider, query: string) {
  return provider.url(query);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function makeVideo(
  videoId: string,
  title: string,
  channel: string,
  duration: number,
  extra: { views?: number; verified?: boolean; live?: boolean } = {},
): YouTubeVideo | null {
  if (!VIDEO_ID.test(videoId) || !title) return null;
  return {
    videoId,
    title,
    channel: channel || "YouTube",
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    views: extra.views ?? 0,
    verified: extra.verified === true,
    live: extra.live === true,
  };
}

/** Invidious: GET /api/v1/search?q=…&type=video returns a flat array. */
export function parseInvidiousSearch(payload: unknown): YouTubeVideo[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((entry) => {
    const item = asRecord(entry);
    if (!item || item.type !== "video") return [];
    const video = makeVideo(
      asText(item.videoId),
      asText(item.title),
      asText(item.author),
      asCount(item.lengthSeconds),
      {
        views: asCount(item.viewCount),
        verified: item.authorVerified === true,
        live: item.liveNow === true || item.isUpcoming === true,
      },
    );
    return video ? [video] : [];
  });
}

/** Piped: GET /search?q=…&filter=videos returns { items: [...] }. */
export function parsePipedSearch(payload: unknown): YouTubeVideo[] {
  const items = asRecord(payload)?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((entry) => {
    const item = asRecord(entry);
    if (!item || item.type !== "stream") return [];
    const url = asText(item.url);
    const videoId = url.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] ?? "";
    const duration = asCount(item.duration);
    const video = makeVideo(
      videoId,
      asText(item.title),
      asText(item.uploaderName),
      duration,
      {
        views: asCount(item.views),
        verified: item.uploaderVerified === true,
        // Piped reports live streams with a negative duration.
        live: typeof item.duration === "number" && item.duration < 0,
      },
    );
    return video ? [video] : [];
  });
}

/** YouTube Data API v3 search response, optionally with contentDetails. */
export function parseYouTubeApiSearch(
  payload: unknown,
  durations: Record<string, number> = {},
): YouTubeVideo[] {
  const items = asRecord(payload)?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((entry) => {
    const item = asRecord(entry);
    const snippet = asRecord(item?.snippet);
    const id = asRecord(item?.id);
    if (!snippet || !id) return [];
    const videoId = asText(id.videoId);
    const video = makeVideo(
      videoId,
      asText(snippet.title),
      asText(snippet.channelTitle),
      durations[videoId] ?? 0,
      { live: snippet.liveBroadcastContent === "live" },
    );
    return video ? [video] : [];
  });
}

/** ISO 8601 durations such as PT3M26S, as returned by contentDetails. */
export function parseIsoDuration(value: unknown) {
  const text = asText(value);
  const match = text.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  );
}

export function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Titles people rarely mean to search for when looking for a song.
const NOISE =
  /\b(news|trailer|teaser|interview|podcast|reaction|review|vlog|unboxing|behind the scenes|making of|prank|recipe|cooking|gameplay|highlights|full movie|web series|episode|stand ?up comedy|status video|#?shorts)\b/;

function isNoise(title: string, query: string) {
  const match = title.match(NOISE);
  // "arijit singh interview song" should still be able to find interviews.
  return Boolean(match) && !query.includes(match![0]);
}

function scoreVideo(
  video: YouTubeVideo,
  query: string,
  words: string[],
): number | null {
  const title = normalizeText(video.title);
  const channel = normalizeText(video.channel);
  if (isNoise(title, query)) return null;
  let score = 0;
  if (query && title.includes(query)) score += 6;
  const matched = words.filter((word) => `${title} ${channel}`.includes(word));
  score += words.length ? (matched.length / words.length) * 4 : 0;
  if (/\b(official|audio|lyric|lyrical|video song|full song)\b/.test(title))
    score += 1.5;
  if (video.duration >= 90 && video.duration <= 600) score += 1;
  else if (video.duration > 0 && video.duration < 45) score -= 2; // shorts, teasers
  if (channel.includes("topic")) score += 0.5; // official "… - Topic" uploads
  if (video.verified) score += 0.5;
  score += Math.min(2, Math.log10(video.views + 1) * 0.25);
  return score;
}

/** Drops noise, ranks the closest matches first and removes duplicates. */
export function rankVideos(videos: YouTubeVideo[], query: string) {
  const normalized = normalizeText(query);
  const words = normalized.split(" ").filter((word) => word.length > 1);
  return videos
    .map((video, index) => ({
      video,
      index,
      score: scoreVideo(video, normalized, words),
    }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => b.score! - a.score! || a.index - b.index)
    .map((entry) => entry.video);
}

function unique(videos: YouTubeVideo[]) {
  const seen = new Set<string>();
  return videos.filter((video) => {
    if (seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });
}

// Uploaders stuff titles with qualifiers: "(Official Video)", "[Full Song]", …
const BRACKET_NOISE =
  /[[(]\s*(?:official\s*(?:music\s*)?(?:video|audio|track)?|music\s*video|lyric(?:al)?\s*video|lyrics?(?:\s*video)?|full\s*(?:song|video|audio)|video\s*song|audio(?:\s*song)?|song|hd|hq|4k|8k|remastered|with\s*lyrics)\s*[\])]/gi;

const PLAIN_NOISE =
  /\b(?:official\s+(?:music\s+)?video|official\s+(?:lyric|lyrical)s?(?:\s+video)?|(?:full|video|audio)\s+song|(?:lyric|lyrical)\s+video)\b|\bofficial\s+(?:lyric|lyrical)s?\b/gi;

/** Turns "Kesariya (Official Video) | Brahmāstra | 4K" into "Kesariya". */
export function cleanTitle(raw: string) {
  let title = raw
    .replace(BRACKET_NOISE, " ")
    .replace(PLAIN_NOISE, " ")
    .replace(/(?:\s*[-–]?\s*[|]\s*[-–]?\s*)+/g, " | ")
    .replace(/^(?:\s*[|]\s*)+/, "")
    .replace(/\s*[|–-]\s*(?:4k|8k|hd|hq|official|song|music|audio|video)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Keyword-stuffed titles keep the song name that leads them.
  const head = title.split(/\s+\|\s+/)[0].trim();
  const worthKeeping =
    head.length >= 12 || (title.length > 40 && head.length >= 6);
  if (worthKeeping && head.length < title.length) title = head;
  return title.replace(/[\s|–-]+$/, "").trim() || raw.trim();
}

export function cleanChannel(raw: string) {
  return (
    raw
      .replace(/\s*-\s*topic$/i, "")
      .replace(/vevo$/i, "")
      .trim() || "YouTube"
  );
}

export function toSong(video: YouTubeVideo): Song {
  return {
    id: video.videoId,
    title: cleanTitle(video.title),
    artist: cleanChannel(video.channel),
    album: "YouTube",
    image: thumbnailFor(video.videoId),
    duration: Math.round(video.duration),
    categories: ["YouTube"],
    youtubeId: video.videoId,
    externalUrl: watchUrl(video.videoId),
  };
}

/**
 * Keeps the search honest: junk and live streams are dropped, but a strange
 * query still returns whatever YouTube matched instead of nothing at all.
 */
export function songsFromVideos(
  videos: YouTubeVideo[],
  query: string,
  limit = 24,
): Song[] {
  const playable = unique(videos.filter((video) => !video.live));
  const ranked = rankVideos(playable, query);
  const chosen = (ranked.length ? ranked : playable).slice(0, limit);
  return chosen.map(toSong);
}

function composeSignals(signals: AbortSignal[]) {
  if (signals.length === 1) return signals[0];
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of signals) {
    if (signal.aborted) {
      abort();
      break;
    }
    signal.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
}

/** Combines an optional caller signal with a hard timeout. */
export function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return composeSignals(signal ? [signal, timeout] : [timeout]);
}

async function requestProvider(
  provider: YouTubeProvider,
  query: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
) {
  const composed = withTimeout(signal, timeoutMs);
  const response = await fetch(provider.url(query), {
    signal: composed,
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`${provider.id} answered ${response.status}`);
  const payload: unknown = await response.json();
  return provider.parse(payload, { query, signal: composed });
}

/** Server mode: walk the mirrors until one answers with results. */
async function runSequential(
  query: string,
  providers: YouTubeProvider[],
  signal: AbortSignal | undefined,
  limit: number,
  attemptMs: number,
  budgetMs: number,
): Promise<LiveSearchOutcome> {
  const deadline = Date.now() + budgetMs;
  let answered: string | undefined;
  for (const provider of providers) {
    const remaining = deadline - Date.now();
    if (remaining < 300) break;
    try {
      const videos = await requestProvider(
        provider,
        query,
        signal,
        Math.min(attemptMs, remaining),
      );
      answered = provider.id;
      const songs = songsFromVideos(videos, query, limit);
      if (songs.length) return { ok: true, songs, provider: provider.id };
    } catch {
      // Mirror down or blocked: move to the next one.
    }
  }
  return { ok: Boolean(answered), songs: [], provider: answered };
}

/** Browser mode: race the mirrors and keep the first useful answer. */
function runParallel(
  query: string,
  providers: YouTubeProvider[],
  signal: AbortSignal | undefined,
  limit: number,
  attemptMs: number,
): Promise<LiveSearchOutcome> {
  const controller = new AbortController();
  const composed = withTimeout(
    signal ? composeSignals([signal, controller.signal]) : controller.signal,
    attemptMs,
  );
  return new Promise((resolve) => {
    let pending = providers.length;
    let answered: string | undefined;
    let settled = false;
    const finish = (outcome: LiveSearchOutcome) => {
      if (settled) return;
      settled = true;
      controller.abort();
      resolve(outcome);
    };
    if (!pending) {
      finish({ ok: false, songs: [] });
      return;
    }
    for (const provider of providers) {
      requestProvider(provider, query, composed, attemptMs)
        .then((videos) => {
          if (!answered) answered = provider.id;
          const songs = songsFromVideos(videos, query, limit);
          if (songs.length)
            finish({ ok: true, songs, provider: provider.id });
        })
        .catch(() => undefined)
        .finally(() => {
          pending -= 1;
          if (!pending)
            finish({ ok: Boolean(answered), songs: [], provider: answered });
        });
    }
  });
}

/**
 * Browser mode is only used when the server had no route to YouTube. Mirrors
 * are raced in two waves so a single search never fans out to every public
 * instance at once.
 */
async function runBrowser(
  query: string,
  providers: YouTubeProvider[],
  signal: AbortSignal | undefined,
  limit: number,
): Promise<LiveSearchOutcome> {
  for (const wave of [providers.slice(0, 4), providers.slice(4)]) {
    if (!wave.length) break;
    const outcome = await runParallel(query, wave, signal, limit, 4_500);
    if (outcome.songs.length || outcome.ok || signal?.aborted) return outcome;
  }
  return { ok: false, songs: [] };
}

export function searchLiveSongs(
  query: string,
  options: LiveSearchOptions = {},
): Promise<LiveSearchOutcome> {
  const {
    signal,
    limit = 24,
    mode = "server",
    providers = PROVIDERS,
  } = options;
  const term = query.trim();
  if (!term) return Promise.resolve({ ok: false, songs: [] });
  return mode === "browser"
    ? runBrowser(term, providers, signal, limit)
    : runSequential(term, providers, signal, limit, 3_000, 7_000);
}
