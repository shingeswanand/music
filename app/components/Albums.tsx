"use client";

import { FiArrowUpRight, FiMusic } from "react-icons/fi";
import { useDiscovery } from "../context/DiscoveryContext";
import Artwork from "./Artwork";

type Props = { onAlbumClick: (id: string) => void };

export default function Albums({ onAlbumClick }: Props) {
  const { mixes } = useDiscovery();
  return (
    <div className="mood-grid">
      {mixes.map((playlist) => (
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
            {playlist.category.toUpperCase()} MIX
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
