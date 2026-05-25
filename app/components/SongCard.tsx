"use client";

import {
  FaPlay,
  FaHeart,
} from "react-icons/fa";

import { usePlayer }
from "../context/PlayerContext";

type SongProps = {
  song: any;
};

export default function SongCard({
  song,
}: SongProps) {

  const {
    favorites,
    toggleFavorite,
  } = usePlayer();

  const isFavorite =
    favorites.some(
      (fav: any) =>
        fav.id === song.id
    );

  return (
    <div className="bg-[#181818] p-3 md:p-4 rounded-xl hover:bg-[#282828] transition duration-300 group">

      {/* IMAGE */}
      <div className="relative overflow-hidden rounded-lg">

        <img
          src={
            song.thumbnail
              ?.thumbnails?.[0]?.url
          }
          alt={song.title}
          className="w-full h-40 sm:h-44 md:h-52 object-cover rounded-lg group-hover:scale-105 transition duration-300"
        />

        {/* HEART BUTTON */}
        <button
          onClick={(e) => {
            e.stopPropagation();

            toggleFavorite(song);
          }}
          className="absolute top-3 right-3 z-20"
        >
          <FaHeart
            className={`text-lg md:text-xl transition ${
              isFavorite
                ? "text-red-500"
                : "text-white"
            }`}
          />
        </button>

        {/* PLAY BUTTON */}
        <button
          className="absolute bottom-3 right-3 bg-green-500 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition duration-300 shadow-lg"
        >
          <FaPlay className="text-black ml-1 text-sm" />
        </button>
      </div>

      {/* SONG INFO */}
      <div className="mt-3">

        <h2 className="text-white font-semibold text-sm md:text-base line-clamp-2">
          {song.title}
        </h2>

        <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">
          {song.channelTitle}
        </p>
      </div>
    </div>
  );
}