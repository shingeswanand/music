import "./globals.css";

import { PlayerProvider } from "./context/PlayerContext";

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
        </PlayerProvider>
      </body>
    </html>
  );
}