import "./globals.css";

import {
  PlayerProvider,
} from "./context/PlayerContext";

import Player
from "./components/Player";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">

      <body>

        <PlayerProvider>

          {children}

          {/* GLOBAL PLAYER */}
          <Player />

        </PlayerProvider>

      </body>
    </html>
  );
}