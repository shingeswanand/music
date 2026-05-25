import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: "Query missing",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://jiosaavn-api-rho.vercel.app/search/songs?query=${encodeURIComponent(
        query
      )}`
    );

    const data = await response.json();

    return NextResponse.json(data);

  } catch (error: any) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "API failed",
      },
      { status: 500 }
    );
  }
}