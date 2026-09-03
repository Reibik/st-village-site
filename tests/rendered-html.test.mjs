import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

process.env.STATUS_PROBE_TIMEOUT_MS = "500";
process.env.STATUS_REGIONAL_CHECKS_DISABLED = "1";
process.env.SITE_BOT_API_TOKEN = "test-site-bot-token-with-at-least-32-bytes";
process.env.SITE_BOT_ADMIN_IDS = "274813568";
process.env.TELEGRAM_NEWS_BOT_TOKEN = "123456:test-telegram-news-token";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };

async function signedBotRequest(path, options = {}) {
  const method = options.method ?? "GET";
  const body = options.body ?? "";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const canonical = [timestamp, nonce, method, path, body].join("\n");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.SITE_BOT_API_TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request(`http://localhost${path}`, { ...options, method, body: body || undefined, headers: {
    "content-type": "application/json", "x-st-village-bot-actor": "274813568",
    "x-st-village-bot-timestamp": timestamp, "x-st-village-bot-nonce": nonce, "x-st-village-bot-signature": signature,
  } });
}

test("server-renders the ST VILLAGE public home page", async () => {
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-st-village-release"), "1.2.0");
  assert.equal(response.headers.get("x-st-village-channel"), "stable");

  const html = await response.text();
  assert.match(html, /<html lang="ru"/i);
  assert.match(html, /ST VILLAGE/);
  assert.match(html, /Стабильное подключение/);
  assert.match(html, /Открыть личный кабинет/);
  assert.match(html, /https:\/\/cabinet\.stvillage\.top/);
  assert.match(html, /https:\/\/t\.me\/st_village_vpn_bot/);
  assert.match(html, /class="footer-version"[^>]*>v(?:<!-- -->)?1\.2\.0<\/a>/);
  assert.match(html, /href="\/release"/);
  assert.match(html, /Попробуйте ST VILLAGE перед оплатой/);
  assert.match(html, /5 ГБ/);
  assert.match(html, /Белые списки — только на платных тарифах/);
  assert.match(html, /Купонный дроп/);
  assert.match(html, /href="\/coupons"/);
  assert.match(html, /<source srcSet="\/brand-emblem\.avif" type="image\/avif"/);
  assert.match(html, /<source srcSet="\/brand-emblem\.webp" type="image\/webp"/);
  assert.match(html, /src="\/brand-emblem\.png"/);
  assert.doesNotMatch(html, /_vinext\/image/);
  assert.doesNotMatch(html, /— мс/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|lorem ipsum/i);
  assert.doesNotMatch(html, /\bVPN\b/i);
});

test("home infrastructure is presented as a live network", async () => {
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, context);
  const html = await response.text();
  const component = await readFile(new URL("../src/features/status/home-network-showcase.tsx", import.meta.url), "utf8");

  assert.match(html, /class="network-showcase"/);
  assert.match(html, /Европа рядом/);
  assert.match(html, /ST VILLAGE NETWORK/);
  assert.match(html, /href="\/status"/);
  assert.match(component, /fetch\("\/api\/live-status"/);
  assert.match(component, /setInterval\([^]*60_000/);
});

test("all public pages render their expected content", async () => {
  const pages = [
    ["/pricing", "Выберите удобный тариф"],
    ["/coupons", "Купонный дроп ST VILLAGE"],
    ["/connect", "Happ и INCY — два основных приложения"],
    ["/status", "Состояние инфраструктуры"],
    ["/news", "Новости ST VILLAGE"],
    ["/reviews", "Честная обратная связь"],
    ["/support", "Помощь, когда она нужна"],
    ["/release", "Живой мониторинг и надёжная эксплуатация"],
    ["/legal/privacy", "Политика конфиденциальности 🚀ST VILLAGE🚀"],
    ["/legal/terms", "Публичная оферта сервиса 🚀ST VILLAGE🚀"],
  ];
  for (const [path, heading] of pages) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, path);
    const html = await response.text();
    assert.match(html, new RegExp(`<h1[^>]*>${heading}</h1>`), path);
    if (path === "/connect") {
      assert.match(html, />Happ</);
      assert.match(html, />INCY</);
      assert.match(html, /https:\/\/www\.happ\.su\/main/);
      assert.match(html, /https:\/\/incy\.cc\//);
      assert.match(html, /Только официальные версии/);
    }
    if (path === "/news") {
      assert.match(html, /Автоматическое обновление/);
      assert.match(html, /https:\/\/t\.me\/exitcloud_vpn/);
    }
    if (path.startsWith("/legal/")) {
      assert.match(html, /@st_village_vpn_bot/);
      assert.doesNotMatch(html, /Черновая структура|Требуется юридическая редакция/);
    }
    assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|lorem ipsum/i, path);
  }
});

test("coupon drop exposes only the current scheduled gift", async () => {
  const response = await worker.fetch(new Request("http://localhost/api/coupons/current"), env, context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  const payload = await response.json();
  assert.match(payload.status, /^(active|upcoming|ended)$/);
  assert.equal(payload.totalDrops, 5);
  assert.equal(typeof payload.dropNumber, "number");
  assert.equal(payload.botUrl, "https://t.me/st_village_vpn_bot");
  if (payload.status === "active") {
    assert.match(payload.couponUrl, /^https:\/\/t\.me\/st_village_vpn_bot\?start=coupon_[a-z0-9]+$/i);
  } else {
    assert.equal(payload.couponUrl, null);
  }
  assert.equal((JSON.stringify(payload).match(/coupon_[a-z0-9]+/gi) ?? []).length <= 1, true);
});

test("system routes, redirect and not-found responses are valid", async () => {
  for (const path of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/.well-known/security.txt"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`), env, context);
    assert.equal(response.status, 200, path);
  }
  const login = await worker.fetch(new Request("http://localhost/login", { redirect: "manual" }), env, context);
  assert.match(String(login.status), /^30[78]$/);
  assert.equal(login.headers.get("location"), "https://cabinet.stvillage.top/");

  const missing = await worker.fetch(new Request("http://localhost/definitely-not-found", { headers: { accept: "text/html" } }), env, context);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Такой страницы нет/);
});

