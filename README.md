# SMS Music

A responsive music discovery app built with Next.js 16 and React 19. Home, Browse, artists, mixes, radio and search are driven by provider responses—not fixed demo track lists. Build a personal listening library and stream full YouTube tracks or official Apple Music previews.

## Run locally

```bash
npm ci
npm run dev -- --hostname 0.0.0.0
```

Open http://localhost:3000. **No API keys or separate backend are required.** The app uses its own same-origin `/api/discover` and `/api/search` routes. The included `server/` folder is an unused legacy search service.

## What works

- Live home/browse feeds with Hindi, Marathi, Indie, Chill and Party selections
- Artist names, artwork and track counts derived from the current feed
- On-demand mix and station tracklists, with refresh controls and real loading/empty/error states
- A Daily Mix personalized by liked songs and listening history, with a reproducible daily order
- Live song/artist/album search, full YouTube uploads, and official previews when YouTube is unavailable
- Real playback that keeps running in the background: progress, seeking, next/previous, shuffle, repeat, volume and mute
- Persistent likes, last 30 listening selections, playlists, display name and category preference
- Playlist creation, renaming, reordering, adding/removing tracks and confirmed deletion
- Track action menus on discovery cards, liked songs, listening history and mixes
- A live playing list: an always-visible **Up next** panel on wide screens and the same editable queue as a dialog on smaller ones, with tap-to-play, reorder, remove and clear; chosen song, queue and playback modes restored **paused** after reload
- Mobile navigation, focus-trapped dialogs, keyboard shortcuts and reduced-motion support
- Full Media Session integration — lock-screen/system controls show artwork, let you play, pause, skip, scrub ±10s and follow the live position, so listening continues when the tab is in the background — plus an installable PWA with an offline listening-space shell

## Data and playback

### Discovery is live

`GET /api/discover?category=Hindi` requests fresh provider results for that selection. The default **For you** feed combines Hindi, Marathi and Indian indie requests, deduplicates tracks, and derives its artist and mood cards from those tracks.

`GET /api/discover?mix=late-night` loads the selected mix's own query. The four editorial themes define names, mood queries and fallback artwork, **not fixed song IDs**. Featured mixes, mood cards, sidebar mixes and radio share the same resource state. Stations enable repeating shuffle playback of the returned tracklist; they are not broadcast radio streams.

The browser keeps each category/mix result for five minutes to avoid duplicate provider requests. **Refresh** bypasses that cache and asks again without interrupting playback or replacing a queue you have edited. Delayed responses are isolated by category/mix; newer playback choices take precedence over pending station requests.

### Providers and truthful fallbacks

The routes prefer full songs from YouTube, using public [Invidious](https://invidious.io) and [Piped](https://piped.video) mirrors or an optional official YouTube Data API key. Music filtering removes news, trailers, interviews, reactions, live streams, Shorts and teasers. Apple Music's public search API supplies live metadata, artwork and rights-holder preview URLs when YouTube cannot be reached.

If the deployment's network is blocked, the browser retries the public providers from the listener's network. Only when live providers cannot be reached does the app use the bundled offline catalogue. The screen explicitly says **Offline catalogue** or **Partly live** instead of presenting bundled content as live. A provider's successful empty result stays empty.

Full songs use the YouTube player and a **YouTube** badge. Apple previews use native audio and a **Preview** badge, read the actual clip duration, and link to the full track. Track availability and YouTube embedding permissions are controlled by the provider; neither full streaming nor preview availability can be guaranteed during an outage.

**Internet access is required for live discovery and recordings.** The PWA can reopen its listening-space shell and browse the offline catalogue, but it does not cache or bundle recordings. Search terms and discovery mood queries may be sent to public providers.

### Your library

Library, profile and playback-session data are saved in this browser's local storage, not an account or a cloud database. Library and profile changes synchronize between tabs; active playback stays independent so another tab cannot interrupt your song. Malformed data is validated, old YouTube favorites are migrated, and blocked storage writes fall back to session memory. Reloading never starts playback automatically.

## Provider configuration

Configuration is optional; server credentials are never sent to the browser.

| Variable                       | Purpose                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `YOUTUBE_API_KEY`              | Use the official YouTube Data API v3 first; public mirrors remain the fallback.                                                                     |
| `MUSIC_YOUTUBE_MIRRORS`        | Override the server mirror list, e.g. `piped:https://pipedapi.example.com,invidious:https://invidious.example.com`. Bare URLs default to Piped.     |
| `MUSIC_APPLE_API_URL`          | Override the server's Apple-compatible API base URL; defaults to `https://itunes.apple.com`. Useful for a self-hosted proxy or deterministic tests. |
| `MUSIC_DISABLE_LIVE_DISCOVERY` | `1` keeps discovery/mixes/stations on the labelled offline catalogue; live search remains available.                                                |
| `MUSIC_DISABLE_LIVE_SEARCH`    | `1` disables all live provider requests for both search and discovery, including browser retries.                                                   |

The public mirror list lives in `app/lib/youtube.ts`. Category queries, editorial themes, derived cards and Daily Mix logic live in `app/lib/discovery.ts`. The shared server provider adapter is `app/lib/server-music.ts`.

## Demo walkthrough

1. Open Home and check the live/fallback status. Refresh to fetch a new selection.
2. Pick a language or mood; browse or search for a song and press play.
3. Like a track and return Home: the Daily Mix now reflects your selection.
4. Use a track's action menu to create a playlist, then rename it and move tracks earlier/later.
5. Start a radio station and watch the **Up next** playing list (or open the queue on a smaller screen) to inspect its fetched, repeating shuffle tracklist; keep browsing — the music runs in the background and is controllable from your lock screen/system media overlay.
6. Edit your display name from the profile menu and reload: the library, chosen queue and profile persist, with playback paused.

## Keyboard shortcuts

| Shortcut       | Action                                            |
| -------------- | ------------------------------------------------- |
| Ctrl / Cmd + K | Focus search                                      |
| Space          | Play / pause outside interactive controls         |
| Left / Right   | Seek by five seconds outside interactive controls |
| M              | Mute / unmute outside interactive controls        |
| Escape         | Close the active dialog or track menu             |

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Tests cover provider payload validation, live discovery adapters, refreshes, late responses, empty feeds, partial outages, browser retries, personalization, playback, persistence, playlist management, malformed/blocked storage, mobile menus and automated accessibility checks.

Tests never depend on public providers. `playwright.config.ts` points the routes at local YouTube and Apple test doubles; browser provider requests are intercepted. Existing library/playback tests use an explicit offline discovery fixture, while dynamic-screen tests supply changing provider responses. Silent WAV fixtures exercise real browser audio; no recordings are downloaded or bundled.

Stop any development server and run `TEST_PRODUCTION=1 npm test` to also verify production PWA/offline behavior. The test runner builds and starts production in that mode; otherwise it uses the development server. To use an existing Chromium installation, set `CHROMIUM_EXECUTABLE_PATH`.

The authored service worker caches the app shell, fonts and local artwork in production, never API responses or recordings. Registration is disabled in development. The dev server accepts Arena's `*.e2b.app` preview origins.

## Artwork and fonts

Artwork credits and generated-image details are in [ASSETS.md](ASSETS.md). Fonts are self-hosted through Fontsource, including a Devanagari fallback for Marathi titles.
