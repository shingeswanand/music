"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiArrowUpRight,
  FiHeart,
  FiMoreHorizontal,
  FiPlay,
  FiPause,
  FiPlus,
  FiList,
  FiTrash2,
} from "react-icons/fi";
import { usePlayer } from "../context/PlayerContext";
import type { Song } from "../lib/types";
import Artwork from "./Artwork";

type Props = { song: Song; queue: Song[]; rank?: number; playlistId?: string };

export default function SongCard({ song, queue, rank, playlistId }: Props) {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    favorites,
    toggleFavorite,
    playlists,
    addToQueue,
    addToPlaylist,
    removeFromPlaylist,
  } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const liked = favorites.some((favorite) => favorite.id === song.id);
  const active = currentSong.id === song.id && isPlaying;
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);
  const play = () => {
    if (active) togglePlay();
    else playSong(song, queue);
  };
  const action = (callback: () => void) => {
    callback();
    setMenuOpen(false);
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
          <div className="song-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="song-more"
              onClick={() => setMenuOpen((previous) => !previous)}
              aria-label={`More actions for ${song.title}`}
              aria-expanded={menuOpen}
            >
              <FiMoreHorizontal />
            </button>
            {menuOpen && (
              <div
                className="song-dropdown"
                role="group"
                aria-label={`Actions for ${song.title}`}
              >
                <button
                  type="button"
                  onClick={() => action(() => addToQueue(song))}
                >
                  <FiList />
                  Add to queue
                </button>
                {song.externalUrl && (
                  <a
                    href={song.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                  >
                    <FiArrowUpRight />
                    <span>
                      {song.previewUrl
                        ? "Listen to the full track"
                        : "Open on YouTube"}
                    </span>
                  </a>
                )}
                {playlists.length > 0 && <p>Add to playlist</p>}
                {playlists.map((playlist) => (
                  <button
                    type="button"
                    key={playlist.id}
                    onClick={() =>
                      action(() => addToPlaylist(playlist.id, song))
                    }
                  >
                    <FiPlus />
                    <span>{playlist.name}</span>
                  </button>
                ))}
                {playlistId && (
                  <button
                    type="button"
                    onClick={() =>
                      action(() => removeFromPlaylist(playlistId, song.id))
                    }
                  >
                    <FiTrash2 />
                    Remove from playlist
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
