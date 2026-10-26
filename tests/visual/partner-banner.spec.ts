import { expect, test, type Page, type Route } from "@playwright/test";

async function prepare(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-18T12:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("st-theme", "dark"));
  await page.route("https://code.jivo.ru/**", (route) => route.abort());
  await page.route("**/api/news?**", (route) => route.fulfill({ json: { posts: [], hasMore: false, nextBefore: null } }));
  await page.route("**/api/live-status", (route) => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/pricing", (route) => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/version**", (route) => route.fulfill({ json: { version: "1.4.0", updateAvailable: false } }));
}

test("партнёрский баннер активен и сохраняет атрибуцию без фоновых запросов к партнёру", async ({ page }) => {
  await prepare(page);
  const partnerRequests: string[] = [];
  page.on("request", (request) => {
    if (/platipomiru\.com/.test(request.url())) partnerRequests.push(request.url());
  });
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Плати по Миру" });
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("heading", { name: "Зарубежные подписки и покупки — больше возможностей." })).toBeVisible();
  const applicationLink = banner.getByRole("link", { name: /Получить карту/ });
  await expect(applicationLink).toHaveAttribute("href", "https://platipomiru.com/?utm_source=stvillage&utm_medium=cpa");
  await expect(applicationLink).toHaveAttribute("target", "_blank");
  for (const token of ["sponsored", "noopener", "noreferrer"]) await expect(applicationLink).toHaveAttribute("rel", new RegExp(`\\b${token}\\b`));
  await expect(banner).not.toContainText("Скоро");
  await expect(banner).toContainText("Партнёрский сервис");
  expect(await banner.evaluate((element) => {
    const hero = document.querySelector(".hero")!;
    const features = document.querySelector("#features")!;
    const onboarding = document.querySelector("#getting-started")!;
    return Boolean(hero.compareDocumentPosition(features) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(features.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(element.compareDocumentPosition(onboarding) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  expect(partnerRequests).toEqual([]);
  await expect(page.locator(".hero-actions .button-primary")).toHaveAttribute("href", "https://cabinet.stvillage.top");
});

test("описание раскрывается и закрывается клавиатурой без перехода на другой сайт", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Плати по Миру" });
  const summary = banner.locator("summary");
  const explanation = banner.getByText("Выберите карту и ознакомьтесь с условиями сервиса.", { exact: true });
  await expect(explanation).toBeHidden();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(explanation).toBeVisible();
  await expect(banner.getByText("Оформление и обслуживание — на стороне провайдера.", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(explanation).toBeHidden();
  await expect(page).toHaveURL("/");
});

test("открытое до загрузки JavaScript описание сохраняется без ошибки согласования страницы", async ({ page }) => {
  await prepare(page);
  const pendingScripts: Route[] = [];
  let holdScripts = true;
  await page.route("**/*", async (route) => {
    if (holdScripts && route.request().resourceType() === "script") pendingScripts.push(route);
    else await route.fallback();
  });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/", { waitUntil: "commit" });
  const banner = page.getByRole("region", { name: "Плати по Миру" });
  await banner.locator("summary").click();
  const explanation = banner.getByText("Выберите карту и ознакомьтесь с условиями сервиса.", { exact: true });
  await expect(explanation).toBeVisible();
  const clientMounted = page.waitForResponse((response) => response.url().includes("/api/pricing"));
  holdScripts = false;
  await Promise.all(pendingScripts.map((route) => route.fallback()));
  await page.waitForLoadState("load");
  // Pricing fetches in a real client effect, after the page has been hydrated.
  await clientMounted;
  await expect(explanation).toBeVisible();
  expect(errors.filter((message) => /hydration|hydrated|didn't match/i.test(message))).toEqual([]);
});

test("описание и партнёрская ссылка доступны даже с отключённым JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    const banner = page.getByRole("region", { name: "Плати по Миру" });
    await expect(banner.getByRole("link", { name: /Получить карту/ })).toHaveAttribute("href", "https://platipomiru.com/?utm_source=stvillage&utm_medium=cpa");
    await banner.locator("summary").click();
    await expect(banner.getByText("Выберите карту и ознакомьтесь с условиями сервиса.", { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("баннер читаем в обеих темах и не выходит за узкий экран", async ({ page }) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Плати по Миру" });
  await expect(banner).toBeVisible();
  for (const theme of ["dark", "light"]) {
    await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
    await expect(banner).toHaveScreenshot(`partner-banner-${theme}.png`);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const summary = banner.locator("summary");
  await summary.click();
  await expect(banner.getByText("Выберите карту и ознакомьтесь с условиями сервиса.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const control of [banner, banner.getByRole("heading"), banner.getByRole("link", { name: /Получить карту/ }), summary, banner.locator(".partner-banner-explanation")]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
});

test("режимы уменьшенной прозрачности и высокой контрастности сохраняют читаемый баннер", async ({ page }) => {
  await prepare(page);
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-reduced-transparency", value: "reduce" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ] });
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Плати по Миру" });
  await expect(banner).toBeVisible();
  expect(await banner.locator(".partner-banner-panel").evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(banner.getByRole("heading")).toBeVisible();
  await expect(banner.getByRole("link", { name: /Получить карту/ })).toHaveAttribute("href", "https://platipomiru.com/?utm_source=stvillage&utm_medium=cpa");
  await banner.locator("summary").click();
  await expect(banner.getByText("Выберите карту и ознакомьтесь с условиями сервиса.", { exact: true })).toBeVisible();
});

test("переход открывает точную партнёрскую ссылку в новой вкладке без доступа к исходной", async ({ page, context }) => {
  await prepare(page);
  // Intercept the destination to test navigation without recording a real partner visit.
  await context.route("https://platipomiru.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Partner destination</title>" }));
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("region", { name: "Плати по Миру" }).getByRole("link", { name: /Получить карту/ }).click();
  const popup = await opened;
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toBe("https://platipomiru.com/?utm_source=stvillage&utm_medium=cpa");
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await expect(page).toHaveURL("/");
  await popup.close();
});
