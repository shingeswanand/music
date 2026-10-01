"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type ReactPlayerType from "react-player";
import {
  FiArrowUpRight,
  FiCheck,
  FiHeart,
  FiList,
  FiMaximize2,
  FiPause,
  FiPlay,
  FiRepeat,
  FiShuffle,
  FiSkipBack,
  FiSkipForward,
  FiVolume2,
  FiVolumeX,
  FiX,
} from "react-icons/fi";
import { usePlayer } from "../context/PlayerContext";
import { useStoredValue } from "../lib/storage";
import { formatTime, type Song } from "../lib/types";
import Artwork from "./Artwork";
import Dialog from "./Dialog";
import Visualizer from "./Visualizer";
import { Brand } from "./Sidebar";

const YouTubePlayer = dynamic(() => import("react-player"), { ssr: false });
type Playback = {
  id: string;
  seconds: number;
  duration: number;
  error?: string;
  waiting?: boolean;
  ready?: boolean;
};
const sliderStyle = (fraction: number): CSSProperties => ({
  background: `linear-gradient(to right, var(--accent) ${Math.min(100, Math.max(0, fraction * 100))}%, #3b3b35 0%)`,
});

export default function Player() {
  const { currentSong } = usePlayer();
  if (!currentSong)
    return (
      <section className="player-bar player-empty" aria-label="Music player">
        <div className="player-song">
          <FiList />
          <div className="player-song-text">
            <strong>Your soundtrack starts here</strong>
            <span>Choose a track to start listening.</span>
          </div>
        </div>
        <button
          type="button"
          className="main-play-button"
          aria-label="Play playback"
          disabled
        >
          <FiPlay />
        </button>
      </section>
    );
  return <ActivePlayer currentSong={currentSong} />;
}

