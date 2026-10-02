"use client";

import { useCallback, useRef } from "react";
import { FiChevronDown, FiChevronUp, FiPlay, FiX } from "react-icons/fi";
import { usePlayer } from "../context/PlayerContext";
import Artwork from "./Artwork";

/**
 * The live playing list: shared by the always-visible "Up next" panel on wide
 * screens and the queue dialog on smaller ones. Rows play on tap, reorder with
 * earlier/later buttons and remove without stopping the current track.
 */
export default function QueueList({
  autoScrollCurrent = false,
}: {
  autoScrollCurrent?: boolean;
}) {
  const { songs, currentSong, isPlaying, playSong, setSongs } = usePlayer();
  const didScroll = useRef(false);
  const currentRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && autoScrollCurrent && !didScroll.current) {
        didScroll.current = true;
        node.scrollIntoView({ block: "center" });
      }
    },
    [autoScrollCurrent],
  );

  const moveSong = (songId: string, direction: -1 | 1) => {
    setSongs((previous) => {
      const index = previous.findIndex((song) => song.id === songId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= previous.length) return previous;
      const tracks = [...previous];
      [tracks[index], tracks[next]] = [tracks[next], tracks[index]];
      return tracks;
    });
  };

  return (
    <div className="queue-tracks">
      {songs.map((song, index) => {
        const current = song.id === currentSong?.id;
        return (
          <div
            className={`queue-track ${current ? "queue-current" : ""}`}
            key={song.id}
            ref={current ? currentRef : undefined}
          >
            <span className="queue-index">
              {current ? (
                <span
                  className={`queue-eq ${isPlaying ? "" : "queue-eq-paused"}`}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                index + 1
              )}
            </span>
            <button
              type="button"
              className="queue-track-main"
              onClick={() => playSong(song, songs)}
            >
              <Artwork src={song.image} alt="" />
              <span>
                <strong>{song.title}</strong>
                <span>{song.artist}</span>
              </span>
              <FiPlay />
            </button>
            <span className="queue-track-tools">
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${song.title} up in queue`}
                disabled={index === 0}
                onClick={() => moveSong(song.id, -1)}
              >
                <FiChevronUp />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${song.title} down in queue`}
                disabled={index === songs.length - 1}
                onClick={() => moveSong(song.id, 1)}
              >
                <FiChevronDown />
              </button>
              {!current && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${song.title} from queue`}
                  onClick={() =>
                    setSongs((previous) =>
                      previous.filter((item) => item.id !== song.id),
                    )
                  }
                >
                  <FiX />
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
