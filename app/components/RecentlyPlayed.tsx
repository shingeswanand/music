"use client";

import { FiPlay, FiPause, FiHeart } from "react-icons/fi";
import { usePlayer } from "../context/PlayerContext";
import { formatTime, type Song } from "../lib/types";
import Artwork from "./Artwork";

type Props = { songs: Song[] };

export default function RecentlyPlayed({ songs }: Props) {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    favorites,
    toggleFavorite,
  } = usePlayer();
  return (
    <div className="track-list">
      <div className="track-list-header">
        <span>#</span>
        <span>Title</span>
        <span className="track-album">Album</span>
        <span /> <span>Time</span>
      </div>
      {songs.map((song, index) => {
        const active = currentSong.id === song.id && isPlaying;
        const liked = favorites.some((item) => item.id === song.id);
        return (
          <div
            className={`track-row ${active ? "track-row-active" : ""}`}
            key={song.id}
          >
            <button
              type="button"
              className="track-number"
              aria-label={`${active ? "Pause" : "Play"} ${song.title}`}
              onClick={() => (active ? togglePlay() : playSong(song, songs))}
            >
              <span>{index + 1}</span>
              {active ? <FiPause /> : <FiPlay />}
            </button>
            <button
              type="button"
              className="track-name"
              onClick={() => (active ? togglePlay() : playSong(song, songs))}
            >
              <Artwork src={song.image} alt="" />
              <span>
                <strong>{song.title}</strong>
                <span>{song.artist}</span>
              </span>
            </button>
            <span className="track-album">{song.album}</span>
            <button
              type="button"
              className={`icon-button ${liked ? "liked" : ""}`}
              aria-label={`${liked ? "Unlike" : "Like"} ${song.title}`}
              aria-pressed={liked}
              onClick={() => toggleFavorite(song)}
            >
              <FiHeart />
            </button>
            <span className="track-duration">{formatTime(song.duration)}</span>
          </div>
        );
      })}
    </div>
  );
}
