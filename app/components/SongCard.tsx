"use client";

import { FiHeart, FiPlay, FiPause } from "react-icons/fi";
import { usePlayer } from "../context/PlayerContext";
import type { Song } from "../lib/types";
import Artwork from "./Artwork";
import TrackActions from "./TrackActions";

type Props = { song: Song; queue: Song[]; rank?: number; playlistId?: string };

export default function SongCard({ song, queue, rank, playlistId }: Props) {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    favorites,
    toggleFavorite,
  } = usePlayer();
  const liked = favorites.some((favorite) => favorite.id === song.id);
  const active = currentSong?.id === song.id && isPlaying;
  const play = () => {
    if (active) togglePlay();
    else playSong(song, queue);
  };

  return (
    <article className={`song-card ${active ? "song-active" : ""}`}>
      <div className="song-art">
        <button
          type="button"
          className="song-art-button"
          onClick={play}
          aria-label={`${active ? "Pause" : "Play"} ${song.title}`}
        >
          <Artwork src={song.image} alt={`${song.album} cover`} />
          <span className="song-art-gradient" />
          <span className="song-play">{active ? <FiPause /> : <FiPlay />}</span>
        </button>
        {rank !== undefined && (
          <span className="song-rank">{rank.toString().padStart(2, "0")}</span>
        )}
        <button
          type="button"
          className={`song-like ${liked ? "liked" : ""}`}
          aria-label={`${liked ? "Unlike" : "Like"} ${song.title}`}
          aria-pressed={liked}
          onClick={() => toggleFavorite(song)}
        >
          <FiHeart />
        </button>
        {active && (
          <span className="playing-bars" aria-label="Playing">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
      <div className="song-card-info">
        <button
          type="button"
          className="song-title"
          onClick={play}
          title={song.title}
        >
          {song.title}
        </button>
        <p title={song.artist}>{song.artist}</p>
        <div className="song-card-meta">
          <span>{song.categories[0] || "MUSIC"}</span>
          <TrackActions song={song} playlistId={playlistId} />
        </div>
      </div>
    </article>
  );
}
