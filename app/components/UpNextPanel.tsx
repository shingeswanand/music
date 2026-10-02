"use client";

import { FiList } from "react-icons/fi";
import { usePlayer } from "../context/PlayerContext";
import QueueList from "./QueueList";

/**
 * The playing list, always visible on wide screens. On smaller screens the
 * player bar's queue button opens the same list as a dialog instead. The
 * panel never blocks playback: playback keeps running in the background
 * while listeners browse anywhere in the app.
 */
export default function UpNextPanel() {
  const { songs, currentSong, setSongs } = usePlayer();
  if (!currentSong || songs.length === 0) return null;
  return (
    <aside className="queue-panel" aria-label="Up next">
      <div className="queue-panel-head">
        <span className="queue-panel-icon" aria-hidden="true">
          <FiList />
        </span>
        <div>
          <p className="eyebrow">KEEP THE GOOD STUFF COMING</p>
          <h2>Your playing list</h2>
        </div>
      </div>
      <div className="queue-heading">
        <span>
          {songs.length} {songs.length === 1 ? "track" : "tracks"}
        </span>
        <button
          type="button"
          className="text-link"
          onClick={() => setSongs([currentSong])}
        >
          Clear queue
        </button>
      </div>
      <QueueList autoScrollCurrent />
    </aside>
  );
}
