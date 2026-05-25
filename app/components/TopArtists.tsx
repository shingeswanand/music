"use client";

import useEmblaCarousel
from "embla-carousel-react";

import {
  FaCheckCircle,
  FaPlay,
} from "react-icons/fa";

import CarouselButtons
from "./CarouselButtons";

type Props = {
  songs: any[];

  onArtistClick: (
    artist: string
  ) => void;
};

export default function TopArtists({
  songs,
  onArtistClick,
}: Props) {

  const [emblaRef, emblaApi] =
    useEmblaCarousel({
      dragFree: false,
      align: "start",
      containScroll: "trimSnaps",
    });

  const scrollPrev = () =>
    emblaApi?.scrollPrev();

  const scrollNext = () =>
    emblaApi?.scrollNext();

  // DYNAMIC ARTISTS
  const artists =
    songs
      .map((song) => ({
        name:
          song.channelTitle ||
          "Unknown Artist",

        image:
          song.thumbnail
            ?.thumbnails?.[0]?.url,

        song:
          song.title,
      }))

      .filter(
        (artist, index, self) =>

          index ===
          self.findIndex(
            (a) =>
              a.name === artist.name
          )
      )

      .slice(0, 12);

  return (
    <section className="mb-16">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">

        <div>

          <h2 className="text-3xl md:text-4xl font-black">

            Top Artists
          </h2>

          <p className="text-gray-400 mt-2 text-sm">

            Trending Marathi &
            Hindi creators
          </p>
        </div>

        <CarouselButtons
          scrollPrev={scrollPrev}
          scrollNext={scrollNext}
        />
      </div>

      {/* CAROUSEL */}
      <div
        className="overflow-hidden"
        ref={emblaRef}
      >

        <div className="flex gap-6">

          {artists.map((artist) => (

            <button
              key={artist.name}

              onClick={() =>
                onArtistClick(
                  artist.name
                )
              }

              className="flex-[0_0_auto] w-[220px] text-left group"
            >

              <div className="relative overflow-hidden rounded-3xl bg-[#181818] hover:bg-[#222222] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,255,128,0.15)]">

                {/* IMAGE */}
                <div className="relative h-[260px] overflow-hidden">

                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                  />

                  {/* GRADIENT */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  {/* VERIFIED */}
                  <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-2 shadow-lg">

                    <FaCheckCircle className="text-white text-sm" />
                  </div>

                  {/* PLAY BUTTON */}
                  <div className="absolute bottom-4 right-4 bg-green-500 w-14 h-14 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-5 group-hover:translate-y-0 transition-all duration-300 shadow-2xl">

                    <FaPlay className="text-black ml-1" />
                  </div>
                </div>

                {/* INFO */}
                <div className="p-5">

                  <h3 className="font-bold text-xl line-clamp-1">

                    {artist.name}
                  </h3>

                  <p className="text-green-400 text-sm mt-2">

                    Verified Artist
                  </p>

                  <p className="text-gray-400 text-xs mt-3 line-clamp-1">

                    Trending: {artist.song}
                  </p>

                  {/* STATS */}
                  <div className="flex items-center justify-between mt-5">

                    <span className="text-xs text-gray-500">

                      2.5M Monthly
                    </span>

                    <span className="text-xs bg-white/10 px-3 py-1 rounded-full">

                      Trending
                    </span>
                  </div>
                </div>

                {/* GLOW */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none">

                  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-green-500/20 blur-3xl rounded-full"></div>
                </div>
              </div>
            </button>

          ))}
        </div>
      </div>
    </section>
  );
}