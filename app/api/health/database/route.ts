import { databaseAvailable } from "@/src/server/storage/database";

export async function GET() {
  try {
    if (await databaseAvailable()) return Response.json({ status: "ok", dependency: "database" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // The public response intentionally contains no driver or schema details.
  }
  return Response.json({ status: "unavailable", dependency: "database", message: "Постоянное хранилище временно недоступно" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
