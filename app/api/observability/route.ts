import { getIncidents, getStatusHistory, type HistoryRange } from "@/src/server/storage/database";
import { getRegionalChecks } from "@/src/server/status/regional-checks";

const ranges = new Set<HistoryRange>(["24h", "7d", "30d"]);

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("range") as HistoryRange | null;
  const range = requested && ranges.has(requested) ? requested : "24h";
  const [history, incidents, regions] = await Promise.all([
    getStatusHistory(range),
    getIncidents(),
    getRegionalChecks(),
  ]);
  return Response.json({ range, history, incidents, regions, generatedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
  });
}

