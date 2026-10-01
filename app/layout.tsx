import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-devanagari";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { PlayerProvider } from "./context/PlayerContext";
import Player from "./components/Player";
import ServiceWorker from "./components/ServiceWorker";

export const metadata: Metadata = {
  title: "SMS Music — Discover your sound",
  description:
    "Fresh finds, familiar favorites. Discover Hindi and Marathi music, explore official track previews, and make a listening space of your own.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  applicationName: "SMS Music",
};

export const viewport: Viewport = {
  themeColor: "#131411",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>
          {children}
          <Player />
        </PlayerProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
