import { expect, test, type Page, type Route } from "@playwright/test";

async function prepare(page: Page) {
  await page.addInitScript(() => localStorage.setItem("st-theme", "dark"));
  await page.route("**/api/pricing", (route) => route.abort());
  await page.route("**/api/news?**", (route) => route.abort());
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
  const reviewsRoute = (route: Route) => {
    const method = route.request().method();
    if (method === "POST") return route.fulfill({ json: { accepted: true, pendingModeration: true, stored: true, moderationNotified: true } });
    if (method === "PATCH") return route.fulfill({ json: { updated: true } });
    if (route.request().url().includes("status=pending")) return route.fulfill({ json: { reviews: [{
      id: "review-1", displayName: "Тестовый клиент", rating: 5,
      text: "Подключение работает стабильно на всех моих устройствах.", createdAt: "2026-08-02T04:00:00.000Z", status: "pending",
    }] } });
    return route.fulfill({ json: { reviews: [] } });
  };
  await page.route(/\/api\/reviews(?:\?.*)?$/, reviewsRoute);
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
    json: { version: "1.1.0", channel: "stable" },
  }));
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
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
  await expect(page.locator(".status-metrics")).toBeVisible();
  await expect(page.locator(".regional-card")).toHaveCount(3);
  await settle(page);
  await expect(content).toHaveScreenshot("status-observability.png");
});

test("страница отзывов", async ({ page }) => {
  await prepare(page);
  await page.goto("/reviews", { waitUntil: "networkidle" });
  const board = page.locator(".reviews-layout");
  await expect(board).toBeVisible();
  await expect(page.locator(".review-form-card")).toBeVisible();
  await settle(page);
  await expect(board).toHaveScreenshot("reviews-page.png");
});

test("форма отзыва показывает результат отправки", async ({ page }) => {
  await prepare(page);
  await page.goto("/reviews", { waitUntil: "networkidle" });
  await page.getByLabel("Как вас представить").fill("Тест");
  await page.getByLabel("Ваш отзыв").fill("Тестовый отзыв проверяет успешную отправку формы на модерацию.");
  await page.locator(".review-consent input").check();
  await page.getByRole("button", { name: "Отправить на модерацию" }).click();
  await expect(page.locator(".review-message")).toContainText("Отзыв отправлен на модерацию");
  await expect(page.getByLabel("Как вас представить")).toHaveValue("");
});

test("модератор может опубликовать ожидающий отзыв", async ({ page }) => {
  await prepare(page);
  await page.goto("/reviews/moderation", { waitUntil: "networkidle" });
  await page.getByLabel("Токен модератора").fill("test-admin-token");
  const pendingRequestPromise = page.waitForRequest((request) => request.url().includes("status=pending"));
  await page.getByRole("button", { name: "Открыть модерацию" }).click();
  const pendingRequest = await pendingRequestPromise;
  expect(pendingRequest.headers()["x-st-village-admin-token"]).toBe("test-admin-token");
  expect(pendingRequest.headers().authorization).toBeUndefined();
  await expect(page.getByText("Тестовый клиент")).toBeVisible();
  const moderationRequestPromise = page.waitForRequest((request) => request.method() === "PATCH" && request.url().includes("/api/reviews"));
  await page.getByRole("button", { name: "Опубликовать" }).click();
  const moderationRequest = await moderationRequestPromise;
  expect(moderationRequest.headers()["x-st-village-admin-token"]).toBe("test-admin-token");
  expect(moderationRequest.headers().authorization).toBeUndefined();
  await expect(page.getByRole("status")).toContainText("Отзыв опубликован");
  await expect(page.getByText("Тестовый клиент")).toHaveCount(0);
});

test("администратор может открыть метрики и создать публикацию статуса", async ({ page }) => {
  await prepare(page);
  await page.goto("/status/management", { waitUntil: "networkidle" });
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
