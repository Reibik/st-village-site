import { expect, test, type Page } from "@playwright/test";

async function prepare(page: Page) {
  await page.clock.setFixedTime(new Date("2026-08-02T04:00:00.000Z"));
  await page.addInitScript(() => {
    if (!localStorage.getItem("st-theme")) localStorage.setItem("st-theme", "dark");
  });
  await page.route("**/api/pricing", (route) => route.abort());
  await page.route("**/api/news?**", (route) => route.abort());
  await page.route("**/api/live-status", (route) => route.fulfill({ json: {
    status: "degraded", generatedAt: "2026-08-02T04:00:00.000Z", refreshAfterSeconds: 60,
    totals: { online: 4, total: 5, maintenance: 0, uptime30: 99.82, averageLatencyMs: 112 },
    incidents: [{
      id: "incident-1", title: "Технические работы на сервере", severity: "minor", status: "monitoring",
      startedAt: "2026-08-02T03:00:00.000Z", latestUpdate: "Следим за восстановлением доступности.",
      affected: [{ name: "Польша #1", countryCode: "PL" }],
    }],
    servers: [
      { id: "pl-1", name: "Польша #1", countryCode: "PL", status: "outage", uptime30: 98.7, latencyMs: null, members: 1, membersOnline: 0 },
      { id: "auto", name: "Авто выбор", countryCode: "CH", status: "operational", uptime30: 99.9, latencyMs: 96, members: 4, membersOnline: 4 },
      { id: "de-1", name: "Германия #1", countryCode: "DE", status: "operational", uptime30: 99.98, latencyMs: 84, members: 1, membersOnline: 1 },
      { id: "fi-1", name: "Финляндия #1", countryCode: "FI", status: "operational", uptime30: 100, latencyMs: 138, members: 1, membersOnline: 1 },
      { id: "se-1", name: "Швеция #1", countryCode: "SE", status: "operational", uptime30: 99.95, latencyMs: 130, members: 1, membersOnline: 1 },
    ],
  } }));
  await page.route("**/api/status", (route) => route.fulfill({ json: {
    status: "operational", generatedAt: "2026-08-02T04:00:00.000Z", refreshAfterSeconds: 30,
    services: [
      { id: "website", name: "Публичный сайт", description: "Основной сайт и страница статуса", status: "operational", latencyMs: null, checkedAt: "2026-08-02T04:00:00.000Z", message: "Страница статуса отвечает" },
      { id: "cabinet", name: "Личный кабинет", description: "Вход и управление подпиской", status: "operational", latencyMs: 82, checkedAt: "2026-08-02T04:00:00.000Z", message: "Сервис отвечает" },
    ],
    locations: [
      { id: "de", code: "DE", name: "Германия", region: "Центральная Европа", status: "operational", checkedAt: "2026-08-02T04:00:00.000Z", message: "Состояние получено из Remnawave" },
      { id: "pl", code: "PL", name: "Польша", region: "Центральная Европа", status: "operational", checkedAt: "2026-08-02T04:00:00.000Z", message: "Состояние получено из Remnawave" },
      { id: "se", code: "SE", name: "Швеция", region: "Северная Европа", status: "operational", checkedAt: "2026-08-02T04:00:00.000Z", message: "Состояние получено из Remnawave" },
    ],
  } }));
  await page.route("**/api/observability?**", (route) => route.fulfill({ json: {
    range: "24h", generatedAt: "2026-08-02T04:00:00.000Z", incidents: [],
    history: { persistent: true, points: [
      { checkedAt: "2026-08-01T04:00:00.000Z", status: "operational", serviceAvailability: 100, locationAvailability: 100 },
      { checkedAt: "2026-08-01T12:00:00.000Z", status: "operational", serviceAvailability: 100, locationAvailability: 100 },
      { checkedAt: "2026-08-02T04:00:00.000Z", status: "operational", serviceAvailability: 100, locationAvailability: 100 },
    ] },
    regions: [
      { id: "eu", label: "Европа", country: "DE", city: "Falkenstein", status: "operational", latencyMs: 276, checkedAt: "2026-08-02T04:00:00.000Z" },
      { id: "na", label: "Северная Америка", country: "US", city: "Buffalo", status: "operational", latencyMs: 681, checkedAt: "2026-08-02T04:00:00.000Z" },
      { id: "asia", label: "Азия", country: "JP", city: "Tokyo", status: "operational", latencyMs: 1398, checkedAt: "2026-08-02T04:00:00.000Z" },
    ],
  } }));
  await page.route("**/api/analytics?**", (route) => route.fulfill({ json: {
    days: 30,
    outbound: { cabinet: 42, telegram: 17 },
    vitals: [{ name: "LCP", average: 1220, samples: 31 }],
  } }));
  await page.route("**/api/incidents", (route) => {
    if (route.request().method() === "POST") return route.fulfill({ json: { incident: {
      id: "incident-new", title: "Плановые работы", summary: "Короткая проверка панели управления.",
      severity: "info", status: "scheduled", planned: true, affectedServices: ["Сайт"],
      startsAt: "2026-08-02T04:00:00.000Z", resolvedAt: null,
    } } });
    return route.fulfill({ json: { incidents: [] } });
  });
  await page.route("**/api/version", (route) => route.fulfill({
    json: { version: "1.3.0", channel: "stable", updateAvailable: false },
  }));
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}",
  });
}

