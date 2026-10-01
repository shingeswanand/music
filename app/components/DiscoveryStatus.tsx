"use client";

import { FiRefreshCw, FiRadio, FiWifiOff } from "react-icons/fi";
import type { DiscoveryResource } from "../context/DiscoveryContext";
import { collectionSourceLabel } from "../lib/types";

type Props = {
  resource?: DiscoveryResource;
  onRefresh: () => void;
  refreshLabel?: string;
};

export default function DiscoveryStatus({
  resource,
  onRefresh,
  refreshLabel = "Refresh music",
}: Props) {
  const data = resource?.data;
  const busy = resource?.loading ?? !data;
  return (
    <section
      className={`discovery-status ${data && !data.live ? "discovery-fallback" : ""}`}
      aria-label="Music feed status"
    >
      <div role="status">
        {data?.live ? (
          <FiRadio />
        ) : data ? (
          <FiWifiOff />
        ) : (
          <FiRefreshCw className="refresh-spinning" />
        )}
        <span>
          <strong>
            {busy
              ? "Finding fresh music…"
              : data?.live
                ? "Live discovery"
                : data?.partial
                  ? "Partly live"
                  : "Offline catalogue"}
          </strong>
          <span>
            {data
              ? data.live
                ? `${data.songs.length ? collectionSourceLabel(data.songs) : "No tracks returned"} · Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : data.error
              : "Connecting to music providers."}
            {resource?.checkingLive && " Checking your browser’s connection…"}
          </span>
        </span>
      </div>
      <button
        type="button"
        className="text-link"
        disabled={busy}
        onClick={onRefresh}
        aria-label={refreshLabel}
      >
        <FiRefreshCw className={busy ? "refresh-spinning" : ""} />
        {busy ? "Refreshing…" : "Refresh"}
      </button>
    </section>
  );
}
