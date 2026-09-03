import { TELEGRAM_NEWS_CHANNEL, TELEGRAM_NEWS_URL } from "@/src/config/links";
import { getStoredTelegramNewsPosts } from "@/src/server/storage/database";
import type { StoredTelegramNewsPost, TelegramPost } from "@/src/server/telegram/types";

export type { TelegramPost } from "@/src/server/telegram/types";

const TELEGRAM_PUBLIC_FEED_URL = `https://t.me/s/${TELEGRAM_NEWS_CHANNEL}`;
const CACHE_TTL_MS = 90_000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 2_000_000;

interface ChannelCache {
  expiresAt: number;
  posts: TelegramPost[];
}

export interface TelegramNewsSnapshot {
  channel: string;
  channelUrl: string;
  posts: TelegramPost[];
  updatedAt: string;
  nextBefore: string | null;
  hasMore: boolean;
}

const channelCache = new Map<string, ChannelCache>();
const pendingRequests = new Map<string, Promise<TelegramPost[]>>();
const MAX_CACHED_PAGES = 20;

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
    if (simpleTags.has(tag)) {
      if (tag === "blockquote" && !closing && /\bexpandable\b/i.test(attributes)) return '<blockquote class="tg-blockquote-expandable">';
      return closing ? `</${tag}>` : `<${tag}>`;
    }
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
    if (tag === "tg-spoiler") return closing ? "</span>" : '<span class="tg-spoiler" tabindex="0">';
    if (tag === "tg-emoji") return closing ? "</span>" : '<span class="tg-custom-emoji">';
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
    const unsupported = /message_media_not_supported_wrap/i.test(fragment);

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

    return [{ id, url: `${TELEGRAM_NEWS_URL}/${id}`, html: messageHtml, images, attachments: [], poll: null, publishedAt, views, buttons, unsupported, source: "public" }];
  });

  return [...new Map(posts.map((post) => [post.id, post])).values()]
    .sort((left, right) => Number(right.id) - Number(left.id));
}

function groupStoredPosts(posts: StoredTelegramNewsPost[]) {
  const groups = new Map<string, StoredTelegramNewsPost>();
  for (const post of posts) {
    const key = post.mediaGroupId ? `group:${post.mediaGroupId}` : `post:${post.id}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...post, buttons: [...post.buttons], media: [...post.media] });
      continue;
    }
    current.media = [...current.media, ...post.media].filter((media, index, all) => all.findIndex((item) => item.id === media.id) === index);
    if (!current.html && post.html) current.html = post.html;
    if (current.buttons.length === 0 && post.buttons.length) current.buttons = [...post.buttons];
    if (!current.poll && post.poll) current.poll = post.poll;
    if (post.publishedAt < current.publishedAt) current.publishedAt = post.publishedAt;
  }
  return [...groups.values()].sort((left, right) => Number(right.id) - Number(left.id));
}

function storedPostToPublic(post: StoredTelegramNewsPost): TelegramPost {
  const attachments = post.media.map((media) => ({
    id: media.id,
    type: media.type,
    url: `/api/news/media?post=${encodeURIComponent(post.id)}&media=${encodeURIComponent(media.id)}`,
    mimeType: media.mimeType,
    fileName: media.fileName,
    width: media.width,
    height: media.height,
    duration: media.duration,
    hasSpoiler: media.hasSpoiler,
  }));
  const images = attachments.filter((media) => media.type === "photo" || (media.type === "sticker" && media.mimeType !== "application/x-tgsticker"))
    .map((media, index) => ({ url: media.url, alt: `Изображение ${index + 1} из публикации ST VILLAGE` }));
  return {
    id: post.id,
    url: post.url,
    html: post.html,
    images,
    attachments,
    poll: post.poll,
    publishedAt: post.publishedAt,
    views: null,
    buttons: post.buttons,
    unsupported: false,
    source: "bot",
  };
}

function mergeNewsPosts(publicPosts: TelegramPost[], storedPosts: TelegramPost[]) {
  const merged = new Map(publicPosts.map((post) => [post.id, post]));
  for (const stored of storedPosts) {
    const publicPost = merged.get(stored.id);
    merged.set(stored.id, { ...stored, views: publicPost?.views ?? null });
  }
  return [...merged.values()].sort((left, right) => Number(right.id) - Number(left.id));
}

function getPublicFeedUrl(before?: number) {
  const url = new URL(TELEGRAM_PUBLIC_FEED_URL);
  if (before) url.searchParams.set("before", String(before));
  return url.toString();
}

async function fetchPosts(before?: number): Promise<TelegramPost[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(getPublicFeedUrl(before), {
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

async function getCachedPosts(before?: number): Promise<TelegramPost[]> {
  const now = Date.now();
  const cacheKey = before ? String(before) : "latest";
  const cached = channelCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.posts;
  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const request = fetchPosts(before).then((posts) => {
    channelCache.set(cacheKey, { posts, expiresAt: Date.now() + CACHE_TTL_MS });
    if (channelCache.size > MAX_CACHED_PAGES) channelCache.delete(channelCache.keys().next().value ?? "");
    return posts;
  }).finally(() => { pendingRequests.delete(cacheKey); });
  pendingRequests.set(cacheKey, request);
  return request;
}

export async function getTelegramNews(limit: number, before?: number): Promise<TelegramNewsSnapshot> {
  const safeLimit = Math.min(20, Math.max(1, Math.trunc(limit)));
  const [publicResult, storedResult] = await Promise.allSettled([
    getCachedPosts(before),
    getStoredTelegramNewsPosts(before, Math.max(50, safeLimit * 5)),
  ]);
  const publicPosts = publicResult.status === "fulfilled" ? publicResult.value : [];
  const storedPosts = storedResult.status === "fulfilled"
    ? groupStoredPosts(storedResult.value).map(storedPostToPublic)
    : [];
  if (publicPosts.length === 0 && storedPosts.length === 0 && publicResult.status === "rejected") throw publicResult.reason;
  const pagePosts = mergeNewsPosts(publicPosts, storedPosts);
  const posts = pagePosts.slice(0, safeLimit);
  return {
    channel: TELEGRAM_NEWS_CHANNEL,
    channelUrl: TELEGRAM_NEWS_URL,
    posts,
    updatedAt: new Date().toISOString(),
    nextBefore: posts.at(-1)?.id ?? null,
    hasMore: pagePosts.length >= safeLimit,
  };
}
