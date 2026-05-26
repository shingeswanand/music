"use client";

import {
  FaPlay,
  FaMusic,
} from "react-icons/fa";

type Props = {
  onAlbumClick: (
    query: string
  ) => void;
};

export default function Albums({
  onAlbumClick,
}: Props) {

  // CURATED PLAYLISTS
  const dynamicAlbums = [

    {
      id: 1,

      name: "Trending Hits",

      subtitle:
        "Top viral songs right now",

      query:
        "trending hindi songs",

      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
    },

    {
      id: 2,

      name: "Marathi Vibes",

      subtitle:
        "Feel-good Marathi music",

      query:
        "marathi romantic songs",

      image:
        "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
    },

    {
      id: 3,

      name: "Bollywood Love",

      subtitle:
        "Romantic Bollywood hits",

      query:
        "romantic bollywood songs",

      image:
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
    },

    {
      id: 4,

      name: "Workout Mix",

      subtitle:
        "High-energy gym tracks",

      query:
        "workout hindi songs",

      image:
        "https://images.unsplash.com/photo-1507838153414-b4b713384a76",
    },

    {
      id: 5,

      name: "Lofi Nights",

      subtitle:
        "Relaxing late-night vibes",

      query:
        "lofi hindi songs",

      image:
        "https://images.unsplash.com/photo-1499364615650-ec38552f4f34",
    },

    {
      id: 6,

      name: "Party Time",

      subtitle:
        "Dance & party bangers",

      query:
        "party bollywood songs",

      image:
        "https://images.unsplash.com/photo-1506157786151-b8491531f063",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-7">

      {dynamicAlbums.map(
        (album) => (

        <button
          key={album.id}

          onClick={() =>
            onAlbumClick(
              album.query
            )
          }

          className="group relative overflow-hidden rounded-3xl bg-[#181818] hover:bg-[#222222] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,255,128,0.15)] text-left"
        >

          {/* IMAGE */}
          <div className="relative h-[220px] sm:h-[240px] overflow-hidden">

            <img
              src={album.image}
              alt={album.name}
              className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
            />

            {/* OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>

            {/* PLAY BUTTON */}
            <div className="absolute bottom-4 right-4 bg-green-500 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-5 group-hover:translate-y-0 transition-all duration-300 shadow-2xl">

              <FaPlay className="text-black ml-1 text-sm md:text-base" />
            </div>

            {/* TOP BADGE */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 text-xs font-medium">

              <FaMusic className="text-green-400" />

              Playlist
            </div>
          </div>

          {/* INFO */}
          <div className="p-5">

            <h2 className="text-xl md:text-2xl font-black line-clamp-1">

              {album.name}
            </h2>

            <p className="text-gray-400 text-sm mt-2 line-clamp-2">

              {album.subtitle}
            </p>

            {/* TAGS */}
            <div className="flex flex-wrap gap-2 mt-4">

              <span className="bg-white/10 hover:bg-white/20 transition px-3 py-1 rounded-full text-xs">

                Trending
              </span>

              <span className="bg-white/10 hover:bg-white/20 transition px-3 py-1 rounded-full text-xs">

                Music
              </span>
            </div>
          </div>

          {/* GLOW */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none">

            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-green-500/20 blur-3xl rounded-full"></div>
          </div>
        </button>

      ))}
    </div>
  );
}