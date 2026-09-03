import { getTelegramNews } from "@/src/server/telegram/channel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 12;
  const beforeValue = url.searchParams.get("before");
  if (beforeValue && !/^\d+$/.test(beforeValue)) {
    return Response.json({ status: "invalid_request", message: "Некорректный указатель страницы." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const before = beforeValue ? Number(beforeValue) : undefined;
  try {
    const snapshot = await getTelegramNews(limit, before);
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
