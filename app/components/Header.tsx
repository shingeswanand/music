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
} from "react-icons/fi";
import type { View } from "../lib/types";

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
  const [profileOpen, setProfileOpen] = useState(false);
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
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) onSearch();
  };
  const profileNavigate = (view: View) => {
    onNavigate(view);
    setProfileOpen(false);
  };

  return (
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
          title="Explore official track previews. Full tracks are linked in the player."
        >
          <FiHeadphones />
          Here for the music
        </span>
        <div className="profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="profile-button"
            aria-label="Open your profile"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((previous) => !previous)}
          >
            <span className="avatar">S</span>
            <FiChevronDown />
          </button>
          {profileOpen && (
            <div className="profile-dropdown">
              <p>
                Your listening space
                <span>No account needed. Just good music.</span>
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
