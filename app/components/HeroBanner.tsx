"use client";

import { useState } from "react";
import {
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
  FiDisc,
  FiPlay,
} from "react-icons/fi";
import { useDiscovery } from "../context/DiscoveryContext";
import { usePlayer } from "../context/PlayerContext";
import { collectionSourceLabel } from "../lib/types";
import Artwork from "./Artwork";

type Props = {
  onExplore: (id: string) => void;
  onPlayMix: (id: string) => void;
};

export default function HeroBanner({ onExplore, onPlayMix }: Props) {
  const [slide, setSlide] = useState(0);
  const { mixes, mixStates, dailySongs } = useDiscovery();
  const { playSong, favorites, recentSongs } = usePlayer();
  const playlist = mixes[slide % mixes.length];
  const loading =
    mixStates[playlist.id]?.loading || mixStates[playlist.id]?.checkingLive;
  const dailyFirst = dailySongs[0];
  const genres = [...new Set(dailySongs.flatMap((song) => song.categories))]
    .filter((category) => category !== "YouTube" && category !== "For you")
    .slice(0, 3);

  return (
    <div className="hero-layout">
      <section className="hero-banner" aria-label="Featured playlist">
        <Artwork src={playlist.image} alt="" className="hero-photo" priority />
        <div className="hero-shade" />
        <div className="hero-content" key={playlist.id}>
          <span className="spotlight-badge">
            <FiDisc />
            {playlist.category} essentials
          </span>
          <h2>{playlist.name}</h2>
          <p>
            {playlist.description}
            <br />
            {playlist.songs.length
              ? collectionSourceLabel(playlist.songs)
              : "A fresh selection, loaded when you press play."}
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              disabled={loading}
              onClick={() => onPlayMix(playlist.id)}
            >
              <FiPlay className="filled-play" />
              {loading ? "Loading the mix…" : "Play the mix"}
            </button>
            <button
              type="button"
              className="hero-explore"
              onClick={() => onExplore(playlist.id)}
            >
              Explore playlist
              <FiArrowUpRight />
            </button>
          </div>
        </div>
        <div className="hero-footer">
          <span>
            <i />
            Fresh tracks. Your kind of music.
          </span>
          <div className="hero-pagination">
            <span>
              {String(slide + 1).padStart(2, "0")}
              <b> / {String(mixes.length).padStart(2, "0")}</b>
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Previous featured playlist"
              onClick={() =>
                setSlide(
                  (previous) => (previous + mixes.length - 1) % mixes.length,
                )
              }
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Next featured playlist"
              onClick={() =>
                setSlide((previous) => (previous + 1) % mixes.length)
              }
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
      <button
        type="button"
        className="daily-mix"
        disabled={!dailyFirst}
        onClick={() => dailyFirst && playSong(dailyFirst, dailySongs)}
        aria-label="Play your Daily Mix"
      >
        <span className="daily-kicker">
          {favorites.length || recentSongs.length
            ? "INSPIRED BY YOUR LISTENING"
            : "A GOOD KIND OF SURPRISE"}
        </span>
        <span className="mix-art">
          <span className="vinyl-disc">
            <span />
          </span>
          <Artwork
            src={dailyFirst?.image ?? "/images/playlist-night.webp"}
            alt=""
            className="mix-cover"
          />
          <span className="mix-sticker">
            <FiDisc />
          </span>
        </span>
        <span className="mix-genre">
          {genres.length
            ? genres.join(" · ").toUpperCase()
            : "YOUR MUSIC · YOUR MIX"}
        </span>
        <span className="mix-bottom">
          <span>
            <strong>Your Daily Mix</strong>
            <span>
              {dailySongs.length} tracks ·{" "}
              {dailyFirst
                ? `Starting with ${dailyFirst.title}`
                : "Finding your sound…"}
            </span>
          </span>
          <span className="mix-play">
            <FiPlay />
          </span>
        </span>
      </button>
    </div>
  );
}
