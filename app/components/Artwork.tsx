"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * YouTube publishes the crisp 16:9 (`hq720`) thumbnail only for HD uploads, so
 * a failed request retries the small one before falling back to local artwork.
 */
export function artworkChain(src: string) {
  const chain = [src];
  const youtube = src.match(
    /^https:\/\/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\/hq720\.jpg/,
  );
  if (youtube)
    chain.push(`https://i.ytimg.com/vi/${youtube[1]}/mqdefault.jpg`);
  chain.push("/images/playlist-night.webp");
  return chain;
}

export default function Artwork({
  src,
  alt,
  className = "",
  priority = false,
}: Props) {
  // One counter per source: the first failure moves to the next image in the
  // chain, and switching tracks starts from the top again.
  const [failures, setFailures] = useState<Record<string, number>>({});
  const chain = artworkChain(src);
  const source = chain[Math.min(failures[src] ?? 0, chain.length - 1)];
  return (
    <Image
      src={source}
      alt={alt}
      width={500}
      height={500}
      className={className}
      unoptimized
      priority={priority}
      onError={() =>
        setFailures((previous) => ({
          ...previous,
          [src]: (previous[src] ?? 0) + 1,
        }))
      }
    />
  );
}
