"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiMenu,
  FiHeadphones,
  FiX,
  FiHeart,
  FiClock,
  FiEdit2,
  FiUser,
} from "react-icons/fi";
import type { View } from "../lib/types";
import { useStoredValue } from "../lib/storage";
import { usePlayer } from "../context/PlayerContext";
import Dialog from "./Dialog";

type Props = {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onNavigate: (view: View) => void;
  onBack: () => void;
  onForward: () => void;
  canBack: boolean;
  canForward: boolean;
  onOpenMobile: () => void;
};

export default function Header({
  query,
  onQueryChange,
  onSearch,
  onNavigate,
  onBack,
  onForward,
  canBack,
  canForward,
  onOpenMobile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileTrigger = useRef<HTMLButtonElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savedName, setSavedName] = useStoredValue<unknown>(
    "sms-profile-name",
    "Music lover",
  );
  const name =
    typeof savedName === "string" && savedName.trim()
      ? savedName.trim().slice(0, 40)
      : "Music lover";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => [...part][0])
    .join("")
    .toUpperCase();
  const { favorites, recentSongs, playlists, isPlaying, notify } = usePlayer();

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") setProfileOpen(false);
    };
    const outside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  const closeProfile = () => {
    setEditingProfile(false);
    window.requestAnimationFrame(() => profileTrigger.current?.focus());
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) onSearch();
  };
  const profileNavigate = (view: View) => {
    onNavigate(view);
    setProfileOpen(false);
  };

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="icon-button mobile-menu"
          aria-label="Open navigation"
          onClick={onOpenMobile}
        >
          <FiMenu />
        </button>
        <div className="history-controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Go back"
            disabled={!canBack}
            onClick={onBack}
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Go forward"
            disabled={!canForward}
            onClick={onForward}
          >
            <FiChevronRight />
          </button>
        </div>
        <form className="search-form" onSubmit={submit} role="search">
          <button type="submit" className="search-icon" aria-label="Search">
            <FiSearch />
          </button>
          <input
            ref={inputRef}
            aria-label="Search songs, artists, or albums"
            type="search"
            placeholder="Search songs, artists, albums..."
            value={query}
            maxLength={200}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
            >
              <FiX />
            </button>
          ) : (
            <kbd>⌘ K</kbd>
          )}
        </form>
        <div className="topbar-right">
          <span
            className="preview-pill"
            title="Full YouTube tracks and official music previews."
          >
            <FiHeadphones />
            {isPlaying ? "Listening now" : "Here for the music"}
          </span>
          <div className="profile-wrap" ref={profileRef}>
            <button
              type="button"
              ref={profileTrigger}
              className="profile-button"
              aria-label="Open your profile"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((previous) => !previous)}
            >
              <span className="avatar" title={name}>
                {initials}
              </span>
              <FiChevronDown />
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <p>
                  {name}
                  <span>
                    {favorites.length} liked · {recentSongs.length} recent ·{" "}
                    {playlists.length}{" "}
                    {playlists.length === 1 ? "playlist" : "playlists"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => profileNavigate({ type: "favorites" })}
                >
                  <FiHeart />
                  Liked songs
                </button>
                <button
                  type="button"
                  onClick={() => profileNavigate({ type: "recent" })}
                >
                  <FiClock />
                  Listening history
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(name);
                    setProfileOpen(false);
                    setEditingProfile(true);
                  }}
                >
                  <FiEdit2 />
                  Edit your profile
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {editingProfile && (
        <Dialog
          label="Your profile"
          className="create-dialog"
          onClose={closeProfile}
        >
          <span className="dialog-art">
            <FiUser />
          </span>
          <p className="eyebrow">YOUR LISTENING SPACE</p>
          <h2>Make yourself at home.</h2>
          <p>
            Your profile and library stay on this device. No account needed.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draftName.trim()) return;
              setSavedName(draftName.trim());
              closeProfile();
              notify("Your profile is updated.");
            }}
          >
            <label htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              value={draftName}
              maxLength={40}
              required
              onChange={(event) => setDraftName(event.target.value)}
            />
            <button
              type="submit"
              className="primary-button"
              disabled={!draftName.trim()}
            >
              Save profile
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