function ActivePlayer({ currentSong }: { currentSong: Song }) {
  const {
    isPlaying,
    setIsPlaying,
    togglePlay,
    playSong,
    playNextSong,
    playPrevSong,
    songs,
    setSongs,
    favorites,
    toggleFavorite,
    shuffle,
    setShuffle,
    repeat,
    cycleRepeat,
  } = usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubeRef = useRef<ReactPlayerType | null>(null);
  const [playback, setPlayback] = useState<Playback>({
    id: currentSong.id,
    seconds: 0,
    duration: currentSong.previewUrl ? 30 : currentSong.duration,
  });
  const [storedVolume, setVolume] = useStoredValue("sms-volume", 0.7);
  const volume =
    typeof storedVolume === "number" && Number.isFinite(storedVolume)
      ? Math.max(0, Math.min(1, storedVolume))
      : 0.7;
  const previousVolume = useRef(0.7);
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const validPlayback = playback.id === currentSong.id;
  const seconds = validPlayback ? playback.seconds : 0;
  const duration = validPlayback
    ? playback.duration
    : currentSong.previewUrl
      ? 30
      : currentSong.duration;
  const error = validPlayback ? playback.error : undefined;
  const waiting = validPlayback && playback.waiting;
  const canSeek = validPlayback && playback.ready;
  const liked = favorites.some((song) => song.id === currentSong.id);
  const currentIndex = songs.findIndex((song) => song.id === currentSong.id);

  const updatePlayback = useCallback(
    (update: Partial<Playback>) => {
      setPlayback((previous) => ({
        ...(previous.id === currentSong.id
          ? previous
          : {
              id: currentSong.id,
              seconds: 0,
              duration: currentSong.previewUrl ? 30 : currentSong.duration,
            }),
        ...update,
      }));
    },
    [currentSong.id, currentSong.previewUrl, currentSong.duration],
  );

  const playbackError = useCallback(() => {
    updatePlayback({
      // A preview is a 30s provider clip; a YouTube result is the full video,
      // which can also fail when the uploader disabled embedding.
      error: currentSong.previewUrl
        ? "This preview isn’t available right now."
        : "This track can’t play here right now.",
      waiting: false,
    });
    setIsPlaying(false);
  }, [currentSong.previewUrl, updatePlayback, setIsPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong.previewUrl) return;
    if (!isPlaying) {
      audio.pause();
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    audio.play().catch((cause: unknown) => {
      if (
        audio !== audioRef.current ||
        (cause instanceof DOMException && cause.name === "AbortError")
      )
        return;
      if (cause instanceof DOMException && cause.name === "NotAllowedError") {
        updatePlayback({
          error: "Tap play to start listening.",
          waiting: false,
        });
        setIsPlaying(false);
      } else playbackError();
    });
  }, [
    currentSong.id,
    currentSong.previewUrl,
    isPlaying,
    playbackError,
    setIsPlaying,
    updatePlayback,
  ]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, currentSong.id]);

  const seek = useCallback(
    (position: number) => {
      const target = Math.max(
        0,
        Math.min(position, Math.max(0, duration - 0.05)),
      );
      if (currentSong.previewUrl) {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration)) return;
        audio.currentTime = target;
      } else {
        if (!youtubeRef.current) return;
        youtubeRef.current.seekTo(target, "seconds");
      }
      updatePlayback({ seconds: target });
    },
    [duration, currentSong.previewUrl, updatePlayback],
  );

  const previous = useCallback(() => {
    const elapsed = currentSong.previewUrl
      ? (audioRef.current?.currentTime ?? 0)
      : (youtubeRef.current?.getCurrentTime() ?? 0);
    if (elapsed > 3 || (currentIndex <= 0 && repeat !== "all")) seek(0);
    else playPrevSong();
  }, [currentSong.previewUrl, currentIndex, repeat, playPrevSong, seek]);

  const mute = useCallback(() => {
    if (volume > 0) {
      previousVolume.current = volume;
      setVolume(0);
    } else setVolume(previousVolume.current || 0.7);
  }, [volume, setVolume]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, button, a, [contenteditable=true]",
        )
      )
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      }
      if (event.key.toLowerCase() === "m") mute();
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const position = currentSong.previewUrl
          ? (audioRef.current?.currentTime ?? 0)
          : (youtubeRef.current?.getCurrentTime() ?? 0);
        seek(position + (event.key === "ArrowRight" ? 5 : -5));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay, mute, seek, currentSong.previewUrl]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined")
      return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album,
      artwork: [
        {
          src: new URL(currentSong.image, window.location.origin).href,
          sizes: "500x500",
        },
      ],
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => playSong(currentSong)],
      ["pause", () => setIsPlaying(false)],
      ["previoustrack", previous],
      ["nexttrack", playNextSong],
      [
        "seekto",
        (details) => {
          if (details.seekTime !== undefined) seek(details.seekTime);
        },
      ],
    ];
    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        /* Not all browsers support every media action. */
      }
    });
    return () =>
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          /* Unsupported browser action. */
        }
      });
  }, [currentSong, playSong, setIsPlaying, previous, playNextSong, seek]);

  useEffect(() => {
    if ("mediaSession" in navigator)
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  const controls = (
    <div className="transport-controls">
      <button
        type="button"
        className={`icon-button shuffle-button ${shuffle ? "control-active" : ""}`}
        aria-label="Shuffle"
        title="Shuffle"
        aria-pressed={shuffle}
        onClick={() => setShuffle((previous) => !previous)}
      >
        <FiShuffle />
      </button>
      <button
        type="button"
        className="icon-button skip-button"
        aria-label="Previous track"
        title="Previous track"
        onClick={previous}
      >
        <FiSkipBack />
      </button>
      <button
        type="button"
        className={`main-play-button ${waiting && isPlaying ? "is-buffering" : ""}`}
        aria-label={isPlaying ? "Pause playback" : "Play playback"}
        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        onClick={() => {
          updatePlayback({ error: undefined });
          togglePlay();
        }}
      >
        {isPlaying ? <FiPause /> : <FiPlay />}
      </button>
      <button
        type="button"
        className="icon-button skip-button"
        aria-label="Next track"
        title="Next track"
        onClick={playNextSong}
      >
        <FiSkipForward />
      </button>
      <button
        type="button"
        className={`icon-button repeat-button ${repeat !== "off" ? "control-active" : ""}`}
        aria-label={`Repeat: ${repeat}`}
        title={`Repeat: ${repeat}`}
        aria-pressed={repeat !== "off"}
        onClick={cycleRepeat}
      >
        <FiRepeat />
        {repeat === "one" && <span>1</span>}
      </button>
    </div>
  );

  const progress = (
    <div className="player-progress">
      <span>{formatTime(seconds)}</span>
      <input
        type="range"
        aria-label="Seek playback"
        aria-valuetext={`${formatTime(seconds)} of ${formatTime(duration)}`}
        min={0}
        max={duration || 30}
        disabled={!canSeek}
        step={0.1}
        value={Math.min(seconds, duration || 30)}
        onChange={(event) => seek(Number(event.target.value))}
        style={sliderStyle(duration ? seconds / duration : 0)}
      />
      <span>{formatTime(duration)}</span>
    </div>
  );

  return (
    <>
      {currentSong.previewUrl ? (
        <audio
          key={currentSong.id}
          ref={audioRef}
          src={currentSong.previewUrl}
          preload="none"
          muted={volume === 0}
          loop={repeat === "one" || (repeat === "all" && songs.length === 1)}
          onLoadedMetadata={(event) =>
            updatePlayback({
              duration: Number.isFinite(event.currentTarget.duration)
                ? event.currentTarget.duration
                : 30,
              ready: true,
            })
          }
          onTimeUpdate={(event) =>
            updatePlayback({ seconds: event.currentTarget.currentTime })
          }
          onPlaying={() => updatePlayback({ error: undefined, waiting: false })}
          onWaiting={() => updatePlayback({ waiting: true })}
          onEnded={playNextSong}
          onError={playbackError}
        />
      ) : (
        currentSong.youtubeId && (
          <div className="hidden-media" aria-hidden="true">
            <YouTubePlayer
              key={currentSong.id}
              ref={youtubeRef}
              url={`https://www.youtube.com/watch?v=${currentSong.youtubeId}`}
              playing={isPlaying}
              volume={volume}
              muted={volume === 0}
              width="1px"
              height="1px"
              playsinline
              loop={repeat === "one"}
              onProgress={(state) =>
                updatePlayback({ seconds: state.playedSeconds })
              }
              onDuration={(value) =>
                updatePlayback({ duration: value, ready: true })
              }
              onEnded={playNextSong}
              onError={playbackError}
              config={{ youtube: { playerVars: { controls: 0, rel: 0 } } }}
            />
          </div>
        )
      )}

      <section className="player-bar" aria-label="Music player">
        {error && (
          <div className="player-error" role="alert">
            <span>{error}</span>
            {currentSong.externalUrl && (
              <a
                href={currentSong.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentSong.previewUrl
                  ? "Listen to the full track"
                  : "Open on YouTube"}
                <FiArrowUpRight />
              </a>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss playback message"
              onClick={() => updatePlayback({ error: undefined })}
            >
              <FiX />
            </button>
          </div>
        )}
        <div className="player-song">
          <button
            type="button"
            className="player-art-button"
            aria-label="Open now playing"
            onClick={() => setExpanded(true)}
          >
            <Artwork
              src={currentSong.image}
              alt={`${currentSong.album} cover`}
              priority
            />
          </button>
          <div className="player-song-text">
            <strong title={currentSong.title}>
              {currentSong.title}
              <span className="preview-tag">
                {currentSong.previewUrl ? "PREVIEW" : "YOUTUBE"}
              </span>
            </strong>
            <span title={currentSong.artist}>{currentSong.artist}</span>
          </div>
          <button
            type="button"
            className={`icon-button player-heart ${liked ? "liked" : ""}`}
            aria-label={`${liked ? "Unlike" : "Like"} current song`}
            aria-pressed={liked}
            onClick={() => toggleFavorite(currentSong)}
          >
            <FiHeart />
          </button>
        </div>
        <div className="player-center">
          {controls}
          {progress}
        </div>
        <div className="player-tools">
          <button
            type="button"
            className="icon-button volume-button"
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            onClick={mute}
          >
            {volume === 0 ? <FiVolumeX /> : <FiVolume2 />}
          </button>
          <input
            className="volume-slider"
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            style={sliderStyle(volume)}
          />
          <span className="player-tool-divider" />
          <button
            type="button"
            className={`icon-button queue-button ${queueOpen ? "control-active" : ""}`}
            aria-label="Open play queue"
            title="Queue"
            onClick={() => setQueueOpen(true)}
          >
            <FiList />
          </button>
          <button
            type="button"
            className="icon-button expand-button"
            aria-label="Expand player"
            title="Now playing"
            onClick={() => setExpanded(true)}
          >
            <FiMaximize2 />
          </button>
        </div>
      </section>

      {expanded && (
        <Dialog
          label="Now playing"
          className="now-playing-dialog"
          onClose={() => setExpanded(false)}
        >
          <div className="now-playing-brand">
            <Brand />
            <span>Your own little world.</span>
          </div>
          <div className="now-playing-content">
            <div className="now-playing-art">
              <Artwork
                src={currentSong.image}
                alt={`${currentSong.album} cover`}
              />
              <span className="art-glow" />
            </div>
            <div className="now-playing-details">
              <p className="eyebrow">PLAYING FROM YOUR QUEUE</p>
              <span className="now-playing-preview">
                {currentSong.previewUrl
                  ? "Official track preview"
                  : "Streaming in full from YouTube"}
              </span>
              <h2>{currentSong.title}</h2>
              <p>{currentSong.artist}</p>
              <button
                type="button"
                className={`now-playing-like ${liked ? "liked" : ""}`}
                aria-pressed={liked}
                onClick={() => toggleFavorite(currentSong)}
              >
                {liked ? <FiCheck /> : <FiHeart />}
                {liked
                  ? "Saved to your liked songs"
                  : "Save to your liked songs"}
              </button>
              <Visualizer isPlaying={isPlaying} />
              {error && (
                <p className="expanded-error" role="alert">
                  {error}
                </p>
              )}
              {progress}
              {controls}
              <div className="now-playing-tools">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={volume === 0 ? "Unmute audio" : "Mute audio"}
                  onClick={mute}
                >
                  {volume === 0 ? <FiVolumeX /> : <FiVolume2 />}
                </button>
                <input
                  type="range"
                  aria-label="Volume in expanded player"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  style={sliderStyle(volume)}
                />
                <button
                  type="button"
                  className="text-link"
                  aria-label="Show queue"
                  onClick={() => {
                    setExpanded(false);
                    setQueueOpen(true);
                  }}
                >
                  <FiList />
                  Queue
                </button>
              </div>
              {currentSong.externalUrl && (
                <a
                  className="full-track-link"
                  href={currentSong.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {currentSong.previewUrl
                    ? "Listen to the full track"
                    : "Open on YouTube"}
                  <FiArrowUpRight />
                </a>
              )}
            </div>
          </div>
          <p className="now-playing-footer">
            A little less noise. A little more music.
          </p>
        </Dialog>
      )}

      {queueOpen && (
        <Dialog
          label="Play queue"
          className="queue-dialog"
          onClose={() => setQueueOpen(false)}
        >
          <p className="eyebrow">KEEP THE GOOD STUFF COMING</p>
          <h2>Your queue.</h2>
          <div className="queue-heading">
            <span>
              {songs.length} {songs.length === 1 ? "track" : "tracks"}
            </span>
            <button
              type="button"
              className="text-link"
              onClick={() => setSongs([currentSong])}
            >
              Clear queue
            </button>
          </div>
          <div className="queue-tracks">
            {songs.map((song, index) => (
              <div
                className={`queue-track ${song.id === currentSong.id ? "queue-current" : ""}`}
                key={song.id}
              >
                <span className="queue-index">
                  {song.id === currentSong.id ? (
                    <span className="queue-current-dot" />
                  ) : (
                    index + 1
                  )}
                </span>
                <button
                  type="button"
                  className="queue-track-main"
                  onClick={() => playSong(song, songs)}
                >
                  <Artwork src={song.image} alt="" />
                  <span>
                    <strong>{song.title}</strong>
                    <span>{song.artist}</span>
                  </span>
                  <FiPlay />
                </button>
                {song.id !== currentSong.id && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${song.title} from queue`}
                    onClick={() =>
                      setSongs((previous) =>
                        previous.filter((item) => item.id !== song.id),
                      )
                    }
                  >
                    <FiX />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="queue-footer">Great company for whatever comes next.</p>
        </Dialog>
      )}
    </>
  );
}
