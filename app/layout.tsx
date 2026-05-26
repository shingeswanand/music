import "./globals.css";

import type { Metadata }
from "next";

import {
  PlayerProvider,
} from "./context/PlayerContext";

import Player
from "./components/Player";

export const metadata: Metadata = {
  title: "Music App",
  description:
    "Spotify-style music streaming app",

  manifest: "/manifest.json",

  themeColor: "#000000",

  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html
      lang="en"
      suppressHydrationWarning
    >

      <body
        className="bg-black text-white overflow-x-hidden"
      >

        <PlayerProvider>

          {/* PAGES */}
          {children}

          {/* GLOBAL PLAYER */}
          <Player />

        </PlayerProvider>

      </body>
    </html>
  );
}