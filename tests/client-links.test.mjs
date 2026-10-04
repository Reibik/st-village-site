import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function runChecker(fetchImplementation) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", `
    globalThis.fetch = ${fetchImplementation};
    await import(${JSON.stringify(new URL("../scripts/check-client-links.mjs", import.meta.url).href)});
  `], { encoding: "utf8", timeout: 10_000 });
}

test("official link checker fails on broken HTTP links instead of treating them as network blocks", () => {
  const result = runChecker('async () => new Response(null, { status: 404 })');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗ HTTP 404/);
  assert.match(result.stderr, /Недоступны официальные ссылки/);
});

test("official link checker retries HEAD-denied links with GET and detects broken destinations", () => {
  const result = runChecker('async (_url, options) => new Response(null, { status: options.method === "HEAD" ? 405 : 404 })');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗ HTTP 404/);
});

test("official link checker keeps HTTP failures even if the retry has a network error", () => {
  const result = runChecker(`async (url) => {
    const count = (globalThis.attempts ??= new Map()).get(url) ?? 0;
    globalThis.attempts.set(url, count + 1);
    if (count) throw new Error("network unavailable");
    return new Response(null, { status: 404 });
  }`);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗ HTTP 404/);
});

test("official link checker distinguishes network restrictions from HTTP failures", () => {
  const result = runChecker('async () => { throw new Error("network unavailable"); }');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /временная сетевая блокировка/);
});

test("official link checker accepts working official destinations", () => {
  const result = runChecker('async () => new Response(null, { status: 200 })');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /✗|⚠/);
});
