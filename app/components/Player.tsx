"use client";

import {
  useRef,
  useState,
} from "react";
import { useEffect } from "react";
import ReactPlayer
from "react-player";

import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaVolumeUp,
  FaExpand,
  FaCompress,
} from "react-icons/fa";

import { usePlayer }
from "../context/PlayerContext";

import Visualizer
from "./Visualizer";

export default function Player() {

  const playerRef =
    useRef<any>(null);

  const {
    currentSong,
    isPlaying,
    setIsPlaying,
    playNextSong,
    playPrevSong,
  } = usePlayer();

useEffect(() => {
  if (!currentSong) return;

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata =
      new MediaMetadata({
        title: currentSong.title,
        artist:
          currentSong.channelTitle || "Unknown",
        artwork: [
          {
            src:
              currentSong.thumbnail?.thumbnails?.[0]
                ?.url || "",
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

    navigator.mediaSession.setActionHandler(
      "play",
      async () => {
        setIsPlaying(true);
      }
    );

    navigator.mediaSession.setActionHandler(
      "pause",
      () => {
        setIsPlaying(false);
      }
    );

    navigator.mediaSession.setActionHandler(
      "nexttrack",
      () => {
        playNextSong();
      }
    );

    navigator.mediaSession.setActionHandler(
      "previoustrack",
      () => {
        playPrevSong();
      }
    );
  }
}, [currentSong, isPlaying]);

  const [played, setPlayed] =
    useState(0);

  const [duration, setDuration] =
    useState<number>(0);

  const [volume, setVolume] =
    useState(0.8);

  const [expanded, setExpanded] =
    useState(false);

  if (!currentSong) return null;

  const videoUrl =
    `https://www.youtube.com/watch?v=${currentSong.id}`;

  // FORMAT TIME
  const formatTime = (
    seconds: number
  ) => {

    if (
      !seconds ||
      isNaN(seconds)
    ) {
      return "0:00";
    }

    const mins =
      Math.floor(seconds / 60);

    const secs =
      Math.floor(seconds % 60);

    return `${mins}:${
      secs < 10 ? "0" : ""
    }${secs}`;
  };

  return (
    <>
      {/* HIDDEN PLAYER */}
      <div className="absolute opacity-0 pointer-events-none">

        <ReactPlayer
  ref={playerRef}
  url={videoUrl}
  playing={isPlaying}
  controls={false}
  width="1px"
  height="1px"
  volume={volume}
  playsinline={true}
  pip={true}
  config={{
    youtube: {
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
      },
    },
  }}
/>
      </div>

      {/* FULLSCREEN PLAYER */}
      {expanded && (

        <div className="fixed inset-0 z-[999] overflow-hidden bg-black">

          {/* BACKGROUND */}
          <div className="absolute inset-0">

            <img
              src={
                currentSong.thumbnail
                  ?.thumbnails?.[0]?.url
              }
              alt={currentSong.title}
              className="w-full h-full object-cover blur-3xl scale-125 opacity-20"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/70 to-black"></div>
          </div>

          

          {/* MAIN CONTENT */}
         
            <div className="relative z-10 min-h-screen flex flex-col justify-between px-4 sm:px-6 md:px-10 py-6 md:py-10 overflow-y-auto">

  {/* TOP */}
  <div className="flex justify-end">

    <button
      onClick={() =>
        setExpanded(false)
      }
      className="text-white text-2xl"
    >
      <FaCompress />
    </button>
  </div>

  {/* CENTER SECTION */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center max-w-6xl mx-auto w-full mt-6 md:mt-0">

    {/* LEFT */}
    <div className="flex justify-center">

      <div className="relative">

        <img
          src={
            currentSong.thumbnail
              ?.thumbnails?.[0]?.url
          }
          alt={currentSong.title}
          className="w-[180px] sm:w-[220px] md:w-[280px] lg:w-[320px] aspect-square rounded-[24px] md:rounded-[32px] shadow-2xl object-cover mx-auto"
        />

        {/* GLOW */}
        <div className="absolute -inset-8 bg-gradient-to-r from-green-500 via-pink-500 to-purple-500 opacity-20 blur-3xl rounded-full -z-10"></div>
      </div>
    </div>

    {/* RIGHT */}
    <div>

      <p className="text-green-400 text-sm uppercase tracking-[4px] mb-4">

        Now Playing
      </p>

      <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-3xl font-black leading-tight line-clamp-3 text-center lg:text-left text-white">

        {currentSong.title}
      </h2>

      <p className="text-gray-400 mt-4 text-sm sm:text-base md:text-lg text-center lg:text-left">

        {
          currentSong.channelTitle
        }
      </p>

      {/* VISUALIZER */}
      <div className="mt-10">

        <Visualizer
          isPlaying={isPlaying}
        />
      </div>

      {/* PROGRESS */}
      <div className="mt-10">

        <input
          type="range"
          min={0}
          max={0.999999}
          step="any"
          value={played || 0}
          onChange={(e) => {

            const seekTo =
              Number(
                e.target.value
              );

            setPlayed(
              seekTo
            );

            if (
              playerRef.current &&
              playerRef.current.seekTo
            ) {
              playerRef.current.seekTo(
                seekTo
              );
            }
          }}
          className="w-full h-1 accent-green-500 cursor-pointer"
        />

        <div className="flex justify-between text-sm text-gray-400 mt-2">

          <span>
            {formatTime(
              played *
                duration
            )}
          </span>

          <span>
            {formatTime(
              duration
            )}
          </span>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center justify-center lg:justify-start gap-5 sm:gap-8 mt-8">

        <button
          onClick={
            playPrevSong
          }
          className="text-white text-2xl"
        >
          <FaStepBackward />
        </button>

        <button
          onClick={() =>
            setIsPlaying(
              !isPlaying
            )
          }
          className="bg-green-500 text-black w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,255,128,0.4)] hover:scale-105 transition"
        >
          {isPlaying ? (
            <FaPause size={22} />
          ) : (
            <FaPlay
              size={22}
              className="ml-1"
            />
          )}
        </button>

        <button
          onClick={
            playNextSong
          }
          className="text-white text-2xl"
        >
          <FaStepForward />
        </button>
      </div>
    </div>
  </div>

  {/* BOTTOM */}
  <div className="flex justify-end">

    <div className="hidden md:flex items-center gap-4">

      <FaVolumeUp className="text-gray-400" />

      <input
        type="range"
        min={0}
        max={1}
        step="0.01"
        value={volume || 0}
        onChange={(e) =>
          setVolume(
            Number(
              e.target.value
            )
          )
        }
        className="w-32 accent-white"
      />
    </div>
  </div>
</div>
            
          </div>
        
      )}

      {/* MINI PLAYER */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[96%] md:w-[92%] lg:w-[80%] bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[28px] px-4 md:px-6 py-4 z-50 shadow-2xl overflow-hidden">

        {/* MINI PROGRESS */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/10">

          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{
              width: `${played * 100}%`,
            }}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-center gap-4 min-w-0">

            <img
              src={
                currentSong.thumbnail
                  ?.thumbnails?.[0]?.url
              }
              alt={currentSong.title}
              className="w-14 h-14 rounded-2xl object-cover"
            />

            <div className="min-w-0">

              <h2 className="font-semibold truncate text-sm text-white">

                {currentSong.title}
              </h2>

              <p className="text-gray-400 text-xs truncate">

                {
                  currentSong.channelTitle
                }
              </p>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center justify-center gap-5 w-full md:w-auto">

            <button
              onClick={
                playPrevSong
              }
              className="text-white"
            >
              <FaStepBackward />
            </button>

            <button
              onClick={() =>
                setIsPlaying(
                  !isPlaying
                )
              }
              className="bg-gradient-to-r from-green-400 to-green-500 text-black w-12 h-12 rounded-full flex items-center justify-center"
            >
              {isPlaying ? (
                <FaPause />
              ) : (
                <FaPlay className="ml-1" />
              )}
            </button>

            <button
              onClick={
                playNextSong
              }
              className="text-white"
            >
              <FaStepForward />
            </button>
          </div>

          {/* RIGHT */}
          <div className="flex items-center justify-center md:justify-end gap-4 w-full md:w-auto">

            <div className="hidden lg:flex">

              <Visualizer
                isPlaying={isPlaying}
              />
            </div>

            <button
              onClick={() =>
                setExpanded(true)
              }
              className="text-white text-xl hover:scale-110 transition"
            >
              <FaExpand />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}