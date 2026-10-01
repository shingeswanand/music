"use client";

import { FiArrowUpRight } from "react-icons/fi";
import { ARTISTS } from "../lib/catalogue";
import Artwork from "./Artwork";

type Props = { onArtistClick: (artist: string) => void };

export default function TopArtists({ onArtistClick }: Props) {
  return (
    <div className="artist-grid">
      {ARTISTS.map((artist) => (
        <button
          type="button"
          className="artist-card"
          key={artist.name}
          onClick={() => onArtistClick(artist.name)}
          aria-label={`Find songs by ${artist.name}`}
        >
          <span className="artist-photo">
            <Artwork src={artist.image} alt={artist.name} />
            <span>
              <FiArrowUpRight />
            </span>
          </span>
          <strong>{artist.name}</strong>
          <span>{artist.description}</span>
        </button>
      ))}
    </div>
  );
}
