import { expect, test, type Page } from "@playwright/test";

const generatedAt = "2026-10-03T12:00:00.000Z";
const server = (id: string, countryCode: string, name: string, members = 1) => ({ id, name, countryCode, status: "operational", uptime30: 99.9, latencyMs: 80, members, membersOnline: members });
const summary = { status: "operational", generatedAt, refreshAfterSeconds: 60, totals: { online: 3, total: 3, maintenance: 0, uptime30: 99.9, averageLatencyMs: 80 }, incidents: [], servers: [server("al", "AL", "Албания"), server("de", "DE", "Германия"), server("auto", "CH", "Авто выбор", 6)] };
const post = (id: string, html = `<h3>Новость ${id}</h3><p>Новые возможности ST VILLAGE. Подробности в полной публикации.</p>`) => ({ id, html, url: `https://t.me/exitcloud_vpn/${id}`, images: [], attachments: [], poll: null, publishedAt: generatedAt, views: "10", buttons: [], unsupported: false, source: "bot" });

async function prepare(page: Page) {
  await page.clock.install({ time: new Date(generatedAt) });
  await page.addInitScript(() => localStorage.setItem("st-theme", "dark"));
  await page.route("**/api/live-status", (route) => route.fulfill({ json: summary }));
  await page.route("**/api/news?**", (route) => route.fulfill({ json: { posts: [post("3"), post("2"), post("1")], hasMore: false, nextBefore: null } }));
  await page.route("**/api/pricing", (route) => route.fulfill({ json: { status: "ok", stale: false, updatedAt: generatedAt, tariffs: [
    { id: 1, name: "Личный", description: "Для повседневного подключения", trafficLimitGb: 100, deviceLimit: 3, periods: [{ days: 30, label: "1 месяц", priceKopeks: 15000, originalPriceKopeks: null, discountPercent: null }, { days: 90, label: "3 месяца", priceKopeks: 40000, originalPriceKopeks: null, discountPercent: null }] },
    { id: 2, name: "Семейный", description: "Для ваших устройств", trafficLimitGb: 1000, deviceLimit: 9, periods: [{ days: 30, label: "1 месяц", priceKopeks: 30000, originalPriceKopeks: null, discountPercent: null }] },
    { id: 3, name: "Безлимитный", description: "Без ограничений трафика", trafficLimitGb: 0, deviceLimit: 5, periods: [{ days: 30, label: "1 месяц", priceKopeks: 45000, originalPriceKopeks: null, discountPercent: null }] },
  ] } }));
  await page.route("**/api/version", (route) => route.fulfill({ json: { version: "1.2.0", updateAvailable: false } }));
}

test("главная: реальные страны, две новости и выбор периода", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  await expect(page.locator(".network-country")).toHaveCount(2);
  await expect(page.locator(".network-country")).toContainText(["Албания", "Германия"]);
  await expect(page.locator(".network-country .flag-al")).toBeVisible();
  await expect(page.locator(".news-teaser")).toHaveCount(2);
  await expect(page.locator(".news-teaser").first()).toContainText("Новость 3");
  await expect(page.locator(".news-teaser").first().getByRole("link", { name: "Читать новость" })).toHaveAttribute("href", "/news#post-3");
  await page.locator(".tariff-card").first().getByRole("button", { name: "3 месяца" }).click();
  await expect(page.locator(".tariff-price").first()).toContainText("400");
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}" });
  await expect(page.locator("#features")).toHaveScreenshot("orbital-cabinet.png");
  await expect(page.locator("#getting-started")).toHaveScreenshot("orbital-steps.png");
  await expect(page.locator("#locations")).toHaveScreenshot("orbital-network.png");
  await expect(page.locator("#news")).toHaveScreenshot("orbital-news.png");
  await page.route("**/api/news?**", (route) => route.fulfill({ json: { posts: [post("4"), post("3", "<h3>Исправленная новость</h3>" )], hasMore: false, nextBefore: null } }));
  await page.clock.fastForward(180_000);
  await expect(page.locator(".news-teaser")).toHaveCount(2);
  await expect(page.locator(".news-teaser").first()).toContainText("Новость 4");
  await expect(page.locator(".news-teaser").last()).toContainText("Исправленная новость");
});

test("главная: сбой обновления снимает зелёный статус", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  await expect(page.locator(".network-overall")).toContainText("Сеть работает");
  await page.route("**/api/live-status", (route) => route.fulfill({ status: 503, json: {} }));
  await page.clock.fastForward(60_000);
  await expect(page.locator(".network-overall")).toContainText("Данные устарели");
  await expect(page.locator(".network-overall-operational")).toHaveCount(0);
});

test("анонс открывает выбранную новость после асинхронной загрузки", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  await expect(page.locator(".news-teaser")).toHaveCount(2);
  await page.route("**/api/news?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ json: { posts: [post("3"), post("2"), post("1")], hasMore: false, nextBefore: null } });
  });
  await page.locator(".news-teaser").last().getByRole("link", { name: "Читать новость" }).click();
  await expect(page).toHaveURL(/\/news#post-2$/);
  const article = page.locator("#post-2");
  await expect(article).toBeVisible();
  await expect(article).toBeFocused();
  const box = await article.boundingBox();
  expect(box?.y).toBeGreaterThanOrEqual(74);
  expect(box?.y).toBeLessThan(140);
});

test("320px, светлая тема и reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepare(page);
  await page.goto("/");
  await expect(page.locator(".network-country")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const selector of [".hero h1", ".hero-trial", ".network-console", ".news-teaser", ".tariff-card", ".site-header"]) {
    for (const element of await page.locator(selector).all()) {
      const box = await element.boundingBox();
      expect(box?.x, selector).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0), selector).toBeLessThanOrEqual(320);
    }
  }
  await expect(page.getByRole("link", { name: "Попробовать 1 день" })).toHaveAttribute("href", "https://cabinet.stvillage.top");
  await page.getByRole("button", { name: "Переключить цветовую тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".hero")).toHaveScreenshot("orbital-light-320.png");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();
});
