"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiList,
  FiMoreHorizontal,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { usePlayer } from "../context/PlayerContext";
import type { Song } from "../lib/types";

type Props = { song: Song; playlistId?: string };

/** The same real actions are available on cards, liked songs, history and mixes. */
export default function TrackActions({ song, playlistId }: Props) {
  const {
    playlists,
    addToQueue,
    addToPlaylist,
    removeFromPlaylist,
    createPlaylist,
    movePlaylistSong,
  } = usePlayer();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const playlist = playlists.find((item) => item.id === playlistId);
  const index = playlist?.songs.findIndex((item) => item.id === song.id) ?? -1;
  const action = (callback: () => void) => {
    callback();
    setOpen(false);
    triggerRef.current?.focus();
  };
  const placeMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const playerHeight =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--player-height",
        ),
      ) || 90;
    const below = window.innerHeight - playerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const down = below >= 280 || below >= above;
    setPosition({
      position: "fixed",
      right: "auto",
      zIndex: 95,
      width: 220,
      left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)),
      top: down ? Math.max(8, rect.bottom + 5) : "auto",
      bottom: down
        ? "auto"
        : Math.max(playerHeight + 8, window.innerHeight - rect.top + 5),
      maxHeight: Math.max(80, Math.min(360, down ? below : above)),
    });
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const scroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) placeMenu();
    };
    const resize = () => placeMenu();
    window.addEventListener("resize", resize);
    document.addEventListener("scroll", scroll, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("scroll", scroll, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
    };
  }, [open, placeMenu]);
  const toggleMenu = () => {
    if (!open) placeMenu();
    setOpen((previous) => !previous);
  };

  return (
    <div className="song-menu-wrap" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="song-more"
        onClick={toggleMenu}
        aria-label={`More actions for ${song.title}`}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <FiMoreHorizontal />
      </button>
      {open && (
        <div
          id={menuId}
          className="song-dropdown"
          style={position}
          role="group"
          aria-label={`Actions for ${song.title}`}
        >
          <button type="button" onClick={() => action(() => addToQueue(song))}>
            <FiList />
            Add to queue
          </button>
          <button
            type="button"
            onClick={() =>
              action(() => createPlaylist(`${song.title} mix`, [song]))
            }
          >
            <FiPlus />
            Create playlist with this song
          </button>
          {playlists.length > 0 && <p>Add to playlist</p>}
          {playlists.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => action(() => addToPlaylist(item.id, song))}
            >
              <FiPlus />
              <span>{item.name}</span>
            </button>
          ))}
          {playlist && (
            <>
              <p>Playlist order</p>
              <button
                type="button"
                disabled={index <= 0}
                aria-label={`Move ${song.title} earlier`}
                onClick={() =>
                  action(() => movePlaylistSong(playlist.id, song.id, -1))
                }
              >
                <FiArrowUp />
                Move earlier
              </button>
              <button
                type="button"
                disabled={index < 0 || index === playlist.songs.length - 1}
                aria-label={`Move ${song.title} later`}
                onClick={() =>
                  action(() => movePlaylistSong(playlist.id, song.id, 1))
                }
              >
                <FiArrowDown />
                Move later
              </button>
              <button
                type="button"
                onClick={() =>
                  action(() => removeFromPlaylist(playlist.id, song.id))
                }
              >
                <FiTrash2 />
                Remove from playlist
              </button>
            </>
          )}
          {song.externalUrl && (
            <a
              href={song.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <FiArrowUpRight />
              <span>
                {song.previewUrl
                  ? "Listen to the full track"
                  : "Open on YouTube"}
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
