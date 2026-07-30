import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://st-village.example";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/login", "/dashboard", "/admin", "/api/"] }, sitemap: `${base}/sitemap.xml` };
}
