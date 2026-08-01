import type { MetadataRoute } from "next";

const BRAND_ICON_VERSION = "2";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ST VILLAGE",
    short_name: "ST VILLAGE",
    description: "Защищённое подключение, личный кабинет, инструкции и поддержка ST VILLAGE.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0B0F14",
    theme_color: "#0B0F14",
    lang: "ru-RU",
    categories: ["utilities", "productivity"],
    icons: [
      { src: `/icon-192.png?v=${BRAND_ICON_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icon-512.png?v=${BRAND_ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
