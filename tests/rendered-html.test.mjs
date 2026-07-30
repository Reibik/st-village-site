import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.STATUS_PROBE_TIMEOUT_MS = "500";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };

test("server-renders the ST VILLAGE public home page", async () => {
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ru"/i);
  assert.match(html, /ST VILLAGE/);
  assert.match(html, /Стабильное подключение/);
  assert.match(html, /Открыть личный кабинет/);
  assert.match(html, /https:\/\/cabinet\.stvillage\.ru/);
  assert.match(html, /https:\/\/t\.me\/st_village_vpn_bot/);
  assert.match(html, /class="footer-version">v(?:<!-- -->)?0\.8\.1<\/span>/);
  assert.match(html, /src="\/brand-emblem\.png"/);
  assert.doesNotMatch(html, /_vinext\/image/);
  assert.doesNotMatch(html, /— мс/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|lorem ipsum/i);
  assert.doesNotMatch(html, /\bVPN\b/i);
});

test("all public pages render their expected content", async () => {
  const pages = [
    ["/pricing", "Выберите удобный период"],
    ["/connect", "Happ и INCY — два основных приложения"],
    ["/status", "Состояние инфраструктуры"],
    ["/news", "Обновления сервиса"],
    ["/support", "Помощь, когда она нужна"],
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
    if (path.startsWith("/legal/")) {
      assert.match(html, /@st_village_vpn_bot/);
      assert.doesNotMatch(html, /Черновая структура|Требуется юридическая редакция/);
    }
    assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|lorem ipsum/i, path);
  }
});

test("system routes, redirect and not-found responses are valid", async () => {
  for (const path of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`), env, context);
    assert.equal(response.status, 200, path);
  }
  const login = await worker.fetch(new Request("http://localhost/login", { redirect: "manual" }), env, context);
  assert.match(String(login.status), /^30[78]$/);
  assert.equal(login.headers.get("location"), "https://cabinet.stvillage.ru/");

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
  assert.equal(currentPayload.updateAvailable, false);

  const stale = await worker.fetch(new Request("http://localhost/api/version?current=previous-build"), env, context);
  assert.equal(stale.status, 200);
  assert.equal((await stale.json()).updateAvailable, true);
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
  for (const path of ["/api/health/database", "/api/health/remnawave"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`), env, context);
    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.equal(payload.status, "unavailable");
    assert.doesNotMatch(JSON.stringify(payload), /stack|password|token/i);
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
