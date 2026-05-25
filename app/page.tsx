"use client";

import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import Player from "./components/Player";

import TrendingSongs from "./components/TrendingSongs";
import RecentlyPlayed from "./components/RecentlyPlayed";
import Albums from "./components/Albums";
import SectionTitle from "./components/SectionTitle";
import SkeletonCard from "./components/SkeletonCard";
import { usePlayer } from "./context/PlayerContext";
import HeroBanner from "./components/HeroBanner";
import TopArtists from "./components/TopArtists";

import { searchSongs } from "./lib/api";

export default function Home() {

  const [query, setQuery] =
    useState("");

  const [songs, setSongs] =
    useState<any[]>([]);

  const [loading, setLoading] =
  useState(true);

  const {
    setSongs: setGlobalSongs,
  } = usePlayer();

  const handleArtistClick =
  async (artist: string) => {

    const data =
      await searchSongs(artist);

    setSongs(data);

    setGlobalSongs(data);
  };

  useEffect(() => {
    loadTrending();
  }, []);

  // LOAD TRENDING SONGS
  const loadTrending = async () => {

  setLoading(true);

  const data =
    await searchSongs(
      "trending marathi songs"
    );

  setSongs(data);

  setGlobalSongs(data);

  setLoading(false);
};

  // SEARCH SONGS
  const handleSearch = async () => {

  if (!query.trim()) return;

  setLoading(true);

  const data =
    await searchSongs(query);

  setSongs(data);

  setGlobalSongs(data);

  setLoading(false);
};

  return (
    <main className="mt-10 bg-gradient-to-b from-[#181818] via-black to-black min-h-screen text-white overflow-hidden">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className=" min-h-screen pb-44">

        {/* TOP SECTION */}
        <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-20 md:pt-10">

          {/* HEADER */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-10">

            {/* LEFT */}
            <div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                Discover Music
              </h1>

              <p className="text-gray-400 mt-2 text-sm sm:text-base">
                Listen to Hindi & Marathi songs
              </p>
            </div>

            {/* SEARCH */}
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">

              <input
                type="text"
                placeholder="Search songs..."
                className="w-full sm:flex-1 xl:w-[380px] p-3 md:p-4 rounded-full bg-[#ffffff] text-black outline-none text-sm md:text-base"
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
              />

              <button
                onClick={handleSearch}
                className="bg-green-500 hover:bg-green-400 transition px-6 md:px-8 py-3 rounded-full font-semibold text-black text-sm md:text-base whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>

          <HeroBanner song={songs[0]} />

<TopArtists
  songs={songs}
  onArtistClick={
    handleArtistClick
  }
/>

          {/* TRENDING */}
          <div className="mb-12">

            <SectionTitle title="Trending Songs" />

            {loading ? (

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

    {[...Array(8)].map((_, index) => (
      <SkeletonCard key={index} />
    ))}

  </div>

) : (

  <TrendingSongs songs={songs} />

)}
          </div>

          {/* RECENT */}
          <div className="mb-12">

            <SectionTitle title="Recently Played" />

            <RecentlyPlayed songs={songs} />
          </div>

          {/* ALBUMS */}
          <div className="mb-10">

            <SectionTitle title="Popular Albums" />

            <Albums />
          </div>
        </div>
      </div>

      {/* PLAYER */}
      <Player />
    </main>
  );
}