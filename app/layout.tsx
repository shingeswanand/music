import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-devanagari";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { PlayerProvider } from "./context/PlayerContext";
import Player from "./components/Player";
import { DiscoveryProvider } from "./context/DiscoveryContext";
import ServiceWorker from "./components/ServiceWorker";

export const metadata: Metadata = {
  title: "SMS Music — Discover your sound",
  description:
    "Fresh finds, familiar favorites. Discover Hindi and Marathi music, stream full YouTube tracks and official previews, and make a listening space of your own.",
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
          <DiscoveryProvider>
            {children}
            <Player />
          </DiscoveryProvider>
        </PlayerProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
