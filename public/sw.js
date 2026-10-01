// Authored service worker: cache the listening space, never external recordings
// or API responses. Navigation is network-first so deployments stay current.
const SHELL_CACHE = "sms-shell-v1";
const ASSET_CACHE = "sms-assets-v1";
const MAX_ASSETS = 180;
const FALLBACK_ART = "/images/playlist-night.webp";

function isAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/images/") ||
      [
        "/icon.svg",
        "/icon-192.png",
        "/icon-512.png",
        "/favicon.ico",
        "/manifest.json",
      ].includes(url.pathname))
  );
}

async function storeAsset(request, response) {
  if (!response.ok) return;
  try {
    const copy = response.clone();
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, copy);
    const keys = await cache.keys();
    if (keys.length > MAX_ASSETS) await cache.delete(keys[0]);
  } catch {
    // Storage quotas and private browsing must not interrupt network requests.
  }
}

async function precache() {
  const response = await fetch("/", { cache: "reload" });
  if (!response.ok) throw new Error("The app shell is not available yet");
  const shell = await caches.open(SHELL_CACHE);
  await shell.put("/", response.clone());
  const html = await response.text();
  const assets = new Set([
    FALLBACK_ART,
    "/manifest.json",
    "/icon.svg",
    "/icon-192.png",
    "/icon-512.png",
  ]);
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1], self.location.origin);
    if (isAsset(url)) assets.add(url.href);
  }
  await Promise.all(
    [...assets].map(async (asset) => {
      const result = await fetch(asset, { cache: "reload" });
      if (
        !result.ok &&
        new URL(asset, self.location.origin).pathname.startsWith(
          "/_next/static/",
        )
      ) {
        throw new Error("A required app asset is not available yet");
      }
      await storeAsset(asset, result);
      if (result.headers.get("content-type")?.includes("text/css")) {
        const css = await result.text();
        const fonts = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)]
          .map(
            (match) => new URL(match[1], new URL(asset, self.location.origin)),
          )
          .filter((url) => isAsset(url) && /\.woff2?$/.test(url.pathname));
        await Promise.all(
          fonts.map(async (url) => {
            const font = await fetch(url, { cache: "reload" });
            await storeAsset(url.href, font);
          }),
        );
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("sms-") &&
              key !== SHELL_CACHE &&
              key !== ASSET_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range") ||
    url.pathname.startsWith("/api/")
  )
    return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && url.pathname === "/") {
            const copy = response.clone();
            event.waitUntil(
              caches
                .open(SHELL_CACHE)
                .then((cache) => cache.put("/", copy))
                .catch(() => {}),
            );
          }
          return response;
        } catch {
          return (
            (await caches
              .open(SHELL_CACHE)
              .then((cache) => cache.match("/"))) ??
            new Response("Reconnect to open SMS Music.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          event.waitUntil(storeAsset(request, response));
          return response;
        } catch {
          if (request.destination === "image")
            return (await cache.match(FALLBACK_ART)) ?? Response.error();
          return Response.error();
        }
      })(),
    );
  }
});
