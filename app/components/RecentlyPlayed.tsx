"use client";

import SongCard
from "./SongCard";

import {
  usePlayer,
} from "../context/PlayerContext";

type Props = {
  songs: any[];
};

export default function RecentlyPlayed({
  songs,
}: Props) {

  const {
    setSongs,
    setCurrentSong,
    setIsPlaying,
  } = usePlayer();

  // PLAY SONG
  const handlePlaySong = (
    song: any
  ) => {

    // SET CURRENT QUEUE
    setSongs(songs);

    // PLAY CLICKED SONG
    setCurrentSong(song);

    setIsPlaying(true);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

      {songs
        .slice(0, 4)
        .map((song) => (

        <div
          key={song.id}

          onClick={() =>
            handlePlaySong(song)
          }

          className="cursor-pointer hover:scale-[1.02] transition-transform duration-300"
        >
          <SongCard
            song={song}
          />
        </div>

      ))}
    </div>
  );
}