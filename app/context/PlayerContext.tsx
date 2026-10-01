"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { SONGS } from "../lib/catalogue";
import { uniqueSongs } from "../lib/discovery";
import { useStoredValue } from "../lib/storage";
import { isSong, type Playlist, type Song } from "../lib/types";

export type RepeatMode = "off" | "all" | "one";
type PlayerState = {
  currentSong: Song | null;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  songs: Song[];
  setSongs: Dispatch<SetStateAction<Song[]>>;
  initializeQueue: (songs: Song[]) => void;
  getPlaybackIntent: () => number;
  favorites: Song[];
  recentSongs: Song[];
  playlists: Playlist[];
  shuffle: boolean;
  setShuffle: Dispatch<SetStateAction<boolean>>;
  repeat: RepeatMode;
  setRepeat: Dispatch<SetStateAction<RepeatMode>>;
  cycleRepeat: () => void;
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  playNextSong: () => void;
  playPrevSong: () => void;
  toggleFavorite: (song: Song) => void;
  addToQueue: (song: Song) => void;
  createPlaylist: (name: string, songs?: Song[]) => string;
  renamePlaylist: (playlistId: string, name: string) => void;
  movePlaylistSong: (
    playlistId: string,
    songId: string,
    direction: -1 | 1,
  ) => void;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  notice: string | null;
  notify: (message: string) => void;
};

type PlayerSession = {
  currentSong: Song | null;
  songs: Song[];
  shuffle: boolean;
  repeat: RepeatMode;
  /** Feed refreshes must never replace a queue the listener has interacted with. */
  engaged: boolean;
};

const PlayerContext = createContext<PlayerState | null>(null);
const EMPTY_SONGS: Song[] = [];
const EMPTY_PLAYLISTS: Playlist[] = [];
const EMPTY_SESSION: PlayerSession = {
  currentSong: null,
  songs: [],
  shuffle: false,
  repeat: "off",
  engaged: false,
};