test("health endpoint reports the web process without exposing internals", async () => {
  const response = await worker.fetch(new Request("http://localhost/api/health"), env, context);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "st-village-web");
  assert.equal(typeof payload.timestamp, "string");
});

test("version endpoint detects a newer deployment without being cached", async () => {
  const current = await worker.fetch(new Request("http://localhost/api/version"), env, context);
  assert.equal(current.status, 200);
  assert.match(current.headers.get("cache-control") ?? "", /no-store/i);
  const currentPayload = await current.json();
  assert.equal(typeof currentPayload.version, "string");
  assert.equal(currentPayload.version.length > 0, true);
  assert.equal(currentPayload.release, "1.2.0");
  assert.equal(currentPayload.channel, "stable");
  assert.equal(currentPayload.releaseName, "Мониторинг и качество");
  assert.equal(currentPayload.updateAvailable, false);

  const stale = await worker.fetch(new Request("http://localhost/api/version?current=previous-build"), env, context);
  assert.equal(stale.status, 200);
  assert.equal((await stale.json()).updateAvailable, true);
});

test("website bot API requires signed admin requests and publishes announcements", async () => {
  const unauthorized = await worker.fetch(new Request("http://localhost/api/bot-admin/announcements"), env, context);
  assert.equal(unauthorized.status, 401);
  const oneTimeRequest = await signedBotRequest("/api/bot-admin/announcements");
  assert.equal((await worker.fetch(oneTimeRequest.clone(), env, context)).status, 200);
  assert.equal((await worker.fetch(oneTimeRequest.clone(), env, context)).status, 401);

  const payload = {
    kind: "update", title: "Новая функция сайта", message: "Проверяем красивое объявление из Telegram-бота.",
    placement: "all", state: "published", dismissible: true, startsAt: new Date(Date.now() - 1000).toISOString(),
  };
  const body = JSON.stringify(payload);
  const create = await worker.fetch(await signedBotRequest("/api/bot-admin/announcements", { method: "POST", body }), env, context);
  assert.equal([200, 503].includes(create.status), true);
  const created = await create.json();
  assert.equal(created.announcement.title, payload.title);
  assert.equal(created.announcement.state, "published");

  const publicResponse = await worker.fetch(new Request("http://localhost/api/announcements"), env, context);
  assert.equal(publicResponse.status, 200);
  const publicPayload = await publicResponse.json();
  assert.equal(publicPayload.announcements.some((item) => item.title === payload.title), true);

  const integration = await readFile(new URL("../integrations/bedolaga-site-admin/app/handlers/admin/site_management.py", import.meta.url), "utf8");
  const client = await readFile(new URL("../integrations/bedolaga-site-admin/app/services/site_admin_api.py", import.meta.url), "utf8");
  assert.match(integration, /site_admin_announcement_publish/);
  assert.match(integration, /site_admin_incident_resolve/);
  assert.match(client, /X-ST-Village-Bot-Signature/);
  assert.doesNotMatch(client, /verify=False/);
});

test("status endpoint returns a sanitized live snapshot", async () => {
  const response = await worker.fetch(new Request("http://localhost/api/status"), env, context);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.match(payload.status, /^(operational|degraded|outage|maintenance|unknown)$/);
  assert.equal(Array.isArray(payload.services), true);
  assert.equal(Array.isArray(payload.locations), true);
  assert.equal(payload.refreshAfterSeconds, 30);
  assert.equal(payload.locations.every((location) => !("latencyMs" in location)), true);
  assert.doesNotMatch(JSON.stringify(payload), /REMNAWAVE_API_TOKEN|probeUrl|remnawaveUuid|Authorization/i);
});

test("unconfigured integrations fail honestly", async () => {
  const storageResponse = await worker.fetch(new Request("http://localhost/api/health/database"), env, context);
  assert.equal([200, 503].includes(storageResponse.status), true);
  const storagePayload = await storageResponse.json();
  assert.equal(storagePayload.status, storageResponse.status === 200 ? "ok" : "unavailable");
  assert.doesNotMatch(JSON.stringify(storagePayload), /stack|password|token/i);

  const remnawaveResponse = await worker.fetch(new Request("http://localhost/api/health/remnawave"), env, context);
  assert.equal(remnawaveResponse.status, 503);
  const remnawavePayload = await remnawaveResponse.json();
  assert.equal(remnawavePayload.status, "unavailable");
  assert.doesNotMatch(JSON.stringify(remnawavePayload), /stack|password|token/i);
});

