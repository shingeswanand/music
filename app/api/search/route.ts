import { NextResponse } from "next/server";
import { searchCatalogue } from "../../lib/catalogue";
import { findMusic } from "../../lib/server-music";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("query") ?? params.get("q") ?? "").trim();
  if (!query || query.length > 200)
    return NextResponse.json(
      { message: "Enter a search between 1 and 200 characters." },
      { status: 400 },
    );
  const headers = { "Cache-Control": "no-store" };
  if (request.signal.aborted)
    return new Response(null, { status: 499, headers });
  try {
    const result = await findMusic(query, {
      signal: request.signal,
      offlineSongs: searchCatalogue(query),
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    // Navigating away / Strict Mode can cancel a request while providers are
    // pending. This is not a server failure or an unhandled route rejection.
    if (request.signal.aborted)
      return new Response(null, { status: 499, headers });
    throw error;
  }
}
