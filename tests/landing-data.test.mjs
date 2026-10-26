import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLiveStatus } from "../src/server/status/live-status.ts";
import { mergePosts } from "../src/features/news/merge-posts.ts";
import { getNetworkCountries, isLiveStatusStale } from "../src/features/status/network-catalog.ts";
import { newsExcerpt, newsPreviewImage } from "../src/features/news/news-excerpt.ts";

const live = (incidents) => normalizeLiveStatus({
  totals: { online: 1, total: 1 }, servers: [{ sid: "de", online: true }], incidents,
});

test("an active incident prevents an all-clear even if all nodes are online", () => {
  assert.equal(live([{ title: "Проблема", severity: "minor", status: "monitoring" }]).status, "degraded");
});
test("resolved incidents do not degrade the current status", () => {
  assert.equal(live([{ title: "Исправлено", severity: "critical", status: "resolved" }]).status, "operational");
  assert.equal(live([]).status, "operational");
});

for (const value of [undefined, null, "", " \t ", false, true, [], [23], {}, "invalid", Infinity]) {
  test(`missing or nonnumeric monitoring values remain unknown: ${typeof value === "number" ? String(value) : JSON.stringify(value)}`, () => {
    const summary = normalizeLiveStatus({
      totals: { uptime30: value, avgLatency: value },
      servers: [{ sid: "de", uptime30: value, latencyMs: value }],
    });
    assert.equal(summary.totals.uptime30, null);
    assert.equal(summary.totals.averageLatencyMs, null);
    assert.equal(summary.servers[0].uptime30, null);
    assert.equal(summary.servers[0].latencyMs, null);
  });
}

test("monitoring normalization preserves numeric strings, zero and bounded ranges", () => {
  const summary = normalizeLiveStatus({
    totals: { online: "1", total: "2", maintenance: "0", uptime30: "0", avgLatency: "0" },
    servers: [
      { sid: "de", uptime30: "99.5", latencyMs: "82.5", members: "2", membersOnline: "1" },
      { sid: "lte", uptime30: 0, latencyMs: 0 },
      { sid: "high", uptime30: 200, latencyMs: 70_000 },
      { sid: "low", uptime30: -1, latencyMs: -1 },
    ],
  });
  assert.deepEqual(summary.totals, { online: 1, total: 2, maintenance: 0, uptime30: 0, averageLatencyMs: 0 });
  assert.deepEqual(summary.servers.map(({ uptime30, latencyMs }) => ({ uptime30, latencyMs })), [
    { uptime30: 99.5, latencyMs: 82.5 },
    { uptime30: 0, latencyMs: null },
    { uptime30: 100, latencyMs: 60_000 },
    { uptime30: 0, latencyMs: null },
  ]);
  assert.equal(summary.servers[0].members, 2);
  assert.equal(summary.servers[0].membersOnline, 1);
});

test("unknown totals still fall back to the normalized server count", () => {
  const summary = normalizeLiveStatus({ servers: [{ sid: "de" }, { sid: "pl" }, {}] });
  assert.equal(summary.totals.total, 2);
  assert.equal(summary.totals.online, 0);
  assert.equal(summary.status, "outage");
});

for (const value of [undefined, null, "", " \t ", false, true, [], [23], {}, "invalid", Infinity]) {
  test(`missing or invalid monitoring timestamps do not become Unix epoch: ${typeof value === "number" ? String(value) : JSON.stringify(value)}`, () => {
    const before = Date.now();
    const summary = normalizeLiveStatus({ lastCheckTs: value, incidents: [{ title: "Проверка", startedTs: value }] });
    const after = Date.now();
    const generatedAt = Date.parse(summary.generatedAt);
    assert.ok(generatedAt >= before && generatedAt <= after, summary.generatedAt);
    assert.equal(summary.incidents[0].startedAt, null);
  });
}

test("monitoring timestamps accept numeric strings and explicit Unix epoch", () => {
  const summary = normalizeLiveStatus({ lastCheckTs: "86400", incidents: [{ title: "Проверка", startedTs: 0 }] });
  assert.equal(summary.generatedAt, "1970-01-02T00:00:00.000Z");
  assert.equal(summary.incidents[0].startedAt, "1970-01-01T00:00:00.000Z");
});

