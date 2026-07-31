import { getTelegramNews } from "@/src/server/telegram/channel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 8;
  try {
    const snapshot = await getTelegramNews(limit);
    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=90, stale-while-revalidate=600",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return Response.json(
      { status: "unavailable", message: "Лента Telegram временно недоступна." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
