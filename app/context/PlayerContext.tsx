"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

const PlayerContext =
  createContext<any>(null);

export const PlayerProvider = ({
  children,
}: any) => {

  // CURRENT SONG
  const [
    currentSong,
    setCurrentSong,
  ] = useState<any>(null);

  // PLAY STATE
  const [
    isPlaying,
    setIsPlaying,
  ] = useState(false);

  // SONG LIST
  const [songs, setSongs] =
    useState<any[]>([]);

  // FAVORITES
  const [
    favorites,
    setFavorites,
  ] = useState<any[]>([]);

  // LOAD FAVORITES
  useEffect(() => {

    const savedFavorites =
      localStorage.getItem(
        "favorites"
      );

    if (savedFavorites) {

      setFavorites(
        JSON.parse(savedFavorites)
      );
    }

  }, []);

  // NEXT SONG
 const playNextSong =
  async () => {

    if (
      !currentSong ||
      songs.length === 0
    ) return;

    const currentIndex =
      songs.findIndex(
        (song) =>
          song.id ===
          currentSong.id
      );

    const nextSong =
      songs[currentIndex + 1];

    // PLAY NEXT SONG
    if (nextSong) {

      setCurrentSong(
        nextSong
      );

      setIsPlaying(true);

      // PRELOAD MORE SONGS
      // WHEN ONLY 2 SONGS LEFT

      const songsLeft =
  songs.length -
  (currentIndex + 1);

      if (songsLeft <= 2) {

        try {

          const query =
            currentSong.channelTitle ||
            currentSong.title;

          const response =
            await fetch(
              `/api/search?q=${encodeURIComponent(
                query
              )}`
            );

          const data =
            await response.json();

          if (
            data &&
            data.length > 0
          ) {

            // REMOVE DUPLICATES
            const uniqueSongs =
              data.filter(
                (newSong: any) =>

                  !songs.some(
                    (
                      existingSong
                    ) =>

                      existingSong.id ===
                      newSong.id
                  )
              );

            if (
              uniqueSongs.length > 0
            ) {

              setSongs((prevSongs: any[]) => [

  ...prevSongs,

  ...uniqueSongs.filter(
    (newSong: any) =>

      !prevSongs.some(
        (existingSong) =>

          existingSong.id ===
          newSong.id
      )
  ),
]);
            }
          }

        } catch (error) {

          console.log(
            "Queue preload error:",
            error
          );
        }
      }

      return;
    }

    // FALLBACK
    setIsPlaying(false);
  };

  // PREVIOUS SONG
  const playPrevSong = () => {

    if (
      !currentSong ||
      songs.length === 0
    ) {
      return;
    }

    const currentIndex =
      songs.findIndex(
        (song) =>
          song.id ===
          currentSong.id
      );

    const prevSong =
      songs[currentIndex - 1];

    if (prevSong) {

      setCurrentSong(
        prevSong
      );

      setIsPlaying(true);
    }
  };

  // TOGGLE FAVORITE
  const toggleFavorite = (
    song: any
  ) => {

    const exists =
      favorites.find(
        (fav) =>
          fav.id === song.id
      );

    let updatedFavorites;

    if (exists) {

      updatedFavorites =
        favorites.filter(
          (fav) =>
            fav.id !== song.id
        );

    } else {

      updatedFavorites = [
        ...favorites,
        song,
      ];
    }

    setFavorites(
      updatedFavorites
    );

    localStorage.setItem(
      "favorites",
      JSON.stringify(
        updatedFavorites
      )
    );
  };

  return (
    <PlayerContext.Provider
      value={{

        // SONG
        currentSong,
        setCurrentSong,

        // PLAY STATE
        isPlaying,
        setIsPlaying,

        // SONG LIST
        songs,
        setSongs,

        // PLAYER CONTROLS
        playNextSong,
        playPrevSong,

        // FAVORITES
        favorites,
        toggleFavorite,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () =>
  useContext(PlayerContext);