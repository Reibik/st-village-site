import { collectStatus } from "@/src/server/status/collector";
import { notifyStatusChange } from "@/src/server/status/alerts";
import { recordStatusSnapshot } from "@/src/server/storage/database";

export async function GET() {
  const snapshot = await collectStatus();
  await Promise.allSettled([recordStatusSnapshot(snapshot), notifyStatusChange(snapshot)]);
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
