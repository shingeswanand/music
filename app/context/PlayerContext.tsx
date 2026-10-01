"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { SONGS } from "../lib/catalogue";
import { useStoredValue } from "../lib/storage";
import { isSong, type Playlist, type Song } from "../lib/types";

type RepeatMode = "off" | "all" | "one";
type PlayerState = {
  currentSong: Song;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  songs: Song[];
  setSongs: Dispatch<SetStateAction<Song[]>>;
  favorites: Song[];
  recentSongs: Song[];
  playlists: Playlist[];
  shuffle: boolean;
  setShuffle: Dispatch<SetStateAction<boolean>>;
  repeat: RepeatMode;
  cycleRepeat: () => void;
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  playNextSong: () => void;
  playPrevSong: () => void;
  toggleFavorite: (song: Song) => void;
  addToQueue: (song: Song) => void;
  createPlaylist: (name: string) => string;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  notice: string | null;
  notify: (message: string) => void;
};

const PlayerContext = createContext<PlayerState | null>(null);
const EMPTY_SONGS: Song[] = [];
const EMPTY_PLAYLISTS: Playlist[] = [];

// Keep previously saved YouTube favorites usable after the redesign.
function restoreSongs(value: unknown): Song[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (isSong(item)) return [item];
    if (!item || typeof item !== "object") return [];
    const legacy = item as {
      id?: string;
      title?: string;
      channelTitle?: string;
      thumbnail?: { thumbnails?: { url?: string }[] };
    };
    if (typeof legacy.id !== "string" || typeof legacy.title !== "string")
      return [];
    if (
      !SONGS.some((song) => song.id === legacy.id) &&
      !/^[a-zA-Z0-9_-]{11}$/.test(legacy.id)
    )
      return [];
    const curated = SONGS.find((song) => song.id === legacy.id);
    return [
      curated ?? {
        id: legacy.id,
        title: legacy.title,
        artist:
          typeof legacy.channelTitle === "string"
            ? legacy.channelTitle
            : "Unknown artist",
        album: "YouTube",
        image:
          legacy.thumbnail?.thumbnails?.[0]?.url ??
          "/images/playlist-night.webp",
        duration: 0,
        categories: [],
        youtubeId: legacy.id,
        externalUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(legacy.id)}`,
      },
    ];
  });
}

function restorePlaylists(value: unknown): Playlist[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const playlist = item as Partial<Playlist>;
    if (typeof playlist.id !== "string" || typeof playlist.name !== "string")
      return [];
    return [
      {
        id: playlist.id,
        name: playlist.name,
        songs: restoreSongs(playlist.songs),
      },
    ];
  });
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>(SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songs, setSongs] = useState<Song[]>(SONGS);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [notice, setNotice] = useState<string | null>(null);
  const [storedFavorites, setFavorites] = useStoredValue(
    "favorites",
    EMPTY_SONGS,
  );
  const [storedRecent, setRecentSongs] = useStoredValue(
    "sms-recent",
    EMPTY_SONGS,
  );
  const [storedPlaylists, setPlaylists] = useStoredValue(
    "sms-playlists",
    EMPTY_PLAYLISTS,
  );
  const favorites = useMemo(
    () => restoreSongs(storedFavorites),
    [storedFavorites],
  );
  const recentSongs = useMemo(() => restoreSongs(storedRecent), [storedRecent]);
  const playlists = useMemo(
    () => restorePlaylists(storedPlaylists),
    [storedPlaylists],
  );

  const notify = useCallback((message: string) => setNotice(message), []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const rememberSong = useCallback(
    (song: Song) => {
      setRecentSongs((previous) =>
        [
          song,
          ...restoreSongs(previous).filter((item) => item.id !== song.id),
        ].slice(0, 30),
      );
    },
    [setRecentSongs],
  );

  const playSong = useCallback(
    (song: Song, queue?: Song[]) => {
      if (queue?.length) setSongs(queue);
      else
        setSongs((previous) =>
          previous.some((item) => item.id === song.id)
            ? previous
            : [...previous, song],
        );
      setCurrentSong(song);
      setIsPlaying(true);
      rememberSong(song);
    },
    [rememberSong],
  );

  const togglePlay = useCallback(() => {
    if (!isPlaying) rememberSong(currentSong);
    setIsPlaying((previous) => !previous);
  }, [isPlaying, currentSong, rememberSong]);

  const playNextSong = useCallback(() => {
    if (!songs.length) return;
    const index = songs.findIndex((song) => song.id === currentSong.id);
    let nextIndex = index + 1;
    if (shuffle && songs.length > 1) {
      const candidates = songs.filter((song) => song.id !== currentSong.id);
      playSong(candidates[Math.floor(Math.random() * candidates.length)]);
      return;
    }
    if (nextIndex >= songs.length) {
      if (repeat === "all") nextIndex = 0;
      else {
        setIsPlaying(false);
        return;
      }
    }
    playSong(songs[nextIndex]);
  }, [songs, currentSong.id, shuffle, repeat, playSong]);

  const playPrevSong = useCallback(() => {
    const index = songs.findIndex((song) => song.id === currentSong.id);
    if (index > 0) playSong(songs[index - 1]);
  }, [songs, currentSong.id, playSong]);

  const toggleFavorite = useCallback(
    (song: Song) => {
      setFavorites((previous) => {
        const saved = restoreSongs(previous);
        return saved.some((item) => item.id === song.id)
          ? saved.filter((item) => item.id !== song.id)
          : [...saved, song];
      });
    },
    [setFavorites],
  );

  const addToQueue = useCallback(
    (song: Song) => {
      setSongs((previous) => {
        if (previous.some((item) => item.id === song.id)) return previous;
        return [...previous, song];
      });
      notify(`“${song.title}” is in your queue`);
    },
    [notify],
  );

  const createPlaylist = useCallback(
    (name: string) => {
      const id = `personal-${crypto.randomUUID()}`;
      setPlaylists((previous) => [
        ...restorePlaylists(previous),
        { id, name: name.trim().slice(0, 60), songs: [] },
      ]);
      notify("Your playlist is ready. Make it yours.");
      return id;
    },
    [setPlaylists, notify],
  );

  const addToPlaylist = useCallback(
    (playlistId: string, song: Song) => {
      setPlaylists((previous) =>
        restorePlaylists(previous).map((playlist) =>
          playlist.id !== playlistId
            ? playlist
            : {
                ...playlist,
                songs: playlist.songs.some((item) => item.id === song.id)
                  ? playlist.songs
                  : [...playlist.songs, song],
              },
        ),
      );
      notify(`Added “${song.title}” to your playlist`);
    },
    [setPlaylists, notify],
  );

  const removeFromPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      setPlaylists((previous) =>
        restorePlaylists(previous).map((playlist) =>
          playlist.id !== playlistId
            ? playlist
            : {
                ...playlist,
                songs: playlist.songs.filter((song) => song.id !== songId),
              },
        ),
      );
    },
    [setPlaylists],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      setPlaylists((previous) =>
        restorePlaylists(previous).filter(
          (playlist) => playlist.id !== playlistId,
        ),
      );
      notify("Playlist deleted");
    },
    [setPlaylists, notify],
  );

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        setIsPlaying,
        songs,
        setSongs,
        favorites,
        recentSongs,
        playlists,
        shuffle,
        setShuffle,
        repeat,
        cycleRepeat: () =>
          setRepeat((previous) =>
            previous === "off" ? "all" : previous === "all" ? "one" : "off",
          ),
        playSong,
        togglePlay,
        playNextSong,
        playPrevSong,
        toggleFavorite,
        addToQueue,
        createPlaylist,
        addToPlaylist,
        removeFromPlaylist,
        deletePlaylist,
        notice,
        notify,
      }}
    >
      {children}
      <div
        className={`toast ${notice ? "toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
