import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const limits = [
  ["public/brand-emblem.avif", 150_000],
  ["public/brand-emblem.webp", 180_000],
  ["public/cabinet-dashboard-preview.webp", 60_000],
  ["public/og-social-v2.png", 1_000_000],
];

for (const [path, limit] of limits) {
  const file = await stat(new URL(`../${path}`, import.meta.url));
  assert.ok(file.size <= limit, `${path}: ${file.size} bytes exceeds ${limit}`);
  console.log(`✓ ${path}: ${Math.round(file.size / 1024)} KB`);
}

const [home, observability] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/site-observability.tsx", import.meta.url), "utf8"),
]);
assert.match(home, /brand-emblem\.avif/);
assert.match(home, /brand-emblem\.webp/);
assert.match(home, /fetchPriority="high"/);
assert.match(home, /sizes="\(max-width:/);
for (const metric of ["CLS", "FCP", "INP", "LCP", "TTFB"]) assert.match(observability, new RegExp(`"${metric}"`));
console.log("Пороговые значения изображений и сбор Core Web Vitals настроены.");

