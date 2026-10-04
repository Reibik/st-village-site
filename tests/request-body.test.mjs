import assert from "node:assert/strict";
import test from "node:test";
import { PayloadTooLargeError, readJsonLimited, readTextLimited } from "../src/server/security/rate-limit.ts";

test("body reader cancels an oversized stream without reading the remaining chunks", async () => {
  let pulled = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulled += 1;
      controller.enqueue(new Uint8Array(5));
      if (pulled === 100) controller.close();
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const result = await readTextLimited(new Request("http://localhost/", {
    method: "POST", body, duplex: "half",
  }), 8);
  assert.equal(result.status, 413);
  assert.equal(pulled, 2);
  assert.equal(cancelled, true);
});

test("body reader preserves UTF-8 split between chunks and accepts the exact byte limit", async () => {
  const bytes = new TextEncoder().encode('Привет 🚀');
  const body = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  } });
  const result = await readTextLimited(new Request("http://localhost/", {
    method: "POST", body, duplex: "half",
  }), 17);
  assert.equal(result, 'Привет 🚀');
});

test("body reader rejects an oversized declared length before reading", async () => {
  let pulled = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull() { pulled += 1; },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const result = await readTextLimited(new Request("http://localhost/", {
    method: "POST", body, duplex: "half", headers: { "content-length": "9" },
  }), 8);
  assert.equal(result.status, 413);
  assert.equal(pulled, 0);
  assert.equal(cancelled, true);
});

test("JSON body limit cancels reading as soon as the byte budget is exceeded", async () => {
  let pulled = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulled += 1;
      controller.enqueue(new Uint8Array(5));
      if (pulled === 100) controller.close();
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  await assert.rejects(readJsonLimited(new Request("http://localhost/", {
    method: "POST", body, duplex: "half",
  }), 8), /payload too large/);
  assert.equal(pulled, 2);
  assert.equal(cancelled, true);
});

test("JSON reader distinguishes malformed input from oversized input and counts UTF-8 bytes", async () => {
  const body = JSON.stringify({ name: "🚀" });
  const length = new TextEncoder().encode(body).length;
  assert.deepEqual(await readJsonLimited(new Request("http://localhost/", { method: "POST", body }), length), { name: "🚀" });
  await assert.rejects(readJsonLimited(new Request("http://localhost/", { method: "POST", body }), length - 1), PayloadTooLargeError);
  await assert.rejects(readJsonLimited(new Request("http://localhost/", { method: "POST", body: "{" })), SyntaxError);
});
