"use client";

export default function Visualizer({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div
      className={`visualizer ${isPlaying ? "visualizer-playing" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 24 }, (_, index) => (
        <span
          key={index}
          style={{
            animationDelay: `${index * 0.09}s`,
            height: `${18 + ((index * 31) % 75)}%`,
          }}
        />
      ))}
    </div>
  );
}
