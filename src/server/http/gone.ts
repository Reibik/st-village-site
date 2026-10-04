export function goneResponse(format: "page" | "json" = "json") {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (format === "page") return new Response(
    '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Раздел удалён — ST VILLAGE</title><main><h1>Раздел больше недоступен</h1><p>Этот раздел сайта удалён.</p><p><a href="/">На главную</a> · <a href="/support">Поддержка</a></p></main></html>',
    { status: 410, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
  );
  return Response.json({ error: "gone" }, { status: 410, headers });
}