test("compact refresh keeps only two newest posts and uses new content for edits", () => {
  const posts = mergePosts([{ id: "3", html: "новое" }, { id: "2", html: "исправлено" }], [{ id: "2", html: "старое" }, { id: "1" }], 2);
  assert.deepEqual(posts.map((post) => post.id), ["3", "2"]);
  assert.equal(posts[1].html, "исправлено");
});
test("archive merging retains older posts without a compact limit", () => {
  assert.deepEqual(mergePosts([{ id: "3" }], [{ id: "2" }, { id: "1" }]).map((post) => post.id), ["3", "2", "1"]);
});

test("real countries include Albania but automatic routes do not become Switzerland", () => {
  const servers = normalizeLiveStatus({ servers: [
    { sid: "al", cc: "AL", name: "Албания", online: true, members: 1, membersOnline: 1 },
    { sid: "auto", cc: "CH", name: "Авто выбор", online: true, members: 6, membersOnline: 6 },
    { sid: "de", cc: "DE", name: "🔴 🇩🇪 Германия", online: true, members: 2, membersOnline: 2 },
  ] }).servers;
  assert.deepEqual(getNetworkCountries(servers).map((item) => item.code), ["AL", "DE"]);
  assert.equal(servers[1].countryCode, "");
  assert.equal(servers[2].name, "Германия");
  assert.equal(getNetworkCountries(servers)[1].total, 2);
});

test("decorated automatic routes never become Swiss locations or incident flags", () => {
  const summary = normalizeLiveStatus({ servers: [
    { sid: "auto", cc: "CH", name: "🎲Авто выбор🎲", online: true },
    { sid: "lte", cc: "CH", name: "📡Авто LTE📡", online: true },
    { sid: "short", cc: "CH", name: "Авто🎲", online: true },
    { sid: "english", cc: "CH", name: "Auto-select", online: true },
    { sid: "ee", cc: "EE", name: "Эстония VLESS", online: true },
    { sid: "de", cc: "DE", name: "Германия (4G/5G/LTE) 📡", online: true },
  ], incidents: [{ title: "Проверка маршрута", affected: [{ name: "🎲Авто выбор🎲", cc: "CH" }] }] });
  assert.deepEqual(summary.servers.map((server) => server.countryCode), ["", "", "", "", "EE", "DE"]);
  assert.deepEqual(getNetworkCountries(summary.servers).map((country) => country.code), ["DE", "EE"]);
  assert.equal(summary.incidents[0].affected[0].countryCode, "");
});

test("expired, invalid and future snapshots must not appear current", () => {
  const summary = { generatedAt: "2026-10-03T12:00:00Z", refreshAfterSeconds: 60 };
  assert.equal(isLiveStatusStale(summary, Date.parse("2026-10-03T12:02:00Z")), false);
  assert.equal(isLiveStatusStale(summary, Date.parse("2026-10-03T12:06:00Z")), true);
  assert.equal(isLiveStatusStale({ ...summary, generatedAt: "invalid" }), true);
  assert.equal(isLiveStatusStale(summary, Date.parse("2026-10-03T11:00:00Z")), true);
});

test("news teasers decode typography and do not reveal spoilers", () => {
  const excerpt = newsExcerpt('<h3>Новости &amp; планы</h3><p>Смотрите <b>обновление</b> &#8594; <span class="tg-spoiler">секрет</span></p>');
  assert.equal(excerpt.title, "Новости & планы");
  assert.equal(excerpt.text, "Смотрите обновление → [Спойлер]");
  assert.equal(newsExcerpt('<h3>Новость</h3><p><span class="tg-spoiler">начало<span class="tg-custom-emoji">emoji</span>секретный конец</span> После</p>').text, "[Спойлер] После");
});

test("a spoiler-marked image is not used as a news cover", () => {
  const post = { images: [{ url: "/secret", alt: "Скрыто" }, { url: "/public", alt: "Открыто" }], attachments: [{ url: "/secret", hasSpoiler: true }] };
  assert.equal(newsPreviewImage(post).url, "/public");
  assert.equal(newsPreviewImage({ ...post, images: [post.images[0]] }), undefined);
});
