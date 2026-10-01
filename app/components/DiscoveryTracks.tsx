import type { Song } from "../lib/types";
import SkeletonCard from "./SkeletonCard";
import TrendingSongs from "./TrendingSongs";

type Props = {
  songs: Song[];
  loading?: boolean;
  ranked?: boolean;
  playlistId?: string;
};

export default function DiscoveryTracks({
  songs,
  loading,
  ranked,
  playlistId,
}: Props) {
  if (loading && !songs.length)
    return (
      <div className="song-grid" role="status" aria-label="Loading music">
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  if (!songs.length)
    return (
      <div className="feed-empty">
        <h3>No tracks in this selection yet.</h3>
        <p>Try another mood or refresh to ask the music providers again.</p>
      </div>
    );
  return (
    <TrendingSongs songs={songs} ranked={ranked} playlistId={playlistId} />
  );
}
