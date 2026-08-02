import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../src/config/connection-apps.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const urlPattern = /(?:officialUrl|docsUrl|url):\s*"(https:\/\/[^"\s]+)"/g;
const urls = [...new Set([...source.matchAll(urlPattern)].map((match) => match[1]))];
const allowedHosts = new Set([
  "www.happ.su",
  "apps.apple.com",
  "testflight.apple.com",
  "play.google.com",
  "github.com",
  "incy.cc",
  "docs.incy.cc",
]);

if (urls.length < 10) throw new Error(`Найдено слишком мало официальных ссылок: ${urls.length}`);

for (const value of urls) {
  const url = new URL(value);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`Неожиданный домен в ссылках приложений: ${url.hostname}`);
  }
}

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 ST-VILLAGE-Link-Check/1.0",
        accept: "text/html,application/xhtml+xml,application/octet-stream;q=0.8,*/*;q=0.5",
        ...(method === "GET" ? { range: "bytes=0-0" } : {}),
      },
    });
    await response.body?.cancel();
    return { ok: response.status >= 200 && response.status < 400, status: response.status, finalUrl: response.url };
  } finally {
    clearTimeout(timeout);
  }
}

async function probe(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      let result = await request(url, "HEAD");
      if ([403, 405].includes(result.status)) result = await request(url, "GET");
      if (result.ok) return { url, ...result };
      lastError = new Error(`HTTP ${result.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  return {
    url,
    ok: false,
    status: 0,
    finalUrl: "",
    error: lastError instanceof Error ? lastError.message : "Неизвестная ошибка",
  };
}

const results = [];
const queue = [...urls];
const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
  while (queue.length) {
    const url = queue.shift();
    if (url) results.push(await probe(url));
  }
});
await Promise.all(workers);

results.sort((left, right) => left.url.localeCompare(right.url));
for (const result of results) {
  const transient = !result.ok && result.status === 0;
  const mark = result.ok ? "✓" : transient ? "⚠" : "✗";
  const detail = result.ok ? `HTTP ${result.status}` : transient ? "временная сетевая блокировка" : result.error;
  console.log(`${mark} ${detail} ${result.url}`);
}

const failed = results.filter((result) => {
  if (result.ok) return false;
  return result.status !== 0;
});
if (failed.length) {
  throw new Error(`Недоступны официальные ссылки Happ/INCY: ${failed.length} из ${results.length}`);
}

const transientCount = results.filter((result) => !result.ok).length;
console.log(`Проверено официальных ссылок Happ/INCY: ${results.length}; временных сетевых блокировок: ${transientCount}`);
