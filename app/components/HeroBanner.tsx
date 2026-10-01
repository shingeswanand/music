"use client";

import Image from "next/image";
import { useState } from "react";
import {
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
  FiDisc,
  FiPlay,
} from "react-icons/fi";
import { CURATED_PLAYLISTS, getPlaylistSongs } from "../lib/catalogue";
import { usePlayer } from "../context/PlayerContext";
import Artwork from "./Artwork";

type Props = { onExplore: (id: string) => void };
const spotlights = [
  {
    playlist: "bollywood",
    badge: "The feel-good edit",
    title: (
      <>
        Some songs just
        <br />
        feel like <em>home.</em>
      </>
    ),
    description: (
      <>
        The best of Hindi & Marathi. A little nostalgia,
        <br className="desktop-break" /> a whole lot of feeling.
      </>
    ),
  },
  {
    playlist: "late-night",
    badge: "After-hours essentials",
    title: (
      <>
        The city sleeps.
        <br />
        Your music <em>doesn’t.</em>
      </>
    ),
    description: (
      <>
        For quiet roads, wandering thoughts,
        <br className="desktop-break" /> and one more song before home.
      </>
    ),
  },
  {
    playlist: "good-energy",
    badge: "A little pick-me-up",
    title: (
      <>
        Good days start
        <br />
        with good <em>music.</em>
      </>
    ),
    description: (
      <>
        A fresh dose of feel-good favorites.
        <br className="desktop-break" /> Press play. Find your happy place.
      </>
    ),
  },
];

export default function HeroBanner({ onExplore }: Props) {
  const [slide, setSlide] = useState(0);
  const { playSong } = usePlayer();
  const spotlight = spotlights[slide];
  const playlist = CURATED_PLAYLISTS.find(
    (item) => item.id === spotlight.playlist,
  )!;
  const queue = getPlaylistSongs(playlist);
  const dailyQueue = CURATED_PLAYLISTS.flatMap(getPlaylistSongs).filter(
    (song, index, all) =>
      all.findIndex((item) => item.id === song.id) === index,
  );
  const dailyFirst = dailyQueue[1];
  return (
    <div className="hero-layout">
      <section className="hero-banner" aria-label="Featured playlist">
        <Image
          src="/images/discovery-hero.jpg"
          alt="An indie musician performing under warm amber stage lights"
          fill
          unoptimized
          priority
          className="hero-photo"
          sizes="(max-width: 700px) 100vw, 75vw"
        />
        <div className="hero-shade" />
        <div className="hero-content" key={slide}>
          <span className="spotlight-badge">
            <FiDisc />
            {spotlight.badge}
          </span>
          <h2>{spotlight.title}</h2>
          <p>{spotlight.description}</p>
          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => playSong(queue[0], queue)}
            >
              <FiPlay className="filled-play" />
              Play the mix
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
            Handpicked. Heart-approved.
          </span>
          <div className="hero-pagination">
            <span>
              0{slide + 1}
              <b> / 03</b>
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Previous featured playlist"
              onClick={() =>
                setSlide(
                  (previous) =>
                    (previous + spotlights.length - 1) % spotlights.length,
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
                setSlide((previous) => (previous + 1) % spotlights.length)
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
        onClick={() =>
          playSong(dailyFirst, [
            dailyFirst,
            ...dailyQueue.filter((song) => song.id !== dailyFirst.id),
          ])
        }
        aria-label="Play your Daily Mix"
      >
        <span className="daily-kicker">A GOOD KIND OF SURPRISE</span>
        <span className="mix-art">
          <span className="vinyl-disc">
            <span />
          </span>
          <Artwork src="/images/heeriye.webp" alt="" className="mix-cover" />
          <span className="mix-sticker">
            <FiDisc />
          </span>
        </span>
        <span className="mix-genre">HINDI · MARATHI · INDIE</span>
        <span className="mix-bottom">
          <span>
            <strong>Your Daily Mix</strong>
            <span>A little familiar. A little unexpected.</span>
          </span>
          <span className="mix-play">
            <FiPlay />
          </span>
        </span>
      </button>
    </div>
  );
}
