import { getActiveSiteAnnouncements } from "@/src/server/storage/database";

export async function GET() {
  return Response.json({ announcements: await getActiveSiteAnnouncements() }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
