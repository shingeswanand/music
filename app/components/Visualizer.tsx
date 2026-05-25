"use client";

type Props = {
  isPlaying: boolean;
};

export default function Visualizer({
  isPlaying,
}: Props) {

  return (
    <div className="flex items-end gap-[4px] h-10">

      {[...Array(20)].map(
        (_, index) => (

        <span
          key={index}

          className={`w-[4px] rounded-full bg-green-500 ${
            isPlaying
              ? "animate-music-bar"
              : "h-2"
          }`}
          style={{
            animationDelay:
              `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}