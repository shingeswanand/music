"use client";

import type { Song } from "../lib/types";
import SongCard from "./SongCard";

type Props = { songs: Song[]; ranked?: boolean; playlistId?: string };

export default function TrendingSongs({
  songs,
  ranked = false,
  playlistId,
}: Props) {
  return (
    <div className="song-grid">
      {songs.map((song, index) => (
        <SongCard
          key={song.id}
          song={song}
          queue={songs}
          rank={ranked ? index + 1 : undefined}
          playlistId={playlistId}
        />
      ))}
    </div>
  );
}
