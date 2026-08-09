import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/config/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-08-02T00:00:00.000Z");
  const routes = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/pricing", changeFrequency: "daily", priority: .9 },
    { path: "/connect", changeFrequency: "weekly", priority: .85 },
    { path: "/status", changeFrequency: "hourly", priority: .8 },
    { path: "/news", changeFrequency: "daily", priority: .8 },
    { path: "/reviews", changeFrequency: "weekly", priority: .65 },
    { path: "/support", changeFrequency: "weekly", priority: .7 },
    { path: "/release", changeFrequency: "monthly", priority: .6 },
    { path: "/legal/privacy", changeFrequency: "monthly", priority: .3 },
    { path: "/legal/terms", changeFrequency: "monthly", priority: .3 },
  ] as const;
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: updated,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
