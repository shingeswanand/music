import { NextResponse } from "next/server";
import { findMusic } from "../../lib/server-music";
import {
  MIXES,
  discoveryQueries,
  fallbackDiscovery,
  isDiscoveryCategory,
  makeDiscovery,
  offlineSongs,
  tagSelection,
} from "../../lib/discovery";
import type { DiscoveryCategory } from "../../lib/types";

/** Uncached, same-origin discovery and station contents. No fixed song IDs. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category") ?? "For you";
  const mixId = params.get("mix") ?? undefined;
  if (!isDiscoveryCategory(category))
    return NextResponse.json(
      { message: "Choose a valid music category." },
      { status: 400 },
    );
  const mix = MIXES.find((item) => item.id === mixId);
  if (mixId && !mix)
    return NextResponse.json(
      { message: "That mix doesn’t exist." },
      { status: 404 },
    );
  const headers = { "Cache-Control": "no-store" };
  if (
    process.env.MUSIC_DISABLE_LIVE_DISCOVERY === "1" ||
    process.env.MUSIC_DISABLE_LIVE_SEARCH === "1"
  )
    return NextResponse.json(fallbackDiscovery(category, mixId, false), {
      headers,
    });

  if (request.signal.aborted)
    return new Response(null, { status: 499, headers });
  try {
    const queries = discoveryQueries(category, mixId);
    const hints: DiscoveryCategory[] =
      category === "For you" && !mix
        ? ["Hindi", "Marathi", "Indie"]
        : [mix?.category ?? category];
    const results = await Promise.all(
      queries.map(async (query, index) => {
        const selection = hints[index];
        const result = await findMusic(query, {
          signal: request.signal,
          offlineSongs: offlineSongs(selection, mixId),
        });
        return {
          ...result,
          songs: result.live
            ? tagSelection(result.songs, selection)
            : result.songs,
        };
      }),
    );
    return NextResponse.json(makeDiscovery(results, category, mixId), {
      headers,
    });
  } catch (error) {
    if (request.signal.aborted)
      return new Response(null, { status: 499, headers });
    throw error;
  }
}
