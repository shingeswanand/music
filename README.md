# SMS Music

A warm, responsive music discovery app built with Next.js 16 and React 19. Search anything and play full songs from YouTube, browse a handpicked Hindi and Marathi catalogue, and build a personal listening library.

## Run locally

```bash
npm ci
npm run dev -- --hostname 0.0.0.0
```

Open http://localhost:3000. **No API keys or separate backend are needed.** The included `server/` folder is the legacy YouTube search service; the app talks to YouTube through its own same-origin `/api/search` route instead.

## What works

- Curated discovery, Hindi/Marathi and mood filters, artist search, and listening stations
- Live search: any song, artist, or album streams in full from YouTube, with real titles, durations, and artwork
- Handpicked catalogue results whenever a live search cannot be reached
- Native audio playback with progress, seeking, next/previous, shuffle, repeat, volume, and mute
- Persistent liked songs, the last 30 listening selections, volume, and personal playlists
- Create playlists, add/remove tracks through their action menus, and delete with confirmation
- Editable playback queue and an expanded now-playing view
- Mobile navigation, focus-trapped native dialogs, reduced-motion support, and keyboard shortcuts
- Media Session controls and installable PWA with real application icons and an offline listening-space shell

### Playback and search

**Search is live.** Every query goes to YouTube and the results are real songs: full uploads, real titles, real durations, and real thumbnails. Nothing about a search result is hard-coded — the grid on the search screen is whatever YouTube has for that query right now. Results that are not music (news clips, trailers, interviews, reactions, live streams, Shorts, and 5-second teasers) are filtered out, and titles are tidied up for display. Full songs play through a hidden YouTube player, so the player badge reads **YouTube** and the actions menu links to `youtube.com`.

The app does not have a private YouTube key, so the search route asks public, CORS-enabled YouTube mirrors instead — [Invidious](https://invidious.io) and [Piped](https://piped.video) instances. It walks them server-side until one answers; if the host this app runs on has no route to YouTube (a sandboxed preview or a locked-down network), the **browser** retries the same search directly against the mirrors, because the listener's network usually can reach them even when the server's cannot. Only when no mirror answers does search fall back to the bundled catalogue, and the app says so rather than passing off catalogue tracks as live results.

Home, Discover, and the curated stations still use the **handpicked catalogue**, whose entries are **official Apple Music preview URLs** rather than full recordings. The player shows a Preview badge for those, reads the actual clip duration, and links to the full track at its provider. Old YouTube favorites are migrated and can still play through the YouTube player.

Queries typed in the browser may be sent to a public mirror (never to an account or an ad network), and audio streams straight from YouTube when a song plays. Both need an internet connection.

Your library is stored only in this browser's local storage. It is not an account or cloud-synced library. Corrupt or unavailable storage is handled safely; blocked writes fall back to session memory.

### Search configuration

Search works with no configuration. These optional environment variables tune it:

| Variable                    | What it does                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `YOUTUBE_API_KEY`           | Ask the official YouTube Data API v3 first. Set it on the server for the most reliable, highest-quota results; the public mirrors remain the fallback.         |
| `MUSIC_YOUTUBE_MIRRORS`     | Replace the public mirror list on the server, e.g. `piped:https://pipedapi.example.com,invidious:https://invidious.example.com`. Bare URLs default to Piped.   |
| `MUSIC_DISABLE_LIVE_SEARCH` | `1` keeps this deployment on the curated catalogue only (no YouTube requests from the server or the browser).                                                  |

The mirror list lives in `app/lib/youtube.ts`. Public instances come and go, so that list is the one place to update them.

### Keyboard shortcuts

| Shortcut       | Action                                             |
| -------------- | -------------------------------------------------- |
| Ctrl / Cmd + K | Focus search                                       |
| Space          | Play / pause, outside interactive controls         |
| Left / Right   | Seek by five seconds, outside interactive controls |
| M              | Mute / unmute, outside interactive controls        |
| Escape         | Close the active dialog                            |

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Browser tests cover discovery, live search, mirror outages, language filters, playback, queues, persistence, playlist management, malformed/blocked storage, mobile layouts, keyboard/dialog behavior, and automated accessibility checks. Stop any development server and run `TEST_PRODUCTION=1 npm test` to also verify the production PWA and offline catalogue search.

Tests never depend on a public mirror: `playwright.config.ts` points the server at a local mock mirror, the browser's mirror requests are intercepted, and `tests/youtube.spec.ts` exercises parsing, filtering, and ranking against real (trimmed) Invidious and Piped payloads. Set `MUSIC_YOUTUBE_MIRRORS` to a real instance to run the suite against live search instead. The test runner will build and start a production server if one is not already running. Tests use a generated silent WAV fixture for deterministic audio assertions; no recordings are downloaded or bundled.

To use an existing Chromium installation, set `CHROMIUM_EXECUTABLE_PATH`. The lightweight authored service worker caches the app shell, fonts, and artwork in production. It never caches search API responses or external recordings. Service-worker registration is disabled in development. The dev server allows Arena's `*.e2b.app` preview origins.

## Artwork and fonts

Artwork credits and generated-image details are in [ASSETS.md](ASSETS.md). Fonts are self-hosted through Fontsource, including a Devanagari fallback for Marathi titles.