test("live status proxy returns a compact sanitized summary", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://status.stvillage.ru/api/summary") {
      assert.equal(init?.headers?.accept, "application/json");
      return Response.json({
        lastCheckTs: 1786044398,
        pollInterval: 300,
        totals: { online: 1, total: 2, maintenance: 0, uptime30: 99.5, avgLatency: 83 },
        servers: [
          { sid: "de-1", name: "Германия #1", cc: "de", online: true, maintenance: false, uptime30: 100, latencyMs: 83, members: 1, membersOnline: 1, days: [{ private: "history" }] },
          { sid: "lte", name: "LTE", cc: "", online: false, maintenance: false, uptime30: 0, latencyMs: 0, members: 1, membersOnline: 0 },
        ],
        incidents: [{ id: 1, title: "Проверка", severity: "minor", status: "monitoring", startedTs: 1786040000, affected: [{ name: "LTE", cc: "" }], updates: [{ body: "Наблюдаем" }] }],
        secret: "must-not-leak",
      });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/live-status"), env, context);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=30/);
    const payload = await response.json();
    assert.equal(payload.status, "degraded");
    assert.equal(payload.refreshAfterSeconds, 60);
    assert.equal(payload.servers.length, 2);
    assert.equal(payload.servers[0].countryCode, "DE");
    assert.equal(payload.servers[1].latencyMs, null);
    assert.equal(payload.incidents[0].latestUpdate, "Наблюдаем");
    assert.doesNotMatch(JSON.stringify(payload), /must-not-leak|days|private/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("connection center uses official Happ and INCY downloads for every platform", async () => {
  const config = await readFile(new URL("../src/config/connection-apps.ts", import.meta.url), "utf8");
  const wizard = await readFile(new URL("../src/features/connect/connection-wizard.tsx", import.meta.url), "utf8");
  for (const officialHost of ["www.happ.su", "apps.apple.com", "play.google.com", "github.com/Happ-proxy", "incy.cc", "github.com/INCY-DEV"]) {
    assert.match(config, new RegExp(officialHost.replaceAll(".", "\\.")), officialHost);
  }
  for (const platform of ["ios", "android", "windows", "macos", "linux", "android-tv"]) {
    assert.match(config, new RegExp(`(?:id: )?"${platform}"`), platform);
  }
  assert.match(wizard, /detectDevice\(\)/);
  assert.match(wizard, /support_\$\{deviceId\.replace/);
  assert.match(wizard, /Типовые ошибки/);
  assert.match(wizard, /Добавьте подписку из кабинета/);
});

test("Telegram news integration uses the public channel without exposing credentials", async () => {
  const route = await readFile(new URL("../app/api/news/route.ts", import.meta.url), "utf8");
  const channel = await readFile(new URL("../src/server/telegram/channel.ts", import.meta.url), "utf8");
  const feed = await readFile(new URL("../src/features/news/telegram-news-feed.tsx", import.meta.url), "utf8");
  const card = await readFile(new URL("../src/features/news/telegram-post-card.tsx", import.meta.url), "utf8");
  const caddy = await readFile(new URL("../ops/vps/Caddyfile", import.meta.url), "utf8");

  assert.match(channel, /https:\/\/t\.me\/s\//);
  assert.match(channel, /data-post=/);
  assert.match(channel, /MAX_RESPONSE_BYTES/);
  assert.match(channel, /sanitizeTelegramHtml/);
  assert.match(channel, /decodeHtmlAttribute\(mediaUrl\)/);
  assert.match(route, /s-maxage=90/);
  assert.match(feed, /REFRESH_INTERVAL_MS/);
  assert.match(route, /beforeValue/);
  assert.match(channel, /searchParams\.set\("before"/);
  assert.match(channel, /message_media_not_supported_wrap/);
  assert.match(feed, /Показать ещё новости/);
  assert.match(card, /Публикация доступна в Telegram/);
  assert.match(feed, /mergePosts/);
  assert.match(card, /dangerouslySetInnerHTML/);
  assert.match(caddy, /img-src[^\n]+https:\/\/\*\.telesco\.pe/);
  assert.doesNotMatch(caddy, /script-src[^;\n]+telegram\.org|frame-src/);
  assert.doesNotMatch(`${route}${channel}${feed}${card}`, /BOT_TOKEN|Authorization:|api\.telegram\.org/);
});

test("Telegram news API paginates older channel posts without exposing the whole archive", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://t.me/s/exitcloud_vpn?before=191") {
      assert.equal(init?.headers?.Accept, "text/html,application/xhtml+xml");
      return new Response(`
        <div class="tgme_widget_message_wrap"><div data-post="exitcloud_vpn/188"><div class="message_media_not_supported_wrap">Открыть в Telegram</div><time datetime="2026-08-01T10:00:00+00:00"></time></div></div>
        <div class="tgme_widget_message_wrap"><div data-post="exitcloud_vpn/189"><div class="tgme_widget_message_text">Следующая новость</div><time datetime="2026-08-02T10:00:00+00:00"></time></div></div>
      `, { headers: { "content-type": "text/html" } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/news?limit=2&before=191"), env, context);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.posts.map((post) => post.id), ["189", "188"]);
    assert.equal(payload.posts[1].unsupported, true);
    assert.equal(payload.nextBefore, "188");
    assert.equal(payload.hasMore, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const invalid = await worker.fetch(new Request("http://localhost/api/news?before=not-a-number"), env, context);
  assert.equal(invalid.status, 400);
});

test("signed bot updates mirror rich Telegram posts and proxy their media", async () => {
  const newsPayload = {
    id: "9001",
    channel: "exitcloud_vpn",
    html: '<b>Важная новость</b><br><tg-spoiler>секрет</tg-spoiler>',
    buttons: [{ label: "Открыть кабинет", url: "https://cabinet.stvillage.top/" }],
    media: [{
      type: "video", fileId: "BAACAgIAAxkBAAIBexample_file_id", fileUniqueId: "AgADexample_unique",
      mimeType: "video/mp4", fileName: "update.mp4", width: 1280, height: 720, duration: 12, hasSpoiler: false,
    }],
    poll: { question: "Всё нравится?", options: [{ text: "Да", voterCount: 8 }, { text: "Очень", voterCount: 2 }], totalVoterCount: 10, isClosed: false, allowsMultipleAnswers: false },
    mediaGroupId: null,
    publishedAt: "2026-09-03T12:00:00+00:00",
    edited: false,
  };
  const body = JSON.stringify(newsPayload);
  const create = await worker.fetch(await signedBotRequest("/api/bot-admin/news", { method: "POST", body }), env, context);
  assert.equal([200, 503].includes(create.status), true);
  assert.equal((await create.json()).post.id, "9001");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === "https://t.me/s/exitcloud_vpn?before=9002") {
      return new Response('<div class="tgme_widget_message_wrap"><div data-post="exitcloud_vpn/1"><div class="tgme_widget_message_text">Архив</div></div></div>', { headers: { "content-type": "text/html" } });
    }
    if (url.includes("/getFile?file_id=")) {
      assert.match(url, /^https:\/\/api\.telegram\.org\/bot123456:test-telegram-news-token\/getFile/);
      return Response.json({ ok: true, result: { file_path: "videos/update.mp4", file_size: 4 } });
    }
    if (url.includes("/file/bot123456:test-telegram-news-token/videos/update.mp4")) {
      return new Response(new Uint8Array([0, 0, 0, 1]), { headers: { "content-type": "video/mp4", "content-length": "4", "accept-ranges": "bytes" } });
    }
    return originalFetch(input);
  };
  try {
    const news = await worker.fetch(new Request("http://localhost/api/news?limit=2&before=9002"), env, context);
    assert.equal(news.status, 200);
    const payload = await news.json();
    assert.equal(payload.posts[0].id, "9001");
    assert.equal(payload.posts[0].source, "bot");
    assert.match(payload.posts[0].html, /class="tg-spoiler"/);
    assert.equal(payload.posts[0].attachments[0].type, "video");
    assert.equal(payload.posts[0].poll.totalVoterCount, 10);

    const media = await worker.fetch(new Request(`http://localhost${payload.posts[0].attachments[0].url}`), env, context);
    assert.equal(media.status, 200);
    assert.equal(media.headers.get("content-type"), "video/mp4");
    assert.equal((await media.arrayBuffer()).byteLength, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const botSync = await readFile(new URL("../integrations/bedolaga-site-admin/app/handlers/site_news_sync.py", import.meta.url), "utf8");
  const exampleEnv = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(botSync, /dp\.channel_post\.register/);
  assert.match(botSync, /dp\.edited_channel_post\.register/);
  assert.match(botSync, /message\.html_(?:text|caption)/);
  assert.match(botSync, /media_group_id/);
  assert.match(exampleEnv, /TELEGRAM_NEWS_BOT_TOKEN=/);
});

test("pricing is synchronized through the public Bedolaga landing API", async () => {
  const route = await readFile(new URL("../app/api/pricing/route.ts", import.meta.url), "utf8");
  const integration = await readFile(new URL("../src/server/bedolaga/pricing.ts", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../src/features/pricing/pricing-catalog.tsx", import.meta.url), "utf8");
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const exampleEnv = await readFile(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(integration, /cabinet\/landing\/\$\{encodeURIComponent\(slug\)\}/);
  assert.match(integration, /DEFAULT_LANDING_SLUG = "st-village"/);
  assert.match(integration, /MAX_RESPONSE_BYTES/);
  assert.match(integration, /CACHE_TTL_MS/);
  assert.match(integration, /BOOTSTRAP_SNAPSHOT/);
  assert.match(integration, /periods: bootstrapPeriods/);
  assert.match(route, /s-maxage=300/);
  assert.match(catalog, /fetch\("\/api\/pricing"/);
  assert.match(catalog, /trafficLimitGb/);
  assert.match(catalog, /deviceLimit/);
  assert.match(catalog, /priceKopeks/);
  assert.match(home, /<PricingCatalog compact/);
  assert.match(exampleEnv, /BEDOLAGA_API_URL=https:\/\/cabinet\.stvillage\.top\/api/);
  assert.doesNotMatch(`${route}${integration}${catalog}`, /X-API-Key|BOT_TOKEN|JWT|Authorization:/i);
});

test("trial period is prominent and explains every limitation", async () => {
  for (const path of ["/", "/pricing"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /Пробный период/, path);
    assert.match(html, />1<\/strong><span>день доступа/, path);
    assert.match(html, />5 ГБ<\/strong><span>трафика/, path);
    assert.match(html, />1<\/strong><span>устройство/, path);
    assert.match(html, /Германия/, path);
    assert.match(html, /Польша/, path);
    assert.match(html, /Швеция/, path);
    assert.match(html, /flag-de/, path);
    assert.match(html, /flag-pl/, path);
    assert.match(html, /flag-se/, path);
    assert.match(html, /Белые списки не входят в пробный период/, path);
    assert.match(html, /https:\/\/cabinet\.stvillage\.top/, path);
  }
});

test("hero artwork prefers compact modern formats with a PNG fallback", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const [png, webp, avif] = await Promise.all([
    stat(new URL("../public/brand-emblem.png", import.meta.url)),
    stat(new URL("../public/brand-emblem.webp", import.meta.url)),
    stat(new URL("../public/brand-emblem.avif", import.meta.url)),
  ]);

  assert.ok(source.indexOf("brand-emblem.avif") < source.indexOf("brand-emblem.webp"));
  assert.ok(source.indexOf("brand-emblem.webp") < source.indexOf("brand-emblem.png"));
  assert.ok(avif.size < webp.size);
  assert.ok(webp.size < png.size / 5);
  assert.ok(avif.size < 150_000);
});

test("home page uses the cabinet preview and clearly separated onboarding steps", async () => {
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, context);
  const html = await response.text();

  assert.match(html, /cabinet-dashboard-preview\.webp\?v=2/);
  assert.match(html, /cabinet-dashboard-preview\.png\?v=2/);
  assert.match(html, /Демонстрационный интерфейс/);
  assert.match(html, /class="step-number"/);
  const plainText = html.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ");
  assert.match(plainText, /Шаг\s+1\s+из\s+3/);
  assert.match(html, /class="step-connector"/);
  assert.doesNotMatch(html, /class="control-panel"/);
});

test("priority dev improvements include private QR shortcuts and richer status details", async () => {
  const homeResponse = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, context);
  const homeHtml = await homeResponse.text();
  const ctaSource = await readFile(new URL("../src/components/cta-panel.tsx", import.meta.url), "utf8");
  const statusSource = await readFile(new URL("../src/features/status/status-dashboard.tsx", import.meta.url), "utf8");
  const checklist = await readFile(new URL("../SITE_IMPROVEMENT_CHECKLIST.md", import.meta.url), "utf8");
  const cabinetQr = await stat(new URL("../public/qr-cabinet.png", import.meta.url));
  const telegramQr = await stat(new URL("../public/qr-telegram-bot.png", import.meta.url));

  assert.match(homeHtml, /\/qr-cabinet\.png/);
  assert.match(homeHtml, /\/qr-telegram-bot\.png/);
  assert.match(ctaSource, /Быстрые переходы по QR-коду/);
  assert.match(statusSource, /className="status-metrics"/);
  assert.match(statusSource, /Проверено в/);
  assert.match(checklist, /## Уже реализовано/);
  assert.match(checklist, /\[x\] Автономные QR-коды/);
  assert.ok(cabinetQr.size > 1_000 && cabinetQr.size < 20_000);
  assert.ok(telegramQr.size > 1_000 && telegramQr.size < 20_000);
});

test("search engines and social platforms receive complete page metadata", async () => {
  const cases = [
    ["/", "https://stvillage.top/", "ST VILLAGE — защищённое подключение без лишней сложности"],
    ["/pricing", "https://stvillage.top/pricing", "Тарифы — ST VILLAGE"],
    ["/connect", "https://stvillage.top/connect", "Подключение — ST VILLAGE"],
    ["/status", "https://stvillage.top/status", "Статус инфраструктуры — ST VILLAGE"],
    ["/news", "https://stvillage.top/news", "Новости — ST VILLAGE"],
  ];

  for (const [path, canonical, socialTitle] of cases) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replaceAll("/", "\\/")}"`), path);
    assert.match(html, new RegExp(`<meta property="og:title" content="${socialTitle}`), path);
    assert.match(html, /<meta property="og:image" content="https:\/\/stvillage\.top\/og-social-v2\.png"/);
    assert.match(html, /<meta property="og:image:width" content="1200"/);
    assert.match(html, /<meta property="og:image:height" content="630"/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
    assert.doesNotMatch(html, /st-village\.example|example\.com/);
  }

  const home = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, context);
  const homeHtml = await home.text();
  assert.match(homeHtml, /type="application\/ld\+json"/);
  assert.match(homeHtml, /https:\/\/schema\.org/);
  assert.match(homeHtml, /"@type":"WebSite"/);
  assert.match(homeHtml, /"@type":"Organization"/);
  assert.match(homeHtml, /rel="shortcut icon" href="https:\/\/stvillage\.top\/favicon\.ico\?v=2"/);
  assert.match(homeHtml, /rel="icon" href="https:\/\/stvillage\.top\/favicon\.ico\?v=2" sizes="any" type="image\/x-icon"/);
  assert.match(homeHtml, /apple-touch-icon\.png\?v=2/);
  assert.doesNotMatch(homeHtml, /favicon\.svg/);

  const sitemap = await worker.fetch(new Request("http://localhost/sitemap.xml"), env, context);
  const sitemapXml = await sitemap.text();
  assert.match(sitemapXml, /https:\/\/stvillage\.top\/legal\/privacy/);
  assert.match(sitemapXml, /https:\/\/stvillage\.top\/legal\/terms/);
  assert.match(sitemapXml, /https:\/\/stvillage\.top\/release/);
  assert.match(sitemapXml, /https:\/\/stvillage\.top\/reviews/);

  const manifest = await worker.fetch(new Request("http://localhost/manifest.webmanifest"), env, context);
  const manifestJson = await manifest.json();
  assert.equal(manifestJson.icons.length, 2);
  assert.equal(manifestJson.icons[0].src, "/icon-192.png?v=2");
  assert.equal(manifestJson.icons[1].src, "/icon-512.png?v=2");
});

test("FAQ, pricing and news expose extended Schema.org data", async () => {
  const pages = await Promise.all(["/", "/pricing", "/news"].map(async (path) => {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    return response.text();
  }));
  const [home, pricing, news] = pages;
  const newsCard = await readFile(new URL("../src/features/news/telegram-post-card.tsx", import.meta.url), "utf8");
  const structuredData = await readFile(new URL("../src/config/structured-data.ts", import.meta.url), "utf8");

  assert.match(home, /"@type":"FAQPage"/);
  assert.match(home, /"@type":"Question"/);
  assert.match(home, /"@type":"Answer"/);
  assert.match(pricing, /"@type":"OfferCatalog"/);
  assert.match(pricing, /"@type":"Offer"/);
  assert.match(pricing, /"priceCurrency":"RUB"/);
  assert.match(news, /"@type":"CollectionPage"/);
  assert.match(newsCard, /createNewsArticleJsonLd/);
  assert.match(newsCard, /type="application\/ld\+json"/);
  assert.match(structuredData, /&\(\?:nbsp\|amp\|quot\|apos\|#39\|#160\);/);
  assert.doesNotMatch(structuredData, /\.replace\(\/&amp;\/gi/);
});

test("official client links and visual baselines are checked automatically", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const linkScript = await readFile(new URL("../scripts/check-client-links.mjs", import.meta.url), "utf8");
  const linkWorkflow = await readFile(new URL("../.github/workflows/external-links.yml", import.meta.url), "utf8");
  const visualWorkflow = await readFile(new URL("../.github/workflows/visual-regression.yml", import.meta.url), "utf8");
  const playwrightConfig = await readFile(new URL("../playwright.config.ts", import.meta.url), "utf8");
  const visualSpec = await readFile(new URL("../tests/visual/public-pages.spec.ts", import.meta.url), "utf8");
  const checklist = await readFile(new URL("../SITE_IMPROVEMENT_CHECKLIST.md", import.meta.url), "utf8");

  assert.equal(packageJson.scripts["test:links"], "node scripts/check-client-links.mjs");
  assert.match(packageJson.scripts["test:visual"], /playwright test/);
  assert.match(packageJson.scripts["test:visual:update"], /--update-snapshots/);
  assert.match(linkScript, /src\/config\/connection-apps\.ts/);
  assert.match(linkScript, /HEAD/);
  assert.match(linkScript, /GET/);
  assert.match(linkWorkflow, /schedule:/);
  assert.match(linkWorkflow, /node scripts\/check-client-links\.mjs/);
  assert.match(visualWorkflow, /pnpm test:visual/);
  assert.match(visualWorkflow, /playwright-report/);
  assert.match(playwrightConfig, /name: "desktop"/);
  assert.match(playwrightConfig, /name: "mobile"/);
  assert.match(visualSpec, /home-hero\.png/);
  assert.match(visualSpec, /pricing-page\.png/);
  assert.match(visualSpec, /status-observability\.png/);
  assert.match(visualSpec, /reviews-page\.png/);
  assert.match(checklist, /\[x\] Расширенная Schema\.org-разметка тарифов, FAQ и новостей/);
  assert.match(checklist, /\[x\] Автоматическая проверка внешних ссылок Happ и INCY/);
  assert.match(checklist, /\[x\] Визуальные регрессионные тесты для desktop и mobile/);
});

test("observability, incidents, regional checks and private analytics are wired", async () => {
  const observability = await worker.fetch(new Request("http://localhost/api/observability?range=7d"), env, context);
  assert.equal(observability.status, 200);
  const payload = await observability.json();
  assert.equal(payload.range, "7d");
  assert.equal(Array.isArray(payload.history.points), true);
  assert.equal(Array.isArray(payload.incidents), true);
  assert.equal(payload.regions.length, 3);
  assert.equal(payload.regions.every((region) => !region.probeId && !region.ip), true);

  const analytics = await worker.fetch(new Request("http://localhost/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.1" },
    body: JSON.stringify({ eventType: "outbound_click", destination: "cabinet", page: "/pricing" }),
  }), env, context);
  assert.equal(analytics.status, 202);
  assert.doesNotMatch(await analytics.text(), /203\.0\.113\.1|user-agent|cookie/i);

  const storage = await readFile(new URL("../src/server/storage/database.ts", import.meta.url), "utf8");
  const alerts = await readFile(new URL("../src/server/status/alerts.ts", import.meta.url), "utf8");
  const regional = await readFile(new URL("../src/server/status/regional-checks.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../drizzle/0000_observability.sql", import.meta.url), "utf8");
  const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  assert.equal(hosting.d1, "DB");
  assert.match(storage, /status_samples/);
  assert.match(storage, /private_metrics/);
  assert.match(storage, /node:fs\/promises/);
  assert.match(storage, /\/opt\/st-village-site\/data\/observability\.json/);
  assert.match(alerts, /STATUS_ALERT_TELEGRAM_BOT_TOKEN/);
  assert.match(alerts, /previous === fingerprint/);
  assert.match(regional, /api\.globalping\.io\/v1\/measurements/);
  assert.match(regional, /STATUS_PUBLIC_SITE_URL/);
  assert.match(regional, /https:\/\/stvillage\.top/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS incidents/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_status_samples_checked_at/);
  assert.match(migration, /PRAGMA optimize/);
});

test("reviews are moderated and the checklist contains no unfinished items", async () => {
  const reviewsPage = await worker.fetch(new Request("http://localhost/reviews", { headers: { accept: "text/html" } }), env, context);
  const html = await reviewsPage.text();
  assert.match(html, /Честная обратная связь/);
  assert.match(html, /ручную модерацию/);
  assert.doesNotMatch(html, /Иван|Мария|Алексей/);

  const invalid = await worker.fetch(new Request("http://localhost/api/reviews", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName: "A", rating: 8, text: "short" }),
  }), env, context);
  assert.equal(invalid.status, 400);

  const reviewRoute = await readFile(new URL("../app/api/reviews/route.ts", import.meta.url), "utf8");
  const reviewBoard = await readFile(new URL("../src/features/reviews/reviews-board.tsx", import.meta.url), "utf8");
  const moderationPage = await readFile(new URL("../src/features/reviews/reviews-moderation.tsx", import.meta.url), "utf8");
  const reviewNotifications = await readFile(new URL("../src/server/reviews/notifications.ts", import.meta.url), "utf8");
  const storage = await readFile(new URL("../src/server/storage/database.ts", import.meta.url), "utf8");
  const devDeploy = await readFile(new URL("../ops/vps/deploy-dev.sh", import.meta.url), "utf8");
  const checklist = await readFile(new URL("../SITE_IMPROVEMENT_CHECKLIST.md", import.meta.url), "utf8");
  assert.match(reviewRoute, /REVIEWS_ADMIN_TOKEN/);
  assert.match(reviewRoute, /pendingModeration/);
  assert.match(reviewRoute, /getManagedReviews/);
  assert.match(reviewRoute, /notifyReviewSubmission/);
  assert.match(reviewBoard, /const formElement = event\.currentTarget/);
  assert.match(reviewBoard, /formElement\.reset\(\)/);
  assert.match(reviewBoard, /response\.json\(\)\.catch/);
  assert.match(reviewBoard, /role=\{state === "error" \? "alert" : "status"\}/);
  assert.match(moderationPage, /"X-ST-Village-Admin-Token": token/);
  assert.doesNotMatch(moderationPage, /Authorization: `Bearer/);
  assert.match(reviewRoute, /x-st-village-admin-token/);
  assert.match(moderationPage, /"approved"/);
  assert.match(moderationPage, /"rejected"/);
  assert.match(reviewNotifications, /STATUS_ALERT_TELEGRAM_BOT_TOKEN/);
  assert.match(reviewNotifications, /inline_keyboard/);
  assert.match(storage, /\/opt\/st-village-dev\/data\/observability\.json/);
  assert.match(devDeploy, /pre-persistence review queue/);
  assert.doesNotMatch(checklist, /- \[ \]/);
  for (const item of ["История доступности", "Лента инцидентов", "Приватная аналитика", "Core Web Vitals"]) {
    assert.match(checklist, new RegExp(`\\[x\\].*${item}`));
  }
});

test("public review submissions are rate limited before storage work", async () => {
  const statuses = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await worker.fetch(new Request("http://localhost/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.77" },
      body: JSON.stringify({ displayName: "A", rating: 8, text: "short" }),
    }), env, context);
    statuses.push(response.status);
  }
  assert.deepEqual(statuses, [400, 400, 400, 400, 429]);
});

test("accessibility and performance safeguards cover the new public surfaces", async () => {
  const header = await readFile(new URL("../src/components/site-header.tsx", import.meta.url), "utf8");
  const status = await readFile(new URL("../src/features/status/status-dashboard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const performance = await readFile(new URL("../scripts/check-performance-budget.mjs", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /aria-current/);
  assert.match(status, /aria-live="polite"/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /forced-colors: active/);
  assert.match(styles, /:focus-visible/);
  assert.match(performance, /cabinet-dashboard-preview\.webp/);
  assert.match(packageJson.scripts["release:check"], /test:performance/);
});

test("v1.2.0 operational release safeguards are present", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const workflow = await readFile(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8");
  const caddy = await readFile(new URL("../ops/vps/Caddyfile", import.meta.url), "utf8");
  const globalError = await readFile(new URL("../app/global-error.tsx", import.meta.url), "utf8");
  const security = await readFile(new URL("../public/.well-known/security.txt", import.meta.url), "utf8");
  const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  const releaseConfig = await readFile(new URL("../src/config/release.ts", import.meta.url), "utf8");
  const releasePage = await readFile(new URL("../app/release/page.tsx", import.meta.url), "utf8");
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

  assert.equal(packageJson.version, "1.2.0");
  assert.match(packageJson.scripts.typecheck, /tsc --noEmit/);
  assert.match(packageJson.scripts["release:check"], /lint.*typecheck.*build.*rendered-html/s);
  assert.match(workflow, /pnpm release:check/);
  assert.match(workflow, /permissions:\s+contents: read/s);
  assert.match(workflow, /branches: \[main, dev\]/);
  assert.match(caddy, /X-Robots-Tag "noindex, nofollow, nosnippet"/);
  assert.match(caddy, /Cross-Origin-Opener-Policy "same-origin-allow-popups"/);
  assert.match(caddy, /X-Permitted-Cross-Domain-Policies "none"/);
  assert.match(globalError, /Сайт временно недоступен/);
  assert.doesNotMatch(globalError, /error\.(?:message|stack)|\{error\./);
  assert.match(security, /Contact: mailto:admin@stvillage\.ru/);
  assert.match(security, /Canonical: https:\/\/stvillage\.top\/\.well-known\/security\.txt/);
  assert.match(releaseConfig, /channel: "stable"/);
  assert.match(releaseConfig, /name: "Мониторинг и качество"/);
  assert.match(releasePage, /Живой мониторинг и надёжная эксплуатация/);
  assert.match(worker, /X-ST-Village-Release/);
  assert.match(worker, /X-ST-Village-Channel/);
  assert.match(changelog, /1\.0\.0 — стабильный запуск/);
});

test("production operations include durable storage, verified backups, protected admin tools and independent checks", async () => {
  const caddy = await readFile(new URL("../ops/vps/Caddyfile", import.meta.url), "utf8");
  const productionService = await readFile(new URL("../ops/vps/st-village-site.service", import.meta.url), "utf8");
  const devService = await readFile(new URL("../ops/vps/st-village-dev-site.service", import.meta.url), "utf8");
  const deploy = await readFile(new URL("../ops/vps/deploy.sh", import.meta.url), "utf8");
  const backup = await readFile(new URL("../ops/vps/backup.sh", import.meta.url), "utf8");
  const backupTimer = await readFile(new URL("../ops/vps/st-village-backup.timer", import.meta.url), "utf8");
  const adminInstaller = await readFile(new URL("../ops/vps/install-admin-auth.sh", import.meta.url), "utf8");
  const rateLimit = await readFile(new URL("../src/server/security/rate-limit.ts", import.meta.url), "utf8");
  const reviewsRoute = await readFile(new URL("../app/api/reviews/route.ts", import.meta.url), "utf8");
  const incidentsRoute = await readFile(new URL("../app/api/incidents/route.ts", import.meta.url), "utf8");
  const analyticsRoute = await readFile(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8");
  const management = await readFile(new URL("../src/features/status/status-management.tsx", import.meta.url), "utf8");
  const uptimeWorkflow = await readFile(new URL("../.github/workflows/external-uptime.yml", import.meta.url), "utf8");
  const uptimeCheck = await readFile(new URL("../scripts/external-uptime-check.mjs", import.meta.url), "utf8");
  const countryFlag = await readFile(new URL("../src/components/country-flag.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const codeql = await readFile(new URL("../.github/workflows/codeql.yml", import.meta.url), "utf8");
  const dependabot = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");

  assert.match(productionService, /ReadWritePaths=\/opt\/st-village-site\/data/);
  assert.match(devService, /ReadWritePaths=\/opt\/st-village-dev\/data/);
  assert.match(deploy, /Preserve legacy data from PrivateTmp/);
  assert.match(backup, /sha256sum/);
  assert.match(backup, /tar --list/);
  assert.match(backup, /RESTIC_REPOSITORY/);
  assert.match(backupTimer, /OnCalendar=\*-\*-\* 02:25:00/);
  assert.match(caddy, /ST_VILLAGE_ADMIN_AUTH_HASH/);
  assert.match(caddy, /stvillage\.top \{/);
  assert.match(caddy, /stvillage\.ru, www\.stvillage\.ru/);
  assert.match(caddy, /redir https:\/\/stvillage\.top\{uri\} permanent/);
  assert.match(caddy, /https:\/\/cabinet\.stvillage\.top/);
  assert.match(caddy, /@status_analytics/);
  assert.match(adminInstaller, /caddy hash-password --algorithm bcrypt/);
  assert.match(rateLimit, /RATE_LIMIT_SECRET/);
  assert.match(rateLimit, /Retry-After/);
  assert.match(reviewsRoute, /checkRateLimit/);
  assert.match(incidentsRoute, /readJsonLimited/);
  assert.match(analyticsRoute, /getPrivateMetricsSummary/);
  assert.match(management, /X-ST-Village-Status-Token/);
  assert.match(management, /Новая публикация/);
  assert.match(uptimeWorkflow, /cron: "\*\/5 \* \* \* \*"/);
  assert.match(uptimeCheck, /id=\["'\]root/);
  assert.match(uptimeCheck, /contentType: \/text\\\/html\/i/);
  for (const code of ["CH", "DE", "FI", "FR", "NL", "PL", "SE", "TR"]) assert.match(countryFlag, new RegExp(`${code}:`));
  for (const code of ["ch", "de", "fi", "fr", "nl", "pl", "se", "tr"]) assert.match(styles, new RegExp(`\\.flag-${code}\\b`));
  assert.match(codeql, /github\/codeql-action/);
  assert.match(dependabot, /package-ecosystem: npm/);
});

test("the dev stand is isolated, protected, and automatically updated", async () => {
  const caddy = await readFile(new URL("../ops/vps/Caddyfile", import.meta.url), "utf8");
  const deploy = await readFile(new URL("../ops/vps/deploy-dev.sh", import.meta.url), "utf8");
  const siteService = await readFile(new URL("../ops/vps/st-village-dev-site.service", import.meta.url), "utf8");
  const deployTimer = await readFile(new URL("../ops/vps/st-village-dev-deploy.timer", import.meta.url), "utf8");
  const verify = await readFile(new URL("../ops/vps/verify-dev.sh", import.meta.url), "utf8");
  const caddyOverride = await readFile(new URL("../ops/vps/caddy-st-village-dev.conf", import.meta.url), "utf8");
  const installer = await readFile(new URL("../ops/vps/install-dev-stand.sh", import.meta.url), "utf8");

  assert.match(caddy, /dev\.stvillage\.ru/);
  assert.match(caddy, /basic_auth/);
  assert.match(caddy, /ST_VILLAGE_DEV_AUTH_HASH/);
  assert.match(caddy, /X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex"/);
  assert.match(caddy, /respond @robots "User-agent: \*\\nDisallow: \/\\n" 200/);
  assert.match(caddy, /reverse_proxy 127\.0\.0\.1:3001/);

  assert.match(deploy, /app_root="\/opt\/st-village-dev"/);
  assert.match(deploy, /branch="dev"/);
  assert.match(deploy, /127\.0\.0\.1:3001\/api\/health/);
  assert.match(deploy, /systemctl restart st-village-dev-site\.service/);
  assert.match(siteService, /PORT=3001/);
  assert.match(siteService, /WorkingDirectory=\/opt\/st-village-dev\/current/);
  assert.match(deployTimer, /OnUnitActiveSec=1min/);
  assert.match(verify, /unauthorized_status/);
  assert.match(verify, /Disallow: \//);
  assert.match(caddyOverride, /EnvironmentFile=\/etc\/caddy\/st-village-dev\.env/);
  assert.match(installer, /caddy adapt/);
  assert.match(installer, /Caddyfile\.pre-dev/);
  assert.match(installer, /openssl rand -hex 16/);
  assert.match(installer, /caddy hash-password --algorithm bcrypt/);
  assert.match(installer, /\.st-village-dev-credentials/);
  assert.match(installer, /systemctl start --no-block st-village-dev-deploy\.service/);
});
