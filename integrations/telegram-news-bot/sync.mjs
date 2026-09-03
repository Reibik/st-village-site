import { createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { telegramMessageToNewsPayload } from "./telegram-format.mjs";

const botToken = (process.env.TELEGRAM_NEWS_BOT_TOKEN ?? "").trim();
const siteToken = (process.env.SITE_BOT_API_TOKEN ?? "").trim();
const actorId = (process.env.SITE_NEWS_ACTOR_ID ?? "").trim();
const channel = (process.env.TELEGRAM_NEWS_CHANNEL ?? "exitcloud_vpn").trim().replace(/^@/, "").toLowerCase();
const channelId = (process.env.TELEGRAM_NEWS_CHANNEL_ID ?? "").trim();
const siteUrl = (process.env.SITE_NEWS_SYNC_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const offsetFile = process.env.SITE_NEWS_OFFSET_FILE ?? "/opt/st-village-dev/data/telegram-news-offset.json";
const apiBase = `https://api.telegram.org/bot${botToken}`;

if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken) || siteToken.length < 32 || !/^\d{6,20}$/.test(actorId)) {
  throw new Error("Configure TELEGRAM_NEWS_BOT_TOKEN, SITE_BOT_API_TOKEN and SITE_NEWS_ACTOR_ID");
}

async function telegram(method, payload) {
  const response = await fetch(`${apiBase}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(40_000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram ${method}: ${result.description ?? response.status}`);
  return result.result;
}

async function loadOffset() {
  try {
    const state = JSON.parse(await readFile(offsetFile, "utf8"));
    return Number.isSafeInteger(state.offset) ? state.offset : 0;
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Cannot read news offset:", error.message);
    return 0;
  }
}

async function saveOffset(offset) {
  await mkdir(dirname(offsetFile), { recursive: true });
  const temporary = `${offsetFile}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ offset, updatedAt: new Date().toISOString() }), { mode: 0o600 });
  await rename(temporary, offsetFile);
}

async function syncPost(message, edited) {
  const username = (message.chat?.username ?? "").toLowerCase();
  if (username !== channel && (!channelId || String(message.chat?.id) !== channelId)) return;
  const path = "/api/bot-admin/news";
  const body = JSON.stringify(telegramMessageToNewsPayload(message, channel, edited));
  const timestamp = String(Math.floor(Date.now() / 1_000));
  const nonce = randomUUID();
  const canonical = [timestamp, nonce, "POST", path, body].join("\n");
  const signature = createHmac("sha256", siteToken).update(canonical).digest("hex");
  const response = await fetch(`${siteUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ST-Village-Bot-Actor": actorId,
      "X-ST-Village-Bot-Timestamp": timestamp,
      "X-ST-Village-Bot-Nonce": nonce,
      "X-ST-Village-Bot-Signature": signature,
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Website rejected post ${message.message_id}: HTTP ${response.status}`);
  console.log(`${edited ? "Updated" : "Synced"} channel post ${message.message_id}`);
}

async function main() {
  const identity = await telegram("getMe", {});
  console.log(`ST VILLAGE news sync started as @${identity.username ?? identity.id} for @${channel}`);
  let offset = await loadOffset();
  let delay = 1_000;
  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        limit: 50,
        timeout: 30,
        allowed_updates: ["channel_post", "edited_channel_post"],
      });
      for (const update of updates) {
        if (update.channel_post) await syncPost(update.channel_post, false);
        if (update.edited_channel_post) await syncPost(update.edited_channel_post, true);
        offset = update.update_id + 1;
        await saveOffset(offset);
      }
      delay = 1_000;
    } catch (error) {
      console.error("News synchronization error:", error.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30_000);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
