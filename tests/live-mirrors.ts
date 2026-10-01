import type { Page } from "@playwright/test";
import { PROVIDER_HOSTS } from "../app/lib/youtube";

/**
 * Live search talks to public YouTube mirrors. Browser tests never rely on
 * those third parties (or the Apple preview fallback): they are blocked by default so a test result is the
 * same on a laptop, in CI and in a sandbox without internet access.
 */
export const mirrorPattern = (url: URL) =>
  PROVIDER_HOSTS.includes(url.hostname);

export async function blockLiveMirrors(page: Page) {
  await page.route(mirrorPattern, (route) => route.abort("failed"));
  await page.route("https://itunes.apple.com/search**", (route) =>
    route.abort("failed"),
  );
}

/** A trimmed, real Invidious search response for "kesariya song". */
export const invidiousResults = [
  {
    type: "video",
    title:
      "Kesariya - Brahmāstra | Ranbir Kapoor, Alia Bhatt | Pritam | Arijit Singh | 4K",
    videoId: "BddP6PYo2gs",
    author: "Sony Music India",
    authorVerified: true,
    lengthSeconds: 173,
    viewCount: 620737318,
  },
  {
    type: "video",
    title: "Kesariya (Lyrics) Full Song - Brahmastra | Arijit Singh",
    videoId: "W1S9AbHpWFY",
    author: "7clouds",
    lengthSeconds: 266,
    viewCount: 27466567,
  },
  {
    type: "video",
    title: "Kesariya song NEWS report tonight",
    videoId: "NEWS1234567",
    author: "News Today",
    lengthSeconds: 120,
    viewCount: 5000,
  },
];
