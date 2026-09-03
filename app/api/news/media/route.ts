import { findStoredTelegramNewsMedia } from "@/src/server/storage/database";

const ALLOWED_MEDIA_HOSTS = ["telegram.org", ".telesco.pe"];
const MAX_MEDIA_BYTES = 12_000_000;
const MAX_BOT_MEDIA_BYTES = 20_000_000;

function isAllowedMediaUrl(url: URL) {
  return url.protocol === "https:" && ALLOWED_MEDIA_HOSTS.some((host) => host.startsWith(".") ? url.hostname.endsWith(host) : url.hostname === host);
}

async function proxyPublicImage(rawUrl: string) {
  const mediaUrl = new URL(rawUrl);
  if (!isAllowedMediaUrl(mediaUrl)) return new Response("Media host is not allowed", { status: 403 });

  const response = await fetch(mediaUrl, {
    headers: { Accept: "image/avif,image/webp,image/jpeg,image/png,image/*", Referer: "https://t.me/", "User-Agent": "ST-VILLAGE-News/1.2" },
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
}

function safeFileName(value: string | null) {
  return (value || "telegram-file").replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 160) || "telegram-file";
}

async function proxyBotMedia(request: Request, postId: string, mediaId: string) {
  if (!/^\d{1,20}$/.test(postId) || !/^[A-Za-z0-9_-]{4,190}$/.test(mediaId)) return new Response("Invalid media reference", { status: 400 });
  const media = await findStoredTelegramNewsMedia(postId, mediaId);
  if (!media) return new Response("Media was not found", { status: 404 });
  const token = (process.env.TELEGRAM_NEWS_BOT_TOKEN || process.env.STATUS_ALERT_TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) return new Response("Telegram media proxy is not configured", { status: 503 });

  const fileResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(media.fileId)}`, {
    headers: { Accept: "application/json" },
    redirect: "error",
  });
  if (!fileResponse.ok) return new Response("Telegram file is unavailable", { status: 502 });
  const result = await fileResponse.json() as { ok?: boolean; result?: { file_path?: string; file_size?: number } };
  const filePath = result.result?.file_path ?? "";
  if (!result.ok || !filePath || filePath.includes("..") || (result.result?.file_size ?? 0) > MAX_BOT_MEDIA_BYTES) {
    return new Response("Telegram file is unavailable", { status: (result.result?.file_size ?? 0) > MAX_BOT_MEDIA_BYTES ? 413 : 502 });
  }

  const range = request.headers.get("range");
  const telegramResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
    headers: range ? { Range: range } : undefined,
    redirect: "error",
  });
  if (!telegramResponse.ok || !telegramResponse.body) return new Response("Telegram media is unavailable", { status: 502 });
  const contentLength = Number(telegramResponse.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BOT_MEDIA_BYTES) return new Response("Media is too large", { status: 413 });
  const headers = new Headers({
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "Content-Type": telegramResponse.headers.get("content-type") || media.mimeType || "application/octet-stream",
    "Content-Disposition": `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${safeFileName(media.fileName)}"`,
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = telegramResponse.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(telegramResponse.body, { status: telegramResponse.status, headers });
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawUrl = params.get("url");
    if (rawUrl) return proxyPublicImage(rawUrl);
    const postId = params.get("post");
    const mediaId = params.get("media");
    if (!postId || !mediaId) return new Response("Missing media reference", { status: 400 });
    return proxyBotMedia(request, postId, mediaId);
  } catch {
    return new Response("Media is unavailable", { status: 502 });
  }
}
