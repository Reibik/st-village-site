import assert from "node:assert/strict";
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
  assert.match(html, /src="\/brand-emblem\.png"/);
  assert.doesNotMatch(html, /_vinext\/image/);
  assert.doesNotMatch(html, /— мс/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|lorem ipsum/i);
  assert.doesNotMatch(html, /\bVPN\b/i);
});

test("all public pages render their expected content", async () => {
  const pages = [
    ["/pricing", "Выберите удобный период"],
    ["/connect", "Настройка шаг за шагом"],
    ["/status", "Состояние инфраструктуры"],
    ["/news", "Обновления сервиса"],
    ["/support", "Помощь, когда она нужна"],
    ["/legal/privacy", "Политика конфиденциальности"],
    ["/legal/terms", "Условия использования"],
  ];
  for (const [path, heading] of pages) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, path);
    const html = await response.text();
    assert.match(html, new RegExp(`<h1[^>]*>${heading}</h1>`), path);
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
