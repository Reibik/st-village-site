import { collectStatus } from "@/src/server/status/collector";

export async function GET() {
  const snapshot = await collectStatus();
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
