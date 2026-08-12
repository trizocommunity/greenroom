import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Greenroom",
    short_name: "Greenroom",
    description:
      "A premium, reliable platform to run large-scale festivals without chaos.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#d72626",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
