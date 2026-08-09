import { fetchLiveStatus } from "@/src/server/status/live-status";

export async function GET() {
  try {
    return Response.json(await fetchLiveStatus(), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120", "Content-Type": "application/json; charset=utf-8" } });
  } catch {
    return Response.json({ error: "live_status_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
  }
}
