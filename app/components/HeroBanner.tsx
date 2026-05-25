"use client";

import {
  FaPlay,
} from "react-icons/fa";

import { usePlayer }
from "../context/PlayerContext";

type Props = {
  song: any;
};

export default function HeroBanner({
  song,
}: Props) {

  const {
    setCurrentSong,
    setIsPlaying,
  } = usePlayer();

  if (!song) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500 via-emerald-600 to-black p-6 md:p-10 mb-12 mt-10">

      {/* BACKGROUND GLOW */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-green-400/20 blur-3xl rounded-full"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">

        {/* LEFT */}
        <div className="max-w-2xl">

          <p className="uppercase tracking-[4px] text-sm font-semibold text-white/80 mb-4">
            Trending Now
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-3xl font-black leading-tight text-white">

            {song.title}
          </h1>

          <p className="text-white/80 mt-6 text-sm sm:text-base max-w-xl leading-relaxed">

            Listen to trending Hindi &
            Marathi music from{" "}
            {song.channelTitle}
          </p>

          {/* BUTTONS */}
          <div className="flex flex-wrap items-center gap-4 mt-8">

            <button
              onClick={() => {
                setCurrentSong(song);
                setIsPlaying(true);
              }}
              className="bg-black hover:bg-[#121212] transition px-6 py-3 rounded-full font-semibold flex items-center gap-3"
            >

              <FaPlay />

              Play Now
            </button>

            <button className="bg-white/20 hover:bg-white/30 transition backdrop-blur-lg px-6 py-3 rounded-full font-semibold">

              Explore
            </button>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="relative">

          <img
            src={
              song.thumbnail
                ?.thumbnails?.[0]?.url
            }
            alt={song.title}
            className="w-full max-w-[320px] md:max-w-[420px] rounded-3xl object-cover shadow-2xl"
          />

          {/* FLOATING CARD */}
          <div className="absolute -bottom-5 -left-5 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-xl">

            <p className="text-xs text-gray-400">
              Now Trending
            </p>

            <h3 className="font-semibold line-clamp-1 max-w-[180px]">
              {song.title}
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
}