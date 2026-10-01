"use client";

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    const register = () => {
      // Offline support is optional; blocked registration must not break music.
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
