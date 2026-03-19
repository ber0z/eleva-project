import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eleva",
    short_name: "Eleva",
    description: "Acompanhe suas evoluções.",
    start_url: "/app/home",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    icons: [
      { src: "/imgs/eleva-192.png", sizes: "192x192", type: "image/png" },
      { src: "/imgs/eleva-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
