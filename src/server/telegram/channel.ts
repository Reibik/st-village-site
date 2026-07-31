import { TELEGRAM_NEWS_CHANNEL, TELEGRAM_NEWS_URL } from "@/src/config/links";

const TELEGRAM_PUBLIC_FEED_URL = `https://t.me/s/${TELEGRAM_NEWS_CHANNEL}`;
const CACHE_TTL_MS = 90_000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 2_000_000;

interface ChannelCache {
  expiresAt: number;
  postIds: string[];
}

let channelCache: ChannelCache | undefined;
let pendingRequest: Promise<string[]> | undefined;

export interface TelegramNewsSnapshot {
  channel: string;
  channelUrl: string;
  posts: Array<{ id: string; url: string }>;
  updatedAt: string;
}

export function extractTelegramPostIds(html: string): string[] {
  const escapedChannel = TELEGRAM_NEWS_CHANNEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`data-post=["']${escapedChannel}/(\\d+)["']`, "g");
  const ids = Array.from(html.matchAll(matcher), (match) => match[1]);
  return [...new Set(ids)].sort((left, right) => Number(right) - Number(left));
}

async function fetchPostIds(): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(TELEGRAM_PUBLIC_FEED_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "ST-VILLAGE-News/1.0 (+https://stvillage.ru/news)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error("Telegram response is too large");
    const html = await response.text();
    if (html.length > MAX_RESPONSE_BYTES) throw new Error("Telegram response is too large");
    const postIds = extractTelegramPostIds(html);
    if (postIds.length === 0) throw new Error("Telegram feed contains no public posts");
    return postIds;
  } finally {
    clearTimeout(timeout);
  }
}

async function getCachedPostIds(): Promise<string[]> {
  const now = Date.now();
  if (channelCache && channelCache.expiresAt > now) return channelCache.postIds;
  if (pendingRequest) return pendingRequest;

  pendingRequest = fetchPostIds()
    .then((postIds) => {
      channelCache = { postIds, expiresAt: Date.now() + CACHE_TTL_MS };
      return postIds;
    })
    .finally(() => {
      pendingRequest = undefined;
    });
  return pendingRequest;
}

export async function getTelegramNews(limit: number): Promise<TelegramNewsSnapshot> {
  const safeLimit = Math.min(12, Math.max(1, Math.trunc(limit)));
  const postIds = (await getCachedPostIds()).slice(0, safeLimit);
  return {
    channel: TELEGRAM_NEWS_CHANNEL,
    channelUrl: TELEGRAM_NEWS_URL,
    posts: postIds.map((id) => ({ id, url: `${TELEGRAM_NEWS_URL}/${id}` })),
    updatedAt: new Date().toISOString(),
  };
}
