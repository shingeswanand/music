"use client";

import { FiArrowUpRight, FiMusic } from "react-icons/fi";
import { CURATED_PLAYLISTS } from "../lib/catalogue";
import Artwork from "./Artwork";

type Props = { onAlbumClick: (id: string) => void };

export default function Albums({ onAlbumClick }: Props) {
  return (
    <div className="mood-grid">
      {CURATED_PLAYLISTS.map((playlist) => (
        <button
          type="button"
          key={playlist.id}
          className="mood-card"
          onClick={() => onAlbumClick(playlist.id)}
        >
          <Artwork src={playlist.image} alt="" />
          <span className="mood-shade" />
          <span className="mood-card-label">
            <FiMusic />
            SMS SELECTS
          </span>
          <span className="mood-card-bottom">
            <strong>{playlist.name}</strong>
            <span>{playlist.description}</span>
          </span>
          <FiArrowUpRight className="mood-arrow" />
        </button>
      ))}
    </div>
  );
}
