# SMS Music

A warm, responsive music discovery app built with Next.js 16 and React 19. Explore Hindi and Marathi favorites, listen to official previews, and build a personal listening library.

## Run locally

```bash
npm ci
npm run dev -- --hostname 0.0.0.0
```

Open http://localhost:3000. **No API keys or separate backend are needed.** The included `server/` folder is the legacy YouTube search service; the redesigned app uses its own same-origin `/api/search` route instead.

## What works

- Curated discovery, Hindi/Marathi and mood filters, artist search, and listening stations
- Instant catalogue search, with broader searches served by Apple's public search API
- Native audio playback with progress, seeking, next/previous, shuffle, repeat, volume, and mute
- Persistent liked songs, the last 30 listening selections, volume, and personal playlists
- Create playlists, add/remove tracks through their action menus, and delete with confirmation
- Editable playback queue and an expanded now-playing view
- Mobile navigation, focus-trapped native dialogs, reduced-motion support, and keyboard shortcuts
- Media Session controls and installable PWA with real application icons and an offline listening-space shell

### Playback and search

Catalogue entries use **official Apple Music preview URLs**, not full recordings. The player shows a Preview badge, reads the actual clip duration, and links to the full track at its provider. Preview availability, length, and streaming depend on the provider. Old YouTube favorites are migrated and can still play through the existing YouTube player.

The curated catalogue is available without an external search connection. If a broader search cannot reach Apple, the app explains that live search is unavailable rather than substituting unrelated trending results. Audio itself still requires a connection to its provider.

Your library is stored only in this browser's local storage. It is not an account or cloud-synced library. Corrupt or unavailable storage is handled safely; blocked writes fall back to session memory.

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

Browser tests cover discovery, search and outage states, language filters, playback, queues, persistence, playlist management, malformed/blocked storage, mobile layouts, keyboard/dialog behavior, and automated accessibility checks. Stop any development server and run `TEST_PRODUCTION=1 npm test` to also verify the production PWA and offline catalogue search. The test runner will build and start a production server if one is not already running. Tests use a generated silent WAV fixture for deterministic audio assertions; no recordings are downloaded or bundled.

To use an existing Chromium installation, set `CHROMIUM_EXECUTABLE_PATH`. The lightweight authored service worker caches the app shell, fonts, and artwork in production. It never caches search API responses or external recordings. Service-worker registration is disabled in development. The dev server allows Arena's `*.e2b.app` preview origins.

## Artwork and fonts

Artwork credits and generated-image details are in [ASSETS.md](ASSETS.md). Fonts are self-hosted through Fontsource, including a Devanagari fallback for Marathi titles.
