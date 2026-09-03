import { TELEGRAM_NEWS_CHANNEL, TELEGRAM_NEWS_URL } from "@/src/config/links";
import { checkRateLimit, rateLimitResponse } from "@/src/server/security/rate-limit";
import { siteBotUnauthorizedResponse, verifySiteBotRequest } from "@/src/server/security/site-bot-auth";
import { recordSiteAdminAudit, saveStoredTelegramNewsPost } from "@/src/server/storage/database";
import { sanitizeTelegramHtml } from "@/src/server/telegram/channel";
import type {
  StoredTelegramNewsMedia,
  StoredTelegramNewsPost,
  TelegramNewsButton,
  TelegramNewsMediaType,
  TelegramNewsPoll,
} from "@/src/server/telegram/types";

const MAX_BODY_BYTES = 256_000;
const mediaTypes = new Set<TelegramNewsMediaType>(["photo", "video", "animation", "document", "audio", "voice", "video_note", "sticker"]);

function finiteInteger(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : null;
}

function safeUrl(value: unknown) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:", "tg:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseButtons(value: unknown): TelegramNewsButton[] | null {
  if (!Array.isArray(value) || value.length > 24) return null;
  const buttons = value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const label = String(record.label || "").trim().slice(0, 80);
    const url = safeUrl(record.url);
    return label && url ? { label, url } : null;
  });
  return buttons.every(Boolean) ? buttons as TelegramNewsButton[] : null;
}

function parseMedia(value: unknown): StoredTelegramNewsMedia[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const media = value.map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const type = String(record.type || "") as TelegramNewsMediaType;
    const fileId = String(record.fileId || "").trim();
    const fileUniqueId = String(record.fileUniqueId || "").trim();
    if (!mediaTypes.has(type) || !/^[A-Za-z0-9_-]{8,512}$/.test(fileId) || !/^[A-Za-z0-9_-]{4,160}$/.test(fileUniqueId)) return null;
    return {
      id: `${type}-${fileUniqueId || index}`.slice(0, 190),
      type,
      fileId,
      fileUniqueId,
      mimeType: record.mimeType ? String(record.mimeType).slice(0, 120) : null,
      fileName: record.fileName ? String(record.fileName).replace(/[\r\n]/g, "").slice(0, 180) : null,
      width: finiteInteger(record.width, 1, 20_000),
      height: finiteInteger(record.height, 1, 20_000),
      duration: finiteInteger(record.duration, 0, 86_400),
      hasSpoiler: record.hasSpoiler === true,
    } satisfies StoredTelegramNewsMedia;
  });
  return media.every(Boolean) ? media as StoredTelegramNewsMedia[] : null;
}

function parsePoll(value: unknown): TelegramNewsPoll | null | false {
  if (value == null) return null;
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const question = String(record.question || "").trim().slice(0, 300);
  if (!question || !Array.isArray(record.options) || record.options.length < 2 || record.options.length > 12) return false;
  const options = record.options.map((item) => {
    const option = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const text = String(option.text || "").trim().slice(0, 120);
    const voterCount = finiteInteger(option.voterCount, 0, 2_000_000_000);
    return text && voterCount !== null ? { text, voterCount } : null;
  });
  if (!options.every(Boolean)) return false;
  return {
    question,
    options: options as TelegramNewsPoll["options"],
    totalVoterCount: finiteInteger(record.totalVoterCount, 0, 2_000_000_000) ?? 0,
    isClosed: record.isClosed === true,
    allowsMultipleAnswers: record.allowsMultipleAnswers === true,
  };
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, "site-bot-news", 120, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return Response.json({ error: "payload too large" }, { status: 413 });
  const actor = await verifySiteBotRequest(request, body);
  if (!actor) return siteBotUnauthorizedResponse();

  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const configuredChannel = (process.env.TELEGRAM_NEWS_CHANNEL || TELEGRAM_NEWS_CHANNEL).replace(/^@/, "").toLowerCase();
    const channel = String(payload.channel || "").replace(/^@/, "").toLowerCase();
    const id = String(payload.id || "").trim();
    const publishedAt = String(payload.publishedAt || "");
    const buttons = parseButtons(payload.buttons);
    const media = parseMedia(payload.media);
    const poll = parsePoll(payload.poll);
    const mediaGroupId = payload.mediaGroupId ? String(payload.mediaGroupId).trim().slice(0, 160) : null;
    if (channel !== configuredChannel || !/^\d{1,20}$/.test(id) || Number.isNaN(Date.parse(publishedAt))
      || buttons === null || media === null || poll === false || (mediaGroupId && !/^[A-Za-z0-9_-]{1,160}$/.test(mediaGroupId))) {
      return Response.json({ error: "invalid news payload" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const post: StoredTelegramNewsPost = {
      id,
      channel,
      url: `${TELEGRAM_NEWS_URL}/${id}`,
      html: sanitizeTelegramHtml(String(payload.html || "").slice(0, 50_000)),
      buttons,
      media,
      poll,
      mediaGroupId,
      publishedAt: new Date(publishedAt).toISOString(),
      updatedAt: now,
    };
    if (!post.html && post.media.length === 0 && !post.poll) return Response.json({ error: "empty news post" }, { status: 400 });

    const stored = await saveStoredTelegramNewsPost(post);
    await recordSiteAdminAudit({
      actorId: actor.id,
      action: "news.synced",
      entityType: "telegram_news",
      entityId: post.id,
      details: { channel: post.channel, media: post.media.length, edited: payload.edited === true },
    });
    return Response.json({ post: { id: post.id, url: post.url, updatedAt: post.updatedAt }, stored }, { status: stored ? 200 : 503 });
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
}
