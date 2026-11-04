import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Parami – Quản lý thiện pháp",
    short_name: "Parami",
    description: "Quản lý thiện pháp và phân loại sao kê VIB.",
    lang: "vi",
    start_url: "/?pwa=4",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#92400e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
