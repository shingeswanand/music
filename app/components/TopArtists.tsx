"use client";

import { FiArrowUpRight } from "react-icons/fi";
import type { Artist } from "../lib/types";
import Artwork from "./Artwork";

type Props = { artists: Artist[]; onArtistClick: (artist: string) => void };

export default function TopArtists({ artists, onArtistClick }: Props) {
  return (
    <div className="artist-grid">
      {artists.map((artist) => (
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
