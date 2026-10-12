import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ForexPulse — Forex Intelligence Dashboard",
    short_name: "ForexPulse",
    description: "High-performance Forex intelligence dashboard for strict risk management, trade execution, and macroeconomic tracking.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#4d7cff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
