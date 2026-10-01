"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export default function Artwork({
  src,
  alt,
  className = "",
  priority = false,
}: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <Image
      src={failedSource === src ? "/images/playlist-night.webp" : src}
      alt={alt}
      width={500}
      height={500}
      className={className}
      unoptimized
      priority={priority}
      onError={() => setFailedSource(src)}
    />
  );
}
