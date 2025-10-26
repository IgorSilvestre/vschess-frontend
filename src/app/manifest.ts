import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "vchess",
    short_name: "vchess",
    description: "Challenge the VS chess engine in a sleek PWA.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#10b981",
    lang: "en",
    categories: ["games"],
    orientation: "portrait",
    icons: [
      {
        src: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    shortcuts: [
      {
        name: "New vchess Match",
        url: "/",
        description: "Start a fresh game against the engine.",
      },
    ],
    prefer_related_applications: false,
  };
}
