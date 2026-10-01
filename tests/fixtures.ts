import type { Page } from "@playwright/test";
import { fallbackDiscovery, isDiscoveryCategory } from "../app/lib/discovery";

// A silent PCM fixture exercises real browser audio, without relying on the
// availability of a third-party preview or downloading copyrighted recordings.
export function silentWav(seconds = 60) {
  const sampleRate = 8000;
  const dataSize = sampleRate * seconds * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

export async function mockAudio(page: Page) {
  const audio = silentWav();
  await page.route("https://audio-ssl.itunes.apple.com/**", (route) => {
    const range = route
      .request()
      .headers()
      .range?.match(/bytes=(\d+)-(\d*)/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2]
      ? Math.min(Number(range[2]), audio.length - 1)
      : audio.length - 1;
    const body = audio.subarray(start, end + 1);
    return route.fulfill({
      status: range ? 206 : 200,
      contentType: "audio/wav",
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(body.length),
        ...(range
          ? { "Content-Range": `bytes ${start}-${end}/${audio.length}` }
          : {}),
      },
      body,
    });
  });
}

/** Existing library/playback tests stay independent of discovery providers. */
export async function mockOfflineDiscovery(page: Page) {
  await page.route("**/api/discover**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const raw = params.get("category");
    const category = isDiscoveryCategory(raw) ? raw : "For you";
    return route.fulfill({
      json: fallbackDiscovery(category, params.get("mix") ?? undefined, false),
    });
  });
}
