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
