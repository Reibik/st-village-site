import { TELEGRAM_NEWS_CHANNEL, TELEGRAM_NEWS_URL } from "@/src/config/links";

const TELEGRAM_PUBLIC_FEED_URL = `https://t.me/s/${TELEGRAM_NEWS_CHANNEL}`;
const CACHE_TTL_MS = 90_000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 2_000_000;

interface ChannelCache {
  expiresAt: number;
  posts: TelegramPost[];
}

export interface TelegramPost {
  id: string;
  url: string;
  html: string;
  images: Array<{ url: string; alt: string }>;
  publishedAt: string | null;
  views: string | null;
  buttons: Array<{ label: string; url: string }>;
}

export interface TelegramNewsSnapshot {
  channel: string;
  channelUrl: string;
  posts: TelegramPost[];
  updatedAt: string;
}

let channelCache: ChannelCache | undefined;
let pendingRequest: Promise<TelegramPost[]> | undefined;

function decodeHtmlAttribute(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"');
}

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function normalizeTelegramLink(rawHref: string): string | null {
  try {
    const href = decodeHtmlAttribute(rawHref.trim());
    const url = new URL(href, TELEGRAM_PUBLIC_FEED_URL);
    if (!["http:", "https:", "tg:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isAllowedTelegramMedia(rawUrl: string) {
  try {
    const url = new URL(decodeHtmlAttribute(rawUrl));
    return url.protocol === "https:" && (url.hostname === "telegram.org" || url.hostname.endsWith(".telesco.pe"));
  } catch {
    return false;
  }
}

export function sanitizeTelegramHtml(input: string): string {
  const withoutExecutableBlocks = input.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  const simpleTags = new Set(["b", "strong", "i", "em", "u", "s", "strike", "del", "code", "pre", "blockquote"]);

  return withoutExecutableBlocks.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (source, rawTag: string, attributes: string) => {
    const tag = rawTag.toLowerCase();
    const closing = source.startsWith("</");
    if (tag === "br") return "<br>";
    if (simpleTags.has(tag)) return closing ? `</${tag}>` : `<${tag}>`;
    if (tag === "a") {
      if (closing) return "</a>";
      const match = attributes.match(/\bhref=(?:"([^"]*)"|'([^']*)')/i);
      const href = normalizeTelegramLink(match?.[1] ?? match?.[2] ?? "");
      return href ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">` : "";
    }
    if (tag === "span") {
      if (closing) return "</span>";
      return /\bclass=(?:"[^"]*tg-spoiler[^"]*"|'[^']*tg-spoiler[^']*')/i.test(attributes) ? '<span class="tg-spoiler">' : "<span>";
    }
    return "";
  }).trim();
}

function stripMarkup(input: string) {
  return input.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractPostFragments(html: string) {
  const starts = Array.from(html.matchAll(/<div class="tgme_widget_message_wrap\b/g), (match) => match.index ?? 0);
  return starts.map((start, index) => html.slice(start, starts[index + 1] ?? html.length));
}

export function extractTelegramPosts(html: string): TelegramPost[] {
  const posts = extractPostFragments(html).flatMap((fragment): TelegramPost[] => {
    const idMatch = fragment.match(new RegExp(`data-post=["']${TELEGRAM_NEWS_CHANNEL}/(\\d+)["']`));
    if (!idMatch) return [];

    const id = idMatch[1];
    const messageMatch = fragment.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i);
    const messageHtml = sanitizeTelegramHtml(messageMatch?.[1] ?? "");
    const publishedAt = fragment.match(/<time[^>]+datetime="([^"]+)"/i)?.[1] ?? null;
    const views = stripMarkup(fragment.match(/<span class="tgme_widget_message_views">([\s\S]*?)<\/span>/i)?.[1] ?? "") || null;

    const mediaUrls = [
      ...Array.from(fragment.matchAll(/tgme_widget_message_photo_wrap[^>]+background-image:url\('([^']+)'\)/gi), (match) => match[1]),
      ...Array.from(fragment.matchAll(/<video[^>]+poster="([^"]+)"/gi), (match) => match[1]),
    ].filter(isAllowedTelegramMedia);
    const images = [...new Set(mediaUrls)].slice(0, 4).map((mediaUrl, index) => ({
      url: decodeHtmlAttribute(mediaUrl),
      alt: `Изображение ${index + 1} из публикации ST VILLAGE`,
    }));

    const buttons = Array.from(fragment.matchAll(/<a class="[^"]*tgme_widget_message_inline_button[^"]*"[^>]+href="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi))
      .flatMap((match) => {
        const url = normalizeTelegramLink(match[1]);
        const label = stripMarkup(match[2]);
        return url && label ? [{ label, url }] : [];
      })
      .slice(0, 4);

    return [{ id, url: `${TELEGRAM_NEWS_URL}/${id}`, html: messageHtml, images, publishedAt, views, buttons }];
  });

  return [...new Map(posts.map((post) => [post.id, post])).values()]
    .sort((left, right) => Number(right.id) - Number(left.id));
}

async function fetchPosts(): Promise<TelegramPost[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(TELEGRAM_PUBLIC_FEED_URL, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "ST-VILLAGE-News/1.1 (+https://stvillage.top/news)" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error("Telegram response is too large");
    const html = await response.text();
    if (html.length > MAX_RESPONSE_BYTES) throw new Error("Telegram response is too large");
    const posts = extractTelegramPosts(html);
    if (posts.length === 0) throw new Error("Telegram feed contains no public posts");
    return posts;
  } finally {
    clearTimeout(timeout);
  }
}

async function getCachedPosts(): Promise<TelegramPost[]> {
  const now = Date.now();
  if (channelCache && channelCache.expiresAt > now) return channelCache.posts;
  if (pendingRequest) return pendingRequest;
  pendingRequest = fetchPosts().then((posts) => {
    channelCache = { posts, expiresAt: Date.now() + CACHE_TTL_MS };
    return posts;
  }).finally(() => { pendingRequest = undefined; });
  return pendingRequest;
}

export async function getTelegramNews(limit: number): Promise<TelegramNewsSnapshot> {
  const safeLimit = Math.min(12, Math.max(1, Math.trunc(limit)));
  return {
    channel: TELEGRAM_NEWS_CHANNEL,
    channelUrl: TELEGRAM_NEWS_URL,
    posts: (await getCachedPosts()).slice(0, safeLimit),
    updatedAt: new Date().toISOString(),
  };
}