test("главная страница", async ({ page }) => {
  await prepare(page);
  await page.goto("/", { waitUntil: "networkidle" });

  const hero = page.locator(".hero");
  const quickAccess = page.locator(".cta-panel");
  await expect(hero).toBeVisible();
  await expect(quickAccess).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `test-results/orbital-${test.info().project.name}-preview.png` });
  await expect(hero).toHaveScreenshot("home-hero.png");
  await expect(quickAccess).toHaveScreenshot("home-quick-access.png");
});

test("страница тарифов", async ({ page }) => {
  await prepare(page);
  await page.goto("/pricing", { waitUntil: "networkidle" });

  const pricingPage = page.locator(".pricing-page-content");
  await expect(pricingPage).toBeVisible();
  await expect(page.locator(".tariff-card")).toHaveCount(5);
  await settle(page);

  await expect(pricingPage).toHaveScreenshot("pricing-page.png");
});

test("прозрачный статус", async ({ page }) => {
  await prepare(page);
  await page.goto("/status", { waitUntil: "networkidle" });
  const content = page.locator(".page-content");
  await expect(page.locator(".live-status-metrics")).toBeVisible();
  await expect(page.locator(".live-server-card")).toHaveCount(5);
  await expect(page.getByRole("link", { name: "Открыть полный мониторинг ↗" })).toHaveAttribute("href", "https://status.stvillage.ru");
  await expect(page.getByRole("heading", { name: "Дополнительные проверки" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Серверные узлы" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Стабильность во времени" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Доступность снаружи" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Инциденты и технические работы" })).toHaveCount(0);
  await settle(page);
  await expect(content).toHaveScreenshot("status-observability.png");
});

test("администратор может открыть метрики и создать публикацию статуса", async ({ page }) => {
  await prepare(page);
  await page.goto("/status/management", { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toHaveCount(1);
  expect(await page.locator(".status-admin-page").evaluate((element) => getComputedStyle(element).maxWidth)).toBe("980px");
  await page.getByLabel("STATUS_ADMIN_TOKEN").fill("test-status-token");
  const metricsRequestPromise = page.waitForRequest((request) => request.url().includes("/api/analytics?days=30"));
  await page.getByRole("button", { name: "Открыть управление" }).click();
  const metricsRequest = await metricsRequestPromise;
  expect(metricsRequest.headers()["x-st-village-status-token"]).toBe("test-status-token");
  await expect(page.getByText("42")).toBeVisible();
  await page.getByLabel("Заголовок").fill("Плановые работы");
  await page.getByLabel("Описание").fill("Короткая проверка панели управления.");
  const incidentRequestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/api/incidents"));
  await page.getByRole("button", { name: "Сохранить публикацию" }).click();
  const incidentRequest = await incidentRequestPromise;
  expect(incidentRequest.headers()["x-st-village-status-token"]).toBe("test-status-token");
  await expect(page.getByRole("status")).toContainText("Публикация сохранена");
});

test("навигация без отзывов, мобильное меню и переключение темы", async ({ page }) => {
  await prepare(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('a[href^="/reviews"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Переключить цветовую тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const menu = page.getByRole("button", { name: "Открыть меню" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeVisible();
    await expect(page.locator('#mobile-nav a[href^="/reviews"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await page.locator("#mobile-nav").getByRole("link", { name: "Подключение", exact: true }).click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  } else {
    await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Подключение", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Happ и INCY");
  await expect(page.locator('a[href^="/reviews"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("старые страницы отзывов закрыты, а ссылка возвращает на главную", async ({ page }) => {
  await prepare(page);
  for (const path of ["/reviews", "/reviews/moderation"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(410);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { name: "Раздел больше недоступен" })).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
  }
  await page.getByRole("link", { name: "На главную" }).click();
  await expect(page.locator(".hero")).toBeVisible();
});
