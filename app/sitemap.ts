import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://st-village.example";
  const routes = ["", "/pricing", "/connect", "/status", "/news", "/support"];
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "/status" ? "hourly" : "weekly", priority: route === "" ? 1 : .7 }));
}
