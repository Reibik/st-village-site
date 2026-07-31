const ALLOWED_MEDIA_HOSTS = ["telegram.org", ".telesco.pe"];
const MAX_MEDIA_BYTES = 12_000_000;

function isAllowedMediaUrl(url: URL) {
  return url.protocol === "https:" && ALLOWED_MEDIA_HOSTS.some((host) => host.startsWith(".") ? url.hostname.endsWith(host) : url.hostname === host);
}

export async function GET(request: Request) {
  try {
    const rawUrl = new URL(request.url).searchParams.get("url");
    if (!rawUrl) return new Response("Missing media URL", { status: 400 });
    const mediaUrl = new URL(rawUrl);
    if (!isAllowedMediaUrl(mediaUrl)) return new Response("Media host is not allowed", { status: 403 });

    const response = await fetch(mediaUrl, {
      headers: { Accept: "image/avif,image/webp,image/jpeg,image/png,image/*", Referer: "https://t.me/", "User-Agent": "ST-VILLAGE-News/1.1" },
      redirect: "follow",
    });
    if (!response.ok) return new Response("Media is unavailable", { status: 502 });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return new Response("Unsupported media type", { status: 415 });
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_MEDIA_BYTES) return new Response("Media is too large", { status: 413 });
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_MEDIA_BYTES) return new Response("Media is too large", { status: 413 });

    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Media is unavailable", { status: 502 });
  }
}
