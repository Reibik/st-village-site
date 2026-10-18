import type { Page } from "@playwright/test";

export async function prepareHoliday(page: Page, date = "2026-10-25T12:00:00Z") {
  await page.clock.install({ time: new Date(date) });
  await page.route("https://code.jivo.ru/**", (route) => route.abort());
  await page.route("**/api/news?**", (route) => route.fulfill({ json: { posts: [], hasMore: false, nextBefore: null } }));
  await page.route("**/api/live-status", (route) => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/pricing", (route) => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/version**", (route) => route.fulfill({ json: { version: "1.3.0", updateAvailable: false } }));
}
