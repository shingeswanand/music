"use client";

import {
  useEffect,
  useState,
} from "react";

import Sidebar
from "./components/Sidebar";

import TrendingSongs
from "./components/TrendingSongs";

import RecentlyPlayed
from "./components/RecentlyPlayed";

import Albums
from "./components/Albums";

import SectionTitle
from "./components/SectionTitle";

import SkeletonCard
from "./components/SkeletonCard";

import HeroBanner
from "./components/HeroBanner";

import TopArtists
from "./components/TopArtists";

import { usePlayer }
from "./context/PlayerContext";

import {
  searchSongs,
} from "./lib/api";

export default function Home() {

  const [query, setQuery] =
    useState("");

  // HOME DATA
  const [
    trendingSongs,
    setTrendingSongs,
  ] = useState<any[]>([]);

  // SEARCH DATA
  const [
    searchResults,
    setSearchResults,
  ] = useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const {
    setSongs: setGlobalSongs,
    setCurrentSong,
    setIsPlaying,
  } = usePlayer();

  // DISPLAY SONGS
  const displaySongs =
    searchResults.length > 0
      ? searchResults
      : trendingSongs;

  useEffect(() => {
    loadTrending();
  }, []);

  // FETCH SONGS
  const fetchSongs =
    async (
      searchQuery: string,
      isSearch = false
    ) => {

      try {

        setLoading(true);

        const data =
          await searchSongs(
            `${searchQuery} official songs`
          );

        if (isSearch) {

          setSearchResults(data);

        } else {

          setTrendingSongs(data);
        }

        setGlobalSongs(data);

        // AUTO PLAY FIRST SONG
        if (
          data &&
          data.length > 0
        ) {

          // setCurrentSong(
          //   data[0]
          // );

          // setIsPlaying(true);
        }

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);
      }
    };

    const trendingQueries = [

  "top bollywood songs",

  "marathi hits",

  "romantic hindi songs",

  "party bollywood songs",

  "lofi hindi songs",

  "trending indian music",

  "arijit singh hits",

  "kk hits",

  "90s bollywood songs",
];

  // LOAD TRENDING
  const loadTrending =
  async () => {

    const randomQuery =

      trendingQueries[
        Math.floor(
          Math.random() *
          trendingQueries.length
        )
      ];

    await fetchSongs(
      randomQuery,
      false
    );
  };

  // SEARCH
  const handleSearch =
    async () => {

      if (!query.trim())
        return;

      await fetchSongs(
        query,
        true
      );
    };

    const clearSearch = () => {

  setQuery("");

  setSearchResults([]);
};

  // ARTIST CLICK
  const handleArtistClick =
    async (
      artist: string
    ) => {

      await fetchSongs(
        artist,
        true
      );
    };

  // ALBUM CLICK
  const handleAlbumClick =
    async (
      album: string
    ) => {

      await fetchSongs(
        album,
        true
      );
    };

  return (
    <main className="mt-10 bg-gradient-to-b from-[#181818] via-black to-black min-h-screen text-white overflow-hidden">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN */}
      <div className="min-h-screen pb-44">

        {/* TOP */}
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
                className="w-full sm:flex-1 xl:w-[380px] p-3 md:p-4 rounded-full bg-white text-black outline-none text-sm md:text-base"
                value={query}
                onChange={(e) =>
                  setQuery(
                    e.target.value
                  )
                }

                onKeyDown={(e) => {

                  if (
                    e.key === "Enter"
                  ) {
                    handleSearch();
                  }
                }}
              />

              <button
                onClick={
                  handleSearch
                }
                className="bg-green-500 hover:bg-green-400 transition px-6 md:px-8 py-3 rounded-full font-semibold text-black text-sm md:text-base whitespace-nowrap"
              >
                Search
              </button>
              {
  searchResults.length > 0 && (

    <button
      onClick={clearSearch}
      className="bg-white/10 hover:bg-white/20 transition px-5 py-3 rounded-full text-sm"
    >
      Clear
    </button>
  )
}
            </div>
          </div>

          {/* HERO */}
          <HeroBanner
            song={
              displaySongs[0]
            }
          />

          {/* ARTISTS */}
          <TopArtists
            songs={
              displaySongs
            }
            onArtistClick={
              handleArtistClick
            }
          />

          {/* TRENDING */}
          <div className="mb-12">

            <SectionTitle
              title={
                searchResults.length >
                0
                  ? "Search Results"
                  : "Trending Songs"
              }
            />

            {loading ? (

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

                {[...Array(8)].map(
                  (_, index) => (

                  <SkeletonCard
                    key={index}
                  />
                ))}
              </div>

            ) : (

              <TrendingSongs
                songs={
                  displaySongs
                }
              />
            )}
          </div>

          {/* RECENT */}
          {!loading && (
            <div className="mb-12">

              <SectionTitle
                title="Recently Played"
              />

              <RecentlyPlayed
                songs={
                  trendingSongs
                }
              />
            </div>
          )}

          {/* ALBUMS */}
          {!loading && (
            <div className="mb-10">

              <SectionTitle
                title="Popular Albums"
              />

              <Albums
  onAlbumClick={
    handleAlbumClick
  }
/>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}