// Previously saved YouTube favorites and the old catalogue remain usable.
function restoreSongs(value: unknown): Song[] {
  if (!Array.isArray(value)) return [];
  return uniqueSongs(
    value.flatMap((item: unknown): Song[] => {
      if (isSong(item)) return [item];
      if (!item || typeof item !== "object") return [];
      const legacy = item as {
        id?: string;
        title?: string;
        channelTitle?: string;
        thumbnail?: { thumbnails?: { url?: string }[] };
      };
      if (
        typeof legacy.id !== "string" ||
        typeof legacy.title !== "string" ||
        !legacy.title.trim()
      )
        return [];
      const curated = SONGS.find((song) => song.id === legacy.id);
      if (curated) return [curated];
      if (!/^[a-zA-Z0-9_-]{11}$/.test(legacy.id)) return [];
      return [
        {
          id: legacy.id,
          title: legacy.title,
          artist:
            typeof legacy.channelTitle === "string"
              ? legacy.channelTitle
              : "Unknown artist",
          album: "YouTube",
          image: `https://i.ytimg.com/vi/${legacy.id}/mqdefault.jpg`,
          duration: 0,
          categories: ["YouTube"],
          youtubeId: legacy.id,
          externalUrl: `https://www.youtube.com/watch?v=${legacy.id}`,
        },
      ];
    }),
  );
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

function restoreSession(value: unknown): PlayerSession {
  if (!value || typeof value !== "object") return EMPTY_SESSION;
  const session = value as Partial<PlayerSession>;
  const queue = restoreSongs(session.songs).slice(0, 200);
  const currentSong = isSong(session.currentSong)
    ? session.currentSong
    : (queue[0] ?? null);
  return {
    currentSong,
    songs:
      currentSong && !queue.some((song) => song.id === currentSong.id)
        ? [currentSong, ...queue]
        : queue,
    shuffle: session.shuffle === true,
    repeat:
      session.repeat === "all" || session.repeat === "one"
        ? session.repeat
        : "off",
    engaged: session.engaged === true && currentSong !== null,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playbackIntent = useRef(0);
  const getPlaybackIntent = useCallback(() => playbackIntent.current, []);
  const [storedSession, setSession] = useStoredValue<unknown>(
    "sms-player-session",
    null,
    { syncTabs: false },
  );
  const session = useMemo(() => restoreSession(storedSession), [storedSession]);
  const { currentSong, songs, shuffle, repeat } = session;
  // Restoring a listening session never autoplays.
  const [isPlaying, setIsPlaying] = useState(false);
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

  const initializeQueue = useCallback(
    (tracks: Song[]) => {
      setSession((previous: unknown) => {
        const saved = restoreSession(previous);
        return saved.engaged
          ? saved
          : {
              ...saved,
              currentSong: tracks[0] ?? null,
              songs: uniqueSongs(tracks),
            };
      });
    },
    [setSession],
  );

  const setSongs = useCallback<Dispatch<SetStateAction<Song[]>>>(
    (next) => {
      playbackIntent.current++;
      setSession((previous: unknown) => {
        const saved = restoreSession(previous);
        const updated = typeof next === "function" ? next(saved.songs) : next;
        return {
          ...saved,
          songs: uniqueSongs(updated).slice(0, 200),
          engaged: true,
        };
      });
    },
    [setSession],
  );

  const setShuffle = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next) => {
      setSession((previous: unknown) => {
        const saved = restoreSession(previous);
        return {
          ...saved,
          shuffle: typeof next === "function" ? next(saved.shuffle) : next,
          engaged: true,
        };
      });
    },
    [setSession],
  );

  const setRepeat = useCallback<Dispatch<SetStateAction<RepeatMode>>>(
    (next) => {
      setSession((previous: unknown) => {
        const saved = restoreSession(previous);
        return {
          ...saved,
          repeat: typeof next === "function" ? next(saved.repeat) : next,
          engaged: true,
        };
      });
    },
    [setSession],
  );

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
      if (!isSong(song)) return;
      playbackIntent.current++;
      setSession((previous: unknown) => {
        const saved = restoreSession(previous);
        const tracks = queue?.length ? queue : saved.songs;
        return {
          ...saved,
          currentSong: song,
          engaged: true,
          songs: uniqueSongs(
            tracks.some((item) => item.id === song.id)
              ? tracks
              : [...tracks, song],
          ),
        };
      });
      setIsPlaying(true);
      rememberSong(song);
    },
    [setSession, rememberSong],
  );

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    playbackIntent.current++;
    if (!isPlaying) {
      rememberSong(currentSong);
      setSession((previous: unknown) => ({
        ...restoreSession(previous),
        engaged: true,
      }));
    }
    setIsPlaying((previous) => !previous);
  }, [isPlaying, currentSong, rememberSong, setSession]);

  const playNextSong = useCallback(() => {
    if (!songs.length || !currentSong) return;
    const index = songs.findIndex((song) => song.id === currentSong.id);
    if (shuffle && songs.length > 1) {
      const candidates = songs.filter((song) => song.id !== currentSong.id);
      playSong(candidates[Math.floor(Math.random() * candidates.length)]);
      return;
    }
    let nextIndex = index + 1;
    if (nextIndex >= songs.length) {
      if (repeat === "all") nextIndex = 0;
      else {
        setIsPlaying(false);
        return;
      }
    }
    playSong(songs[nextIndex]);
  }, [songs, currentSong, shuffle, repeat, playSong]);

  const playPrevSong = useCallback(() => {
    const index = songs.findIndex((song) => song.id === currentSong?.id);
    if (index > 0) playSong(songs[index - 1]);
    else if (repeat === "all" && songs.length)
      playSong(songs[songs.length - 1]);
  }, [songs, currentSong, repeat, playSong]);

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
      playbackIntent.current++;
      setSession((previous: unknown) => {
        const saved = restoreSession(previous);
        return {
          ...saved,
          currentSong: saved.currentSong ?? song,
          engaged: true,
          songs: uniqueSongs([...saved.songs, song]),
        };
      });
      notify(`“${song.title}” is in your queue`);
    },
    [setSession, notify],
  );

  const createPlaylist = useCallback(
    (name: string, tracks: Song[] = []) => {
      const id = `personal-${crypto.randomUUID()}`;
      setPlaylists((previous) => [
        ...restorePlaylists(previous),
        {
          id,
          name: name.trim().slice(0, 60) || "Untitled mix",
          songs: uniqueSongs(tracks),
        },
      ]);
      notify("Your playlist is ready. Make it yours.");
      return id;
    },
    [setPlaylists, notify],
  );

  const renamePlaylist = useCallback(
    (playlistId: string, name: string) => {
      if (!name.trim()) return;
      setPlaylists((previous) =>
        restorePlaylists(previous).map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, name: name.trim().slice(0, 60) }
            : playlist,
        ),
      );
      notify("Playlist renamed");
    },
    [setPlaylists, notify],
  );

  const movePlaylistSong = useCallback(
    (playlistId: string, songId: string, direction: -1 | 1) => {
      setPlaylists((previous) =>
        restorePlaylists(previous).map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          const index = playlist.songs.findIndex((song) => song.id === songId);
          const next = index + direction;
          if (index < 0 || next < 0 || next >= playlist.songs.length)
            return playlist;
          const tracks = [...playlist.songs];
          [tracks[index], tracks[next]] = [tracks[next], tracks[index]];
          return { ...playlist, songs: tracks };
        }),
      );
    },
    [setPlaylists],
  );

  const addToPlaylist = useCallback(
    (playlistId: string, song: Song) => {
      setPlaylists((previous) =>
        restorePlaylists(previous).map((playlist) =>
          playlist.id !== playlistId
            ? playlist
            : { ...playlist, songs: uniqueSongs([...playlist.songs, song]) },
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
        initializeQueue,
        getPlaybackIntent,
        favorites,
        recentSongs,
        playlists,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
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
        renamePlaylist,
        movePlaylistSong,
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
