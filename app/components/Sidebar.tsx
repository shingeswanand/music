"use client";

import {
  FiCompass,
  FiGrid,
  FiRadio,
  FiHeart,
  FiClock,
  FiPlus,
  FiMusic,
  FiHeadphones,
  FiArrowUpRight,
} from "react-icons/fi";
import { useDiscovery } from "../context/DiscoveryContext";
import type { View } from "../lib/types";
import { usePlayer } from "../context/PlayerContext";
import Dialog from "./Dialog";

type Props = {
  view: View;
  onNavigate: (view: View) => void;
  onCreatePlaylist: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        {[12, 23, 31, 23, 12].map((height, index) => (
          <i key={index} style={{ height }} />
        ))}
      </span>
      <span>
        SMS<span className="brand-light"> Music</span>
        <span className="brand-dot">.</span>
      </span>
    </span>
  );
}

export default function Sidebar({
  view,
  onNavigate,
  onCreatePlaylist,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const { favorites, playlists } = usePlayer();
  const { mixes } = useDiscovery();
  const navigate = (next: View) => {
    onNavigate(next);
    onCloseMobile();
  };
  const contents = (
    <>
      <button
        type="button"
        className="brand-button"
        aria-label="SMS Music home"
        onClick={() => navigate({ type: "home" })}
      >
        <Brand />
      </button>
      <div className="sidebar-scroll">
        <p className="nav-label">Discover</p>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`nav-item ${view.type === "home" ? "active" : ""}`}
            aria-current={view.type === "home" ? "page" : undefined}
            onClick={() => navigate({ type: "home" })}
          >
            <FiCompass />
            <span>For you</span>
            <span className="nav-active-dot" />
          </button>
          <button
            type="button"
            className={`nav-item ${view.type === "discover" || view.type === "search" ? "active" : ""}`}
            aria-current={view.type === "discover" ? "page" : undefined}
            onClick={() => navigate({ type: "discover" })}
          >
            <FiGrid />
            <span>Browse music</span>
          </button>
          <button
            type="button"
            className={`nav-item ${view.type === "radio" ? "active" : ""}`}
            aria-current={view.type === "radio" ? "page" : undefined}
            onClick={() => navigate({ type: "radio" })}
          >
            <FiRadio />
            <span>Radio</span>
            <span className="tiny-label">NEW</span>
          </button>
        </nav>
        <p className="nav-label library-label">Your library</p>
        <nav className="main-nav" aria-label="Your library">
          <button
            type="button"
            className={`nav-item ${view.type === "favorites" ? "active" : ""}`}
            aria-current={view.type === "favorites" ? "page" : undefined}
            onClick={() => navigate({ type: "favorites" })}
          >
            <FiHeart />
            <span>Liked songs</span>
            <span className="nav-count">{favorites.length || ""}</span>
          </button>
          <button
            type="button"
            className={`nav-item ${view.type === "recent" ? "active" : ""}`}
            aria-current={view.type === "recent" ? "page" : undefined}
            onClick={() => navigate({ type: "recent" })}
          >
            <FiClock />
            <span>Recently played</span>
          </button>
        </nav>
        <div className="playlist-nav-heading">
          <p className="nav-label">Mixes & playlists</p>
          <button
            type="button"
            className="icon-button"
            aria-label="Create playlist"
            onClick={() => {
              onCreatePlaylist();
              onCloseMobile();
            }}
          >
            <FiPlus />
          </button>
        </div>
        <nav className="playlist-nav" aria-label="Playlists">
          {mixes.map((playlist) => (
            <button
              type="button"
              key={playlist.id}
              className={`playlist-nav-item ${view.type === "playlist" && view.id === playlist.id ? "selected" : ""}`}
              onClick={() => navigate({ type: "playlist", id: playlist.id })}
            >
              <span
                className="playlist-color"
                style={{ backgroundColor: playlist.color }}
              >
                <FiMusic />
              </span>
              <span>{playlist.name}</span>
            </button>
          ))}
          {playlists.map((playlist) => (
            <button
              type="button"
              key={playlist.id}
              className={`playlist-nav-item ${view.id === playlist.id ? "selected" : ""}`}
              onClick={() => navigate({ type: "playlist", id: playlist.id })}
            >
              <span className="playlist-color personal-color">
                <FiMusic />
              </span>
              <span>{playlist.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="new-playlist"
            onClick={() => {
              onCreatePlaylist();
              onCloseMobile();
            }}
          >
            <FiPlus />
            Create a playlist
          </button>
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <FiHeadphones />
          <h3>A little more you.</h3>
          <p>
            Find a soundtrack for
            <br />
            every version of your day.
          </p>
          <button
            type="button"
            className="text-link"
            onClick={() => navigate({ type: "discover" })}
          >
            Explore your sound
            <FiArrowUpRight />
          </button>
        </div>
        <p className="sidebar-footer">
          <span />
          Good music. No boundaries.
        </p>
      </div>
    </>
  );
  return (
    <>
      <aside className="sidebar">{contents}</aside>
      {mobileOpen && (
        <Dialog
          label="Navigation"
          className="drawer-dialog"
          onClose={onCloseMobile}
        >
          {contents}
        </Dialog>
      )}
    </>
  );
}